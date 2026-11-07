import { writeFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "../../src/lib/prisma";
import { executeSeed } from "../../src/lib/seedData";
import { createSessionToken } from "../../src/lib/auth";
import { createSalesQuotation, confirmSalesOrder } from "../../src/lib/salesEngine";
import { calculateCustomerCreditStatus } from "../../src/lib/creditControl";
import { validateDeliveryOrder } from "../../src/lib/deliveryEngine";
import { createCustomerInvoice, postCustomerInvoice } from "../../src/lib/accountingEngine";
import { createPurchaseQuotation, confirmPurchaseOrder, validateGoodsReceipt, createVendorBill, postVendorBill } from "../../src/lib/purchaseEngine";
import { openPosSession, createPosOrder, closePosSession } from "../../src/lib/posEngine";
import { createReturnRequest, inspectReturnRequest, processReturnAndCreditNote } from "../../src/lib/returnEngine";
import { POST as salesPOST } from "../../src/app/api/sales/orders/route";
import { GET as ledgerGET } from "../../src/app/api/accounting/journal-entries/route";
import { POST as paymentPOST } from "../../src/app/api/accounting/payments/route";
import { POST as posPOST } from "../../src/app/api/pos/orders/route";

const results: any[] = [];
let owner: any, cashier: any, finance: any, warehouse: any;
async function reset() {
  await executeSeed(prisma);
  owner = await prisma.user.findFirst({where:{role:Role.OWNER}});
  cashier = await prisma.user.findFirst({where:{role:Role.CASHIER}});
  finance = await prisma.user.findFirst({where:{role:Role.FINANCE}});
  warehouse = await prisma.user.findFirst({where:{role:Role.WAREHOUSE}});
}
async function probe(id: string, title: string, run: () => Promise<any>) {
  await reset();
  try { const evidence = await run(); const result = {id,title,...evidence}; results.push(result); console.log(JSON.stringify(result)); }
  catch(e) {const result={id,title,status:"PROBE_ERROR",error:String(e)};results.push(result);console.log(JSON.stringify(result));}
}
async function req(path: string, actor: any, body?: any) {
  const token = await createSessionToken(actor);
  return new NextRequest("http://localhost"+path,{method:body ? "POST" : "GET",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},...(body ? {body:JSON.stringify(body)} : {})});
}
async function deliveryFixture(discountPercent = 0, qty = 5) {
  const order = await createSalesQuotation({contactId:"C01",lines:[{productSku:"RICE-CHICK-S",quantity:8,unitPrice:48000,discountPercent}],actor:owner});
  const confirmed: any = await confirmSalesOrder(order.id,owner);
  const delivery = confirmed.deliveryOrder;
  await validateDeliveryOrder({deliveryOrderId:delivery.id,items:[{lineId:delivery.lines[0].id,productSku:"RICE-CHICK-S",deliveredQty:qty}],actor:warehouse});
  return order;
}
async function invoiceFixture(discountPercent = 0) {
  const order = await deliveryFixture(discountPercent);
  const inv = await createCustomerInvoice({salesOrderId:order.id,lines:[{productSku:"RICE-CHICK-S",quantity:5}],actor:finance});
  await postCustomerInvoice(inv.id,finance);return inv;
}
async function purchaseFixture() {
  const po = await createPurchaseQuotation({vendorId:"V03",lines:[{productSku:"COF-LATT-HOT",orderedQty:10,unitPrice:12000}],actor:owner});
  const {receipt}: any = await confirmPurchaseOrder(po.id,owner);
  await validateGoodsReceipt({receiptId:receipt.id,items:[{lineId:receipt.lines[0].id,productSku:"COF-LATT-HOT",acceptedQty:8,rejectedQty:2}],actor:warehouse});return po;
}
async function main() {
  await probe("A01","Cashier can access alternate journal API",async()=>{const response=await ledgerGET(await req('/api/accounting/journal-entries',cashier));const data=await response.json();return {status:response.status===403?"PASS":"FAIL",expected:"403",actual:response.status,journalCount:data.entries?.length};});
  await probe("A02","Cashier can create Sales quotation through API",async()=>{const response=await salesPOST(await req('/api/sales/orders',cashier,{contactId:"C01",lines:[{productSku:"RICE-CHICK-S",quantity:1,unitPrice:48000}]}));const data=await response.json();return {status:response.status===403?"PASS":"FAIL",expected:"403",actual:response.status,order:data.order?.orderNumber};});
  await probe("A03","Unknown POS product creates stock before session validation",async()=>{const before=await prisma.stockLevel.aggregate({_sum:{onHand:true}});const response=await posPOST(await req('/api/pos/orders',cashier,{sessionId:"invalid-session",lines:[{productName:"Audit Unknown Menu",quantity:1,unitPrice:25000}]}));const after=await prisma.stockLevel.aggregate({_sum:{onHand:true}});return {status:after._sum.onHand===before._sum.onHand?"PASS":"FAIL",expected:"Rejected request leaves stock unchanged",actual:{http:response.status,before:before._sum.onHand,after:after._sum.onHand,body:await response.json()}};});
  await probe("A04","POS duplicate SKU lines must not produce negative stock",async()=>{const session=await openPosSession({cashierId:cashier.id,actor:cashier});let blocked=false;try{await createPosOrder({sessionId:session.id,lines:[{productSku:"COF-LATT-HOT",quantity:15},{productSku:"COF-LATT-HOT",quantity:15}],actor:cashier});}catch{blocked=true;}const stock=await prisma.stockLevel.findUnique({where:{productSku_locationCode:{productSku:"COF-LATT-HOT",locationCode:"CAFE-JKT"}}});return {status:blocked && stock!.onHand===24?"PASS":"FAIL",expected:"Reject 30 units when stock is 24",actual:{blocked,onHand:stock?.onHand}};});
  await probe("A05","POS paid event must provide durable stock-movement evidence",async()=>{const session=await openPosSession({cashierId:cashier.id,actor:cashier});const before={moves:await prisma.stockMove.count(),payments:await prisma.payment.count()};await createPosOrder({sessionId:session.id,lines:[{productSku:"COF-LATT-HOT",quantity:2},{productSku:"COOKIE-CHO-1",quantity:1}],actor:cashier});const after={moves:await prisma.stockMove.count(),payments:await prisma.payment.count()};return {status:after.moves>before.moves?"PASS":"FAIL",expected:"Durable movement records for T-27 evidence",actual:{before,after},note:"PosOrder stores paymentMethod and totalAmount and may serve as payment evidence; a separate Payment model is not a PDF requirement. No StockMove is written."};});
  await probe("A06","Vendor bill price must match Purchase Order",async()=>{const po=await purchaseFixture();let blocked=false,bill:any;try{bill=await createVendorBill({purchaseOrderId:po.id,lines:[{productSku:"COF-LATT-HOT",quantity:8,unitPrice:99000}],actor:finance});await postVendorBill(bill.id,finance);}catch{blocked=true;}return {status:blocked?"PASS":"FAIL",expected:"Reject 99000 when PO unit price is 12000",actual:{blocked,postedAmount:bill?.totalGross,billPrice:bill?.lines?.[0]?.unitPrice}};});
  await probe("A07","Return must reverse original discounted selling value",async()=>{const inv=await invoiceFixture(10);const ret=await createReturnRequest({invoiceId:inv.id,lines:[{productSku:"RICE-CHICK-S",returnedQty:1}],actor:warehouse});await inspectReturnRequest(ret.id,[{productSku:"RICE-CHICK-S",acceptedQty:1,rejectedQty:0}],warehouse);const result:any=await processReturnAndCreditNote(ret.id,finance);return {status:result.creditNote.totalGross===47520?"PASS":"FAIL",expected:{net:43200,pbjt:4320,gross:47520},actual:{net:result.creditNote.subtotalNet,pbjt:result.creditNote.pbjtTax,gross:result.creditNote.totalGross}};});
  await probe("A08","Cumulative returns must not exceed quantity originally invoiced",async()=>{const inv=await invoiceFixture();let blocked=false;const credits:number[]=[];for(let i=0;i<2;i++){try{const ret=await createReturnRequest({invoiceId:inv.id,lines:[{productSku:"RICE-CHICK-S",returnedQty:5}],actor:warehouse});await inspectReturnRequest(ret.id,[{productSku:"RICE-CHICK-S",acceptedQty:5,rejectedQty:0}],warehouse);const result:any=await processReturnAndCreditNote(ret.id,finance);credits.push(result.creditNote.totalGross);}catch{blocked=true;}}return {status:blocked && credits.length===1?"PASS":"FAIL",expected:"Only 5 total units may be returned against a 5-unit invoice",actual:{blocked,creditedDocuments:credits.length,totalCredited:credits.reduce((a,b)=>a+b,0),originalGross:inv.totalGross}};});
  await probe("A09","Draft invoice must not reduce credit exposure",async()=>{const order=await deliveryFixture();const before=await calculateCustomerCreditStatus("C01");await createCustomerInvoice({salesOrderId:order.id,lines:[{productSku:"RICE-CHICK-S",quantity:5}],actor:finance});const after=await calculateCustomerCreditStatus("C01");return {status:before.creditExposure===after.creditExposure?"PASS":"FAIL",expected:"Exposure unchanged until invoice posting",actual:{before:before.creditExposure,after:after.creditExposure}};});
  await probe("A10","Customer invoice duplicate SKU lines must not exceed delivered quantity",async()=>{const order=await deliveryFixture();let blocked=false,inv:any;try{inv=await createCustomerInvoice({salesOrderId:order.id,lines:[{productSku:"RICE-CHICK-S",quantity:5},{productSku:"RICE-CHICK-S",quantity:5}],actor:finance});await postCustomerInvoice(inv.id,finance);}catch{blocked=true;}return {status:blocked?"PASS":"FAIL",expected:"Reject total 10 when only 5 delivered",actual:{blocked,invoiced:inv?.lines?.reduce((s:number,l:any)=>s+l.quantity,0)}};});
  await probe("A11","POS cash difference remains consistent on repeated closure",async()=>{const session=await openPosSession({cashierId:cashier.id,openingCash:100000,actor:cashier});await createPosOrder({sessionId:session.id,paymentMethod:"QRIS",lines:[{productSku:"COF-LATT-HOT",quantity:1}],actor:cashier});const first:any=await closePosSession(session.id,100000,cashier);const second:any=await closePosSession(session.id,100000,cashier);return {status:first.difference===second.difference?"PASS":"FAIL",expected:"Same zero cash difference on both close calls",actual:{first:first.difference,retry:second.difference}};});
  await probe("A12","Delivery quantity must not exceed its ordered quantity",async()=>{const order=await createSalesQuotation({contactId:"C01",lines:[{productSku:"RICE-CHICK-S",quantity:8,unitPrice:48000}],actor:owner});const result:any=await confirmSalesOrder(order.id,owner);let blocked=false;try{await validateDeliveryOrder({deliveryOrderId:result.deliveryOrder.id,items:[{lineId:result.deliveryOrder.lines[0].id,productSku:"RICE-CHICK-S",deliveredQty:9}],actor:warehouse});}catch{blocked=true;}return {status:blocked?"PASS":"FAIL",expected:"Reject delivery 9 for order 8 even when stock exists",actual:{blocked}};});
  await probe("A13","Exact T-12 fresh-seed reserved-stock protection",async()=>{const order=await createSalesQuotation({contactId:"C01",lines:[{productSku:"RICE-CHICK-S",quantity:38,unitPrice:48000}],actor:owner});const delivery=await prisma.deliveryOrder.create({data:{deliveryNumber:"AUDIT-T12",salesOrderId:order.id,sourceLocation:"WH-JKT",status:"DRAFT",lines:{create:[{productSku:"RICE-CHICK-S",orderedQty:38}]}},include:{lines:true}});let blocked=false;try{await validateDeliveryOrder({deliveryOrderId:delivery.id,items:[{lineId:delivery.lines[0].id,productSku:"RICE-CHICK-S",deliveredQty:38}],actor:warehouse});}catch{blocked=true;}const stock=await prisma.stockLevel.findUnique({where:{productSku_locationCode:{productSku:"RICE-CHICK-S",locationCode:"WH-JKT"}}});return {status:blocked && stock?.onHand===40 && stock.reserved===6?"PASS":"FAIL",expected:{blocked:true,onHand:40,reserved:6,available:34},actual:{blocked,onHand:stock?.onHand,reserved:stock?.reserved}};});
  await probe("A14","Procure-to-Pay requires settling the posted vendor bill",async()=>{const po=await purchaseFixture();const bill=await createVendorBill({purchaseOrderId:po.id,lines:[{productSku:"COF-LATT-HOT",quantity:8}],actor:finance});await postVendorBill(bill.id,finance);const response=await paymentPOST(await req('/api/accounting/payments',finance,{billId:bill.id,paymentMethod:"BANK",amount:96000}));return {status:response.ok?"PASS":"FAIL",expected:"Vendor bill can be paid, reducing Bank and AP",actual:{http:response.status,body:await response.json()}};});
  writeFileSync("docs/compliance-audit/probe-results.json",JSON.stringify(results,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
