import { prisma } from './prisma';
import { atomic } from './atomic';
import { Actor,permit,textValue,BusinessError,money } from './validation';
import { recordAuditLog } from './audit';
import { getNextSequence } from './sequences';

async function postLines(reference:string,lines:{accountCode:string;label:string;debit:number;credit:number;partnerId?:string|null}[],reason:string,reversalOfId?:string) {
  const debit=lines.reduce((n,l)=>n+l.debit,0),credit=lines.reduce((n,l)=>n+l.credit,0);
  money(debit);money(credit);if(!debit||debit!==credit)throw new BusinessError('Jurnal wajib seimbang dan bernilai positif.');
  const entry=await prisma.journalEntry.create({data:{entryNumber:await getNextSequence('JE'),sourceDocument:reference,documentRef:reference,journalType:'GENERAL',notes:reason,reversalOfId,items:{create:lines}},include:{items:true}});
  for(const line of lines){const account=await prisma.account.findUnique({where:{code:line.accountCode}});if(!account)throw new BusinessError('Akun tidak ditemukan.');const delta=['ASSET','EXPENSE','CONTRA_INCOME'].includes(account.type)?line.debit-line.credit:line.credit-line.debit;await prisma.account.update({where:{code:account.code},data:{currentBalance:{increment:delta}}});}
  return entry;
}
async function reverseEntry(entryId:string,reason:string) {
  const original=await prisma.journalEntry.findUnique({where:{id:entryId},include:{items:true}});
  if(!original||original.state!=='POSTED'||original.isOpening)throw new BusinessError('Jurnal pembuka atau jurnal tidak aktif tidak dapat direversal.');
  const previous=await prisma.journalEntry.findUnique({where:{reversalOfId:entryId}});if(previous)return previous;
  return postLines(`REV/${original.entryNumber}`,original.items.map(l=>({accountCode:l.accountCode,label:`Reversal ${original.entryNumber}`,debit:l.credit,credit:l.debit,partnerId:l.partnerId})),reason,entryId);
}
export async function reverseFinancial(kind:string,id:string,reason:string,actor:Actor) {
  permit(actor,['OWNER','FINANCE']);reason=textValue(reason,'Alasan reversal',true,1000);
  return atomic(async()=>{
    let result:any;
    if(kind==='payments'){
      const payment=await prisma.payment.findUnique({where:{id}});if(!payment)throw new BusinessError('Pembayaran tidak ditemukan.',404);
      if(payment.reversedAt)return {payment,alreadyReversed:true};
      const journal=await prisma.journalEntry.findFirst({where:{documentRef:`PAY_${payment.paymentNumber}`}});if(!journal)throw new BusinessError('Jurnal sumber tidak ditemukan.');
      const reversal=await reverseEntry(journal.id,reason);
      if(payment.invoiceId){const invoice=await prisma.customerInvoice.findUnique({where:{id:payment.invoiceId}});if(!invoice||invoice.status==='CANCELLED')throw new BusinessError('Invoice tidak aktif.');const notes=await prisma.creditNote.aggregate({where:{returnRequest:{invoiceId:invoice.id}},_sum:{totalGross:true}});const paidAmount=invoice.paidAmount-payment.amount;await prisma.customerInvoice.update({where:{id:invoice.id},data:{paidAmount,outstandingAmount:Math.max(0,invoice.totalGross-paidAmount-(notes._sum.totalGross||0)),status:'POSTED',version:{increment:1}}});}
      if(payment.billId){const bill=await prisma.vendorBill.findUnique({where:{id:payment.billId}});if(!bill||bill.status==='CANCELLED')throw new BusinessError('Bill tidak aktif.');await prisma.vendorBill.update({where:{id:bill.id},data:{paidAmount:{decrement:payment.amount},outstandingAmount:{increment:payment.amount},status:'POSTED',version:{increment:1}}});}
      result=await prisma.payment.update({where:{id},data:{reversedAt:new Date(),reversalJournalId:reversal.id}});
    } else if(kind==='invoices'||kind==='bills'){
      const model=kind==='invoices'?prisma.customerInvoice:prisma.vendorBill;
      const document:any=await (model as any).findUnique({where:{id},include:{lines:true,payments:true}});if(!document||!document.isPosted)throw new BusinessError('Dokumen belum diposting.');
      if(document.status==='CANCELLED')return {record:document,alreadyReversed:true};
      if(document.payments.some((p:any)=>!p.reversedAt))throw new BusinessError('Reverse pembayaran terlebih dahulu.',409);
      if(kind==='invoices'&&await prisma.returnRequest.count({where:{invoiceId:id}}))throw new BusinessError('Invoice memiliki retur. Gunakan Credit Note dan rekonsiliasi terkait.',409);
      const ref=kind==='invoices'?`INV_${document.invoiceNumber}`:`BILL_${document.billNumber}`;
      const journal=await prisma.journalEntry.findFirst({where:{documentRef:ref}});if(!journal)throw new BusinessError('Jurnal sumber tidak ditemukan.');await reverseEntry(journal.id,reason);
      for(const line of document.lines){if(kind==='invoices'){const source=await prisma.salesOrderLine.findFirst({where:{salesOrderId:document.salesOrderId,productSku:line.productSku}});if(!source||source.invoicedQty<line.quantity)throw new BusinessError('Saldo kuantitas sumber tidak valid.');await prisma.salesOrderLine.update({where:{id:source.id},data:{invoicedQty:{decrement:line.quantity}}});}else{const source=await prisma.purchaseOrderLine.findFirst({where:{purchaseOrderId:document.purchaseOrderId,productSku:line.productSku}});if(!source||source.billedQty<line.quantity)throw new BusinessError('Saldo kuantitas PO tidak valid.');await prisma.purchaseOrderLine.update({where:{id:source.id},data:{billedQty:{decrement:line.quantity}}});}}
      result=await (model as any).update({where:{id},data:{status:'CANCELLED',paidAmount:0,outstandingAmount:0,version:{increment:1}}});
    } else if(kind==='journals'){
      const source=await prisma.journalEntry.findUnique({where:{id}});if(!source?.sourceDocument.startsWith('MANUAL/'))throw new BusinessError('Jurnal otomatis dikoreksi dari dokumen sumber.',409);
      result=await reverseEntry(id,reason);
    } else throw new BusinessError('Jenis reversal tidak valid.');
    await recordAuditLog({actorId:actor.id,actorName:actor.name,actorRole:actor.role as any,action:'REVERSE',documentType:kind.toUpperCase(),documentId:id,afterData:result,notes:reason});return {record:result};
  });
}
export async function createManualJournal(input:{lines:{accountCode:string;debit:number;credit:number}[];reason:string},actor:Actor) {
  permit(actor,['OWNER','FINANCE']);const reason=textValue(input.reason,'Alasan jurnal',true,1000);
  if(!Array.isArray(input.lines)||input.lines.length<2||input.lines.length>100)throw new BusinessError('Isi 2–100 baris jurnal.');
  return atomic(async()=>{
    const lines=[];
    for(const line of input.lines){money(line.debit);money(line.credit);if((line.debit>0)===(line.credit>0))throw new BusinessError('Isi debit atau kredit pada setiap baris.');if(['1020','1030','1040','2010','2020'].includes(line.accountCode))throw new BusinessError('Akun subledger/persediaan/pajak harus melalui transaksi sumber.');const account=await prisma.account.findFirst({where:{code:line.accountCode,archivedAt:null}});if(!account)throw new BusinessError('Akun tidak tersedia.');lines.push({...line,label:reason});}
    const record=await postLines(`MANUAL/${crypto.randomUUID()}`,lines,reason);await recordAuditLog({actorId:actor.id,actorName:actor.name,actorRole:actor.role as any,action:'POST_MANUAL_JOURNAL',documentType:'JOURNAL',documentId:record.id,afterData:record,notes:reason});return record;
  });
}
