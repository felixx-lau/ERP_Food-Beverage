import { prisma } from './prisma';
import { atomic } from './atomic';
type Sequence = 'SO'|'DO'|'PO'|'RECEIPT'|'INV'|'BILL'|'RET'|'RINV'|'LEAD'|'POS'|'JE'|'INT'|'SESSION';
export async function getNextSequence(type:Sequence,tx?:any):Promise<string>{
  const year=new Date().getFullYear();
  const definitions:Record<Sequence,[string,string,string,number,number]>={SO:['salesOrder','orderNumber','S',7,5],DO:['deliveryOrder','deliveryNumber','WH/OUT/',7,4],PO:['purchaseOrder','poNumber','P',7,5],RECEIPT:['goodsReceipt','receiptNumber','WH/IN/',7,4],INV:['customerInvoice','invoiceNumber',`INV/${year}/`,7,4],BILL:['vendorBill','billNumber',`BILL/${year}/`,7,4],RET:['returnRequest','returnNumber',`RET/${year}/`,7,4],RINV:['creditNote','creditNoteNumber',`RINV/${year}/`,7,4],LEAD:['crmLead','id','LD',4,4],POS:['posOrder','orderNumber',`POS/${year}/`,1,4],JE:['journalEntry','entryNumber',`JE/${year}/`,1,4],INT:['internalTransfer','transferNumber','WH/INT/',7,4],SESSION:['posSession','sessionCode','POS',1,2]};
  const run=async(client:any)=>{
    const [model,field,prefix,start,width]=definitions[type];
    const rows=await client[model].findMany({where:{[field]:{startsWith:prefix}},select:{[field]:true}});
    const maximum=rows.reduce((n:number,row:any)=>{const suffix=String(row[field]).slice(prefix.length);return /^\d+$/.test(suffix)?Math.max(n,Number(suffix)):n;},start-1);
    const identity=`${type}:${prefix}`,previous=await client.documentSequence.findUnique({where:{type:identity}});
    const value=Math.max(start,maximum+1,(previous?.value??0)+1);
    if(!Number.isSafeInteger(value)||value>2147483647)throw new Error('Sequence dokumen habis. Hubungi administrator.');
    await client.documentSequence.upsert({where:{type:identity},create:{type:identity,value},update:{value}});
    return prefix+String(value).padStart(width,'0');
  };
  return tx?run(tx):atomic(()=>run(prisma));
}
