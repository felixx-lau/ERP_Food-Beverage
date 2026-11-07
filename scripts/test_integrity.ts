import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { executeSeed } from '../src/lib/seedData';
import { atomic,idempotent } from '../src/lib/atomic';
import { createSalesQuotation,confirmSalesOrder } from '../src/lib/salesEngine';
import { documentAction } from '../src/lib/documentWorkflow';
import { validateDeliveryOrder } from '../src/lib/deliveryEngine';
import { createPurchaseQuotation,confirmPurchaseOrder,validateGoodsReceipt,createVendorBill,postVendorBill } from '../src/lib/purchaseEngine';
import { createCustomerInvoice,postCustomerInvoice,registerCustomerPayment,registerVendorPayment } from '../src/lib/accountingEngine';
import { openPosSession,createPosOrder,closePosSession } from '../src/lib/posEngine';
import { refundPosOrder } from '../src/lib/posRefund';
import { reverseFinancial,createManualJournal } from '../src/lib/financialCorrections';
import { addDocumentNote,documentTrail } from '../src/lib/documentTrail';
import { createCompany,getDatabasePathForCompany } from '../src/lib/companyManager';
import { saveTeamMember } from '../src/lib/team';
import { hasAllowedOrigin } from '../src/lib/requestOrigin';
import { createSessionToken,getCurrentUser } from '../src/lib/auth';
let a:any={};
async function reset(){await executeSeed(prisma);a={};for(const u of await prisma.user.findMany())a[u.role]=u;}
const balance=async(code:string)=>(await prisma.account.findUniqueOrThrow({where:{code}})).currentBalance;
const s=()=>prisma.stockLevel.findUniqueOrThrow({where:{productSku_locationCode:{productSku:'RICE-CHICK-S',locationCode:'WH-JKT'}}});
async function sale(qty=5,contactId='C01'){return createSalesQuotation({contactId,lines:[{productSku:'RICE-CHICK-S',quantity:qty,unitPrice:48000}],actor:a.SALES});}
async function invoice(){const so=await sale(),c:any=await confirmSalesOrder(so.id,a.SALES);await validateDeliveryOrder({deliveryOrderId:c.deliveryOrder.id,items:[{lineId:c.deliveryOrder.lines[0].id,productSku:'RICE-CHICK-S',deliveredQty:5}],actor:a.WAREHOUSE});const i=await createCustomerInvoice({salesOrderId:so.id,lines:[{productSku:'RICE-CHICK-S',quantity:5}],actor:a.FINANCE});await postCustomerInvoice(i.id,a.FINANCE);return i;}
async function bill(price=15000){const po=await createPurchaseQuotation({vendorId:'V03',lines:[{productSku:'COF-LATT-HOT',orderedQty:8,unitPrice:price}],actor:a.PROCUREMENT}),c=await confirmPurchaseOrder(po.id,a.PROCUREMENT);await validateGoodsReceipt({receiptId:c.receipt!.id,items:[{lineId:c.receipt!.lines[0].id,productSku:'COF-LATT-HOT',acceptedQty:8,rejectedQty:0}],actor:a.WAREHOUSE});const b=await createVendorBill({purchaseOrderId:po.id,lines:[{productSku:'COF-LATT-HOT',quantity:8}],actor:a.FINANCE});await postVendorBill(b.id,a.FINANCE);return b;}
async function check(name:string,fn:()=>Promise<void>){await reset();await fn();console.log('[PASS]',name);}
async function main(){
 const cwd=realpathSync(process.cwd());assert(cwd.startsWith(realpathSync(os.tmpdir())+path.sep));assert(realpathSync((process.env.DATABASE_URL||'').replace(/^file:/,'')).startsWith(cwd+path.sep));
 await check('Origin validation accepts actual loopback Host and rejects cross-site writes',async()=>{
  assert(hasAllowedOrigin(new NextRequest('http://127.0.0.1:3107/api/master/units',{method:'POST',headers:{host:'127.0.0.1:3107',origin:'http://127.0.0.1:3107'}})));
  assert(!hasAllowedOrigin(new NextRequest('http://localhost:3107/api/master/units',{method:'POST',headers:{host:'localhost:3107',origin:'https://attacker.example'}})));
 });
 await check('Draft edits, stale versions and cancellation release exact reservations',async()=>{
  const order=await sale();await documentAction('sales',order.id,{action:'edit',version:0,lines:[{productSku:'RICE-CHICK-S',quantity:7,unitPrice:48000,discountPercent:0}]},a.SALES);
  await assert.rejects(documentAction('sales',order.id,{action:'cancel',version:0},a.SALES));
  await documentAction('sales',order.id,{action:'confirm',version:1},a.SALES);assert.equal((await s()).reserved,13);
  await documentAction('sales',order.id,{action:'cancel',version:2},a.SALES);assert.equal((await s()).reserved,6);assert.equal((await s()).onHand,40);
  assert.equal(await prisma.deliveryOrder.count({where:{salesOrderId:order.id,status:'CANCELLED'}}),1);
 });
 await check('Vendor payments, price variance and controlled bill reversal reconcile',async()=>{
  const b=await bill();assert.equal(await balance('1040'),0);assert.equal(await balance('5020'),24000);assert.equal(await balance('2010'),1120000);
  const p=await registerVendorPayment({billId:b.id,amount:40000,paymentMethod:'BANK',actor:a.FINANCE});assert.equal(p.remainingBalance,80000);
  await assert.rejects(registerVendorPayment({billId:b.id,amount:90000,paymentMethod:'BANK',actor:a.FINANCE}));
  await assert.rejects(reverseFinancial('bills',b.id,'Correct source document',a.FINANCE));
  await reverseFinancial('payments',p.payment.id,'Payment entered against wrong bill',a.FINANCE);await reverseFinancial('payments',p.payment.id,'Retry reversal',a.FINANCE);
  assert.equal(await balance('1010'),20000000);assert.equal((await prisma.vendorBill.findUniqueOrThrow({where:{id:b.id}})).outstandingAmount,120000);
  await reverseFinancial('bills',b.id,'Wrong purchase bill reference',a.FINANCE);assert.equal(await balance('2010'),1000000);assert.equal(await balance('1040'),96000);assert.equal(await balance('5020'),0);
  assert.equal((await prisma.purchaseOrderLine.findFirstOrThrow({where:{purchaseOrderId:b.purchaseOrderId}})).billedQty,0);
 });
 await check('Customer payment reversal retains original source and releases invoice quantities',async()=>{
  const i=await invoice(),p=await registerCustomerPayment({invoiceId:i.id,amount:264000,paymentMethod:'BANK',actor:a.FINANCE});
  assert.equal((await prisma.customerInvoice.findUniqueOrThrow({where:{id:i.id}})).status,'PAID');
  await reverseFinancial('payments',p.payment.id,'Incorrect payment allocation',a.FINANCE);await reverseFinancial('invoices',i.id,'Invoice correction requested',a.FINANCE);
  const before=await prisma.journalEntry.count();await reverseFinancial('invoices',i.id,'Retry correction',a.FINANCE);assert.equal(await prisma.journalEntry.count(),before);
  assert.equal(await balance('1010'),20000000);assert.equal(await balance('1020'),1500000);assert.equal((await prisma.salesOrderLine.findFirstOrThrow({where:{salesOrderId:i.salesOrderId}})).invoicedQty,0);
 });
 await check('Full POS refund restores stock and journal exactly once; closed-session summary stays fixed',async()=>{
  const session=await openPosSession({cashierId:a.CASHIER.id,actor:a.CASHIER});const order=await createPosOrder({sessionId:session.id,paymentMethod:'CASH',lines:[{productSku:'COF-LATT-HOT',quantity:2}],actor:a.CASHIER});
  const closed=await closePosSession(session.id,66000,a.CASHIER);
  await assert.rejects(refundPosOrder(order.order.id,'Refund closed session',a.CASHIER));await refundPosOrder(order.order.id,'Customer cancelled the full order',a.OWNER);
  const before=await prisma.journalEntry.count();await refundPosOrder(order.order.id,'Retry refund',a.OWNER);assert.equal(await prisma.journalEntry.count(),before);
  assert.equal(await balance('1010'),20000000);assert.equal(await balance('1030'),12214000);assert.equal((await closePosSession(session.id,0,a.CASHIER)).difference,closed.difference);
  assert.equal((await prisma.stockLevel.findUniqueOrThrow({where:{productSku_locationCode:{productSku:'COF-LATT-HOT',locationCode:'CAFE-JKT'}}})).onHand,24);
 });
 await check('Atomic rollback and idempotency payload binding',async()=>{
  const original=await balance('1010');await assert.rejects(atomic(async()=>{await prisma.account.update({where:{code:'1010'},data:{currentBalance:1}});throw new Error('force rollback');}));assert.equal(await balance('1010'),original);
  const first=await idempotent(a.SALES,'create-test','unique-request',{qty:5},()=>sale());const next=await idempotent(a.SALES,'create-test','unique-request',{qty:5},()=>sale());assert.equal(first.id,next.id);
  await assert.rejects(idempotent(a.SALES,'create-test','unique-request',{qty:6},()=>sale(6)));assert.equal(await prisma.salesOrder.count(),2);
 });
 await check('Competing confirmations and payments cannot oversell or overpay',async()=>{
  const one=await sale(20,'C03'),two=await sale(20,'C03');const results=await Promise.allSettled([confirmSalesOrder(one.id,a.SALES),confirmSalesOrder(two.id,a.SALES)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await s()).reserved,26);const blocked=results[0].status==='rejected'?one:two;await assert.rejects(confirmSalesOrder(blocked.id,a.SALES),/SR-04|Available|available|Stok/);assert.equal(await prisma.stockReservation.aggregate({_sum:{quantity:true}}).then(r=>r._sum.quantity),26);
  await reset();const i=await invoice();const payments=await Promise.allSettled([registerCustomerPayment({invoiceId:i.id,amount:200000,paymentMethod:'BANK',actor:a.FINANCE}),registerCustomerPayment({invoiceId:i.id,amount:200000,paymentMethod:'BANK',actor:a.FINANCE})]);assert.equal(payments.filter(r=>r.status==='fulfilled').length,1);assert.equal((await prisma.customerInvoice.findUniqueOrThrow({where:{id:i.id}})).outstandingAmount,64000);assert.equal(await prisma.payment.count(),1);
 });
 await check('Source trails and manual journal corrections retain history',async()=>{
  const order=await sale();await addDocumentNote('sales',order.id,'Customer confirms revised schedule',a.SALES);await confirmSalesOrder(order.id,a.SALES);const trail=await documentTrail('sales',order.id,a.SALES);assert(trail.activity.some(l=>l.action==='LOG_NOTE'));assert(trail.links.some(l=>l.href.startsWith('/inventory/delivery?id=')));
  await assert.rejects(createManualJournal({reason:'No arbitrary inventory balances',lines:[{accountCode:'1030',debit:500,credit:0},{accountCode:'1010',debit:0,credit:500}]},a.FINANCE));
  const journal=await createManualJournal({reason:'Record verified operating expense',lines:[{accountCode:'8010',debit:500,credit:0},{accountCode:'1010',debit:0,credit:500}]},a.FINANCE);await reverseFinancial('journals',journal.id,'Correct expense amount',a.FINANCE);assert.equal(await balance('1010'),20000000);
 });
 await check('Team changes invalidate old sessions and protect last active owner',async()=>{
  const token=await createSessionToken(a.SALES),req=new NextRequest('http://localhost/api/auth/me',{headers:{authorization:'Bearer '+token}});assert(await getCurrentUser(req));
  await saveTeamMember(a.SALES.id,{sessionVersion:0,active:false},a.OWNER);assert.equal(await getCurrentUser(req),null);
  await assert.rejects(saveTeamMember(a.OWNER.id,{sessionVersion:0,active:false},a.OWNER));await assert.rejects(saveTeamMember(null,{name:'Weak',email:'weak@example.test',role:'SALES',password:'123'},a.OWNER));
 });
 await check('New company snapshot preserves default and isolates active owner',async()=>{
  const before=await prisma.productVariant.count(),company=await createCompany({name:'Verification Company',brand:'Verify',cloneMode:'clean',issuer:a.OWNER});
  const client=new PrismaClient({datasourceUrl:'file:'+getDatabasePathForCompany(company)});try{assert.equal(await client.productVariant.count(),0);assert.equal(await client.journalEntry.count(),0);assert.equal(await client.user.count({where:{active:true}}),1);assert.equal((await client.account.findUniqueOrThrow({where:{code:'1010'}})).currentBalance,0);assert.equal(await prisma.productVariant.count(),before);}finally{await client.$disconnect();}
 });
}
main().catch(e=>{console.error('[FAIL]',e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
