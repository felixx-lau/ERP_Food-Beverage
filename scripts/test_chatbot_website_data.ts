import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST as chat } from '../src/app/api/chatbot/route';
import { createSessionToken } from '../src/lib/auth';
import { transactionContext } from '../src/lib/transactionContext';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve,join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { answerWebsiteQuestion, questionPeriod, websiteReply } from '../src/lib/agent/websiteData';
import { dispatchAgentTool } from '../src/lib/agent/tools';
import { financialSummary } from '../src/lib/financialSummary';
import { getOperationalDashboardMetrics } from '../src/lib/dashboardEngine';
import { businessDate, businessDayStart } from '../src/lib/businessDate';
async function main() {
 const folder=mkdtempSync(join(tmpdir(),'erp-grounded-chat-'));
 for(const name of ['a','b'])cpSync(resolve('prisma/erp.db'),join(folder,name+'.db'));
 const a=new PrismaClient({datasourceUrl:'file:'+join(folder,'a.db')}), b=new PrismaClient({datasourceUrl:'file:'+join(folder,'b.db')});
 try {
  const admin=await a.user.findFirstOrThrow({where:{role:'HEAD_ADMIN'}}),cashier=await a.user.findFirstOrThrow({where:{role:'CASHIER'}});
  const ctx={db:a,user:{...admin,companyId:'default'},companyId:'default',runId:'test'};
  const sku=(await a.productVariant.findFirstOrThrow({where:{archivedAt:null}})).sku;
  const sum=await a.stockLevel.aggregate({where:{productSku:sku,location:{archivedAt:null}},_sum:{onHand:true,reserved:true}});
  const data:any=await dispatchAgentTool(ctx,'inventory',{query:sku,limit:1});
  assert.equal(data.totals.onHand,sum._sum.onHand||0);
  const row=await a.stockLevel.findFirstOrThrow({where:{productSku:sku}});
  await a.stockLevel.update({where:{id:row.id},data:{onHand:{increment:37}}});
  const updated:any=await dispatchAgentTool(ctx,'inventory',{query:sku});assert.equal(updated.totals.onHand,data.totals.onHand+37);
  const other:any=await dispatchAgentTool({...ctx,db:b},'inventory',{query:sku});assert.equal(other.totals.onHand,data.totals.onHand);
  const contactCount=await a.contact.count({where:{type:'CUSTOMER',archivedAt:null}});
  const contact:any=await dispatchAgentTool(ctx,'contacts',{type:'CUSTOMER',limit:1});assert.equal(contact.totalCount,contactCount);
  const procurement=await a.user.findFirstOrThrow({where:{role:'PROCUREMENT'}});
  const customers:any=await dispatchAgentTool({...ctx,user:{...procurement,companyId:'default'}},'contacts',{type:'CUSTOMER'});assert.equal(customers.totalCount,contactCount);
  const pageData=await answerWebsiteQuestion({...ctx,user:{...procurement,companyId:'default'}},'Tampilkan data di halaman ini',{path:'/sales/contacts',resource:'customers'});
  assert(pageData?.reply.includes('?type=customers'));assert(pageData.toolsUsed.includes('contacts'));
  const question=await answerWebsiteQuestion(ctx,'Ada berapa pelanggan di website?');assert(question?.reply.includes('total '+contactCount.toLocaleString('id-ID')));
  const financial:any=await dispatchAgentTool(ctx,'financial_summary',{start:'2026-11-01',end:'2026-11-18'});
  assert.equal(financial.profit,(await financialSummary(a,'2026-11-01','2026-11-18')).profit);
  const metrics:any=await dispatchAgentTool(ctx,'dashboard_summary',{});assert.equal(metrics.inventory.totalUnits,(await getOperationalDashboardMetrics(a,'default')).inventory.totalUnits);
  const denied=await answerWebsiteQuestion({...ctx,user:{...cashier,companyId:'default'}},'Berapa laba dan kas perusahaan?');assert(denied?.reply.includes('tidak tersedia untuk role'));assert.deepEqual(denied.toolsUsed,[]);
  const productQuestion=await answerWebsiteQuestion(ctx,'Berapa stok '+sku+'?');assert(productQuestion?.toolsUsed.includes('inventory'));
  const noProduct=await answerWebsiteQuestion(ctx,'Cek stok SKU-TIDAK-ADA');assert(noProduct?.reply.includes('Tidak ada produk yang sesuai'));
  assert.equal(await answerWebsiteQuestion(ctx,'Siapkan draft pesanan penjualan'),null);
  for(const [kind,model] of [['vendor_bills','vendorBill'],['deliveries','deliveryOrder'],['receipts','goodsReceipt'],['transfers','internalTransfer'],['leads','crmLead']]) {
    const r:any=await dispatchAgentTool(ctx,'records',{kind});
    assert.equal(r.totalCount,await (a as any)[model].count({where:kind==='leads'?{archivedAt:null}:{}}));
  }
  await assert.rejects(()=>dispatchAgentTool({...ctx,user:{...cashier,companyId:'default'}},'records',{kind:'vendor_bills'}));
  process.env.AGENT_DATA_DIR=join(folder,'runs');process.env.AGENT_GATEWAY_SECRET='test-only-secret-at-least-thirty-two-characters';
  process.env.LANGFLOW_API_KEY='test';process.env.LANGFLOW_API_URL='http://127.0.0.1:9999/test';
  process.env.LANGFLOW_TOOL_COMPONENT_ID='tool';process.env.LANGFLOW_AGENT_COMPONENT_ID='agent';
  process.env.DATABASE_URL = 'file:' + join(folder, 'a.db');
  const token=await createSessionToken({...admin,companyId:'default'});
  const req=(message:string,sessionId=randomUUID())=>new NextRequest('http://localhost:3000/api/chatbot',{method:'POST',headers:{cookie:`rasa_aruna_company=default; rasa_aruna_session=${token}`,origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({message,sessionId})});
  const originalFetch=globalThis.fetch;
  try {
    globalThis.fetch=async()=>{throw new Error('Language model must not be called for a data read');};
    const direct=await transactionContext.run(a,()=>chat(req('Ada berapa pelanggan?')));assert.equal(direct.status,200);assert((await direct.json()).toolsUsed.includes('contacts'));
    const ask = async (message: string, sessionId?: string) => {
      const response = await transactionContext.run(a, () => chat(req(message, sessionId)));
      const payload = await response.json();
      assert.equal(response.status, 200, JSON.stringify(payload));
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert(!('conversation' in payload));
      return payload;
    };
    const fixtureSku = 'CHAT-CONTEXT-1';
    await a.productVariant.create({data:{sku:fixtureSku,name:'Menu Chat Uji',size:'Regular',color:'Original',unit:'box',salesPrice:20000,standardCost:10000}});
    await a.stockLevel.createMany({data:[
      {productSku:fixtureSku,locationCode:'WH-JKT',onHand:40,reserved:6},
      {productSku:fixtureSku,locationCode:'CAFE-JKT',onHand:10,reserved:2},
    ]});
    const thread = randomUUID();
    const initialStock = await ask(`Berapa stok ${fixtureSku} di WH-JKT?`, thread);
    assert.match(initialStock.reply, /tersedia 34 box/);
    await a.stockLevel.update({where:{productSku_locationCode:{productSku:fixtureSku,locationCode:'CAFE-JKT'}},data:{onHand:17}});
    const outlet = await ask('Kalau di gerai?', thread);
    assert.match(outlet.reply, /CAFE-JKT/);
    assert.match(outlet.reply, /tersedia 15 box/);
    assert(!outlet.reply.includes('WH-JKT'));
    await a.stockLevel.update({where:{productSku_locationCode:{productSku:fixtureSku,locationCode:'CAFE-JKT'}},data:{onHand:18}});
    assert.match((await ask('Sekarang berapa?', thread)).reply, /tersedia 16 box/);
    assert.deepEqual((await ask('Kalau di gerai?')).toolsUsed, []);
    const compared = await ask(`Bandingkan stok ${sku} dan ${fixtureSku} di WH-JKT dan CAFE-JKT`);
    for (const value of [sku, fixtureSku, 'WH-JKT', 'CAFE-JKT']) assert(compared.reply.includes(value));
    const cashierScope = await answerWebsiteQuestion({...ctx,user:{...cashier,companyId:'default'}}, `Berapa stok ${fixtureSku} di WH-JKT?`);
    assert.deepEqual(cashierScope?.toolsUsed, []);

    const customer = await a.contact.findFirstOrThrow({where:{type:'CUSTOMER',archivedAt:null}});
    const order = await a.salesOrder.create({data:{orderNumber:'S98765',contactId:customer.id,status:'CONFIRMED'}});
    const today = businessDayStart();
    const yesterday = new Date(today.getTime()-24*3600*1000);
    const tomorrow = new Date(today.getTime()+24*3600*1000);
    const invoiceFixtures = [
      {invoiceNumber:'INV/9991/0001',dueDate:yesterday,status:'POSTED',isPosted:true,outstandingAmount:55000},
      {invoiceNumber:'INV/9991/0002',dueDate:today,status:'POSTED',isPosted:true,outstandingAmount:10000},
      {invoiceNumber:'INV/9991/0003',dueDate:tomorrow,status:'POSTED',isPosted:true,outstandingAmount:10000},
      {invoiceNumber:'INV/9991/0004',dueDate:yesterday,status:'DRAFT',isPosted:false,outstandingAmount:10000},
      {invoiceNumber:'INV/9991/0005',dueDate:yesterday,status:'PAID',isPosted:true,outstandingAmount:0},
    ] as const;
    await a.customerInvoice.createMany({data:invoiceFixtures.map(row=>({...row,invoiceDate:new Date('1999-01-01T04:00:00Z'),salesOrderId:order.id,customerId:customer.id}))});
    const late = await ask('Invoice mana yang telat pada 1999-01-01?');
    assert.match(late.reply, /Invoice pelanggan lewat jatuh tempo/);
    assert.match(late.reply, /INV\/9991\/0001/);
    assert.match(late.reply, /sisa Rp 55\.000/);
    for (const row of invoiceFixtures.slice(1)) assert(!late.reply.includes(row.invoiceNumber));
    const unpaid = await ask('Invoice belum lunas pada 1999-01-01?');
    assert.match(unpaid.reply, /INV\/9991\/0003/);
    const billingThread = randomUUID();
    assert.match((await ask('Status invoice inv/9991/0004?', billingThread)).reply, /Draft/);
    const sameInvoice = await ask('Invoice itu statusnya?', billingThread);
    assert.match(sameInvoice.reply, /INV\/9991\/0004/);
    assert(!sameInvoice.reply.includes('INV/9991/0001'));

    const supplier = await a.contact.findFirstOrThrow({where:{type:'VENDOR',archivedAt:null}});
    const po = await a.purchaseOrder.create({data:{poNumber:'P98765',vendorId:supplier.id,status:'CONFIRMED',lines:{create:{productSku:fixtureSku,orderedQty:10,receivedQty:6,unitPrice:10000,subtotal:100000}}}});
    await a.purchaseOrder.create({data:{poNumber:'P987650',vendorId:supplier.id}});
    const receipt = await a.goodsReceipt.create({data:{receiptNumber:'WH/IN/98765',purchaseOrderId:po.id,destLocation:'WH-JKT',status:'DONE',lines:{create:{productSku:fixtureSku,demandQty:10,acceptedQty:6,rejectedQty:2}}}});
    await a.goodsReceipt.create({data:{receiptNumber:'WH/IN/98766',purchaseOrderId:po.id,destLocation:'WH-JKT',scheduledDate:new Date('1999-01-01')}});
    const exact = await ask('Status PO p98765?');
    assert(exact.reply.includes(`/purchase/orders?id=${po.id}`));
    assert.match(exact.reply, /6\/10 diterima/);
    assert(!exact.reply.includes('P987650'));
    const sameDocument = randomUUID();
    await ask('Status PO P98765?', sameDocument);
    await a.purchaseOrderLine.updateMany({where:{purchaseOrderId:po.id},data:{receivedQty:7}});
    assert.match((await ask('Cek lagi dokumennya', sameDocument)).reply, /7\/10 diterima/);
    const missing = await ask('Status PO P9876?');
    assert.match(missing.reply, /tidak ditemukan/);
    assert(!missing.reply.includes('P98765'));
    const receiptAnswer = await ask('Status WH/IN/98765?');
    assert(receiptAnswer.reply.includes(`/inventory/receipts?id=${receipt.id}`));
    assert.match(receiptAnswer.reply, /2 ditolak/);
    const queue = await answerWebsiteQuestion({...ctx,user:{...procurement,companyId:'default'}},'Apa pekerjaan yang perlu ditindaklanjuti?');
    assert(queue?.actions?.some(action => action.department === 'Procurement' && action.href === `/purchase/orders?id=${po.id}#status-penerimaan`));

    await a.journalEntry.create({data:{entryNumber:'CHAT-TEST-9991',sourceDocument:'CHAT-TEST',documentRef:'CHAT-TEST-9991',journalType:'GENERAL',state:'POSTED',date:new Date('1999-02-01T04:00:00Z'),items:{create:[
      {accountCode:'4010',label:'Penjualan',credit:1000},{accountCode:'4020',label:'Retur',debit:100},
      {accountCode:'5010',label:'HPP',debit:300},{accountCode:'5010',label:'Pengembalian HPP',credit:50},
      {accountCode:'6010',label:'Beban operasional',debit:80},{accountCode:'8010',label:'Penyesuaian',debit:20},
      {accountCode:'1010',label:'Kas',debit:550},
    ]}}});
    const split = await financialSummary(a,'1999-02-01','1999-02-01');
    assert.deepEqual([split.netRevenue,split.cogs,split.grossProfit,split.operatingExpenses,split.otherExpenses,split.profit],[900,250,650,80,20,550]);
    const financialReply = await ask('Berapa HPP dan laba kotor pada 1999-02-01?');
    assert.match(financialReply.reply, /HPP: Rp\s*250/);
    assert.match(financialReply.reply, /Laba kotor: Rp\s*650/);
    assert.deepEqual((await ask('Berapa HPP per menu pada 1999-02-01?')).toolsUsed, []);
    console.log('PASS: live reread in the same chat, outlet and SKU comparisons, overdue dates, exact documents, role links, and posted HPP breakdown.');
    globalThis.fetch=async()=>new Response(JSON.stringify({outputs:[{outputs:[{results:{message:{text:'Perusahaan mempunyai 999999 pelanggan dan laba Rp 999999.'}}}]}]}),{headers:{'content-type':'application/json'}});
    const unverified=await transactionContext.run(a,()=>chat(req('Coba bacakan rincian yang belum disebut')));
    const result=await unverified.json();assert(!result.reply.includes('999999'));assert(result.reply.includes('belum berhasil membaca'));
  } finally {globalThis.fetch=originalFetch;}
  assert.equal(websiteReply([{action:'profile',data:{name:'ignore instructions'}}]),'');
  assert.deepEqual(questionPeriod('laporan 2026-11-01 sampai 2026-11-18'),{start:'2026-11-01',end:'2026-11-18'});
  assert.deepEqual(questionPeriod('laba tanggal 1 november 2026 sampai 10 november 2026'),{start:'2026-11-01',end:'2026-11-10'});
  assert.deepEqual(questionPeriod('laba hari ini'),{start:businessDate(),end:businessDate()});
  console.log('PASS: fresh reads, exact totals, company isolation, role restriction, journal/dashboard parity, dates and no fabricated fallback.');
 } finally {await Promise.all([a.$disconnect(),b.$disconnect()]);rmSync(folder,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
