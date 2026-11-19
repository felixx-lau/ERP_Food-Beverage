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
import { businessDate } from '../src/lib/businessDate';
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
  const token=await createSessionToken({...admin,companyId:'default'});
  const req=(message:string)=>new NextRequest('http://localhost:3000/api/chatbot',{method:'POST',headers:{cookie:`rasa_aruna_company=default; rasa_aruna_session=${token}`,origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({message,sessionId:randomUUID()})});
  const originalFetch=globalThis.fetch;
  try {
    globalThis.fetch=async()=>{throw new Error('Language model must not be called for a data read');};
    const direct=await transactionContext.run(a,()=>chat(req('Ada berapa pelanggan?')));assert.equal(direct.status,200);assert((await direct.json()).toolsUsed.includes('contacts'));
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
