import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { executeSeed } from '../src/lib/seedData';
import { createSessionToken } from '../src/lib/auth';
import { createMaster,changeMaster,getMaster,listMaster } from '../src/lib/masterData';
import { createSalesQuotation } from '../src/lib/salesEngine';
import { adjustStock } from '../src/lib/inventoryEngine';
import { POST as createLeadAPI } from '../src/app/api/crm/leads/route';
import { PATCH as editLeadAPI } from '../src/app/api/crm/leads/[id]/route';
import { POST as createAPI } from '../src/app/api/master/[resource]/route';
import { PATCH as editAPI,DELETE as deleteAPI } from '../src/app/api/master/[resource]/[id]/route';

function isolated() {
  const cwd=realpathSync(process.cwd()), temp=realpathSync(os.tmpdir()), db=realpathSync((process.env.DATABASE_URL||'').replace(/^file:/,''));
  assert(cwd.startsWith(temp+path.sep)&&db.startsWith(cwd+path.sep),'Tests require an isolated temporary project/database.');
}
let passed=0;
const check=(name:string,fn:()=>Promise<void>)=>fn().then(()=>{passed++;console.log('[PASS]',name);});
async function main(){
  isolated();await executeSeed(prisma);
  const owner=(await prisma.user.findFirst({where:{role:'OWNER'}}))!,sales=(await prisma.user.findFirst({where:{role:'SALES'}}))!,cashier=(await prisma.user.findFirst({where:{role:'CASHIER'}}))!;
  await check('Contact create persists communication fields and terms',async()=>{
    const c:any=await createMaster('customers',{name:'Dynamic Customer',email:'buyer@example.test',phone:'08123456789',address:'Jalan Uji 1',city:'Jakarta',customerType:'INDIVIDUAL',paymentTerms:'NET7',creditLimit:500000},owner);
    const connection=new PrismaClient({datasourceUrl:process.env.DATABASE_URL});const stored=await connection.contact.findUnique({where:{id:c.id}});await connection.$disconnect();
    assert.equal(stored?.address,'Jalan Uji 1');assert.equal(stored?.email,'buyer@example.test');assert.equal(stored?.paymentTerms,'NET7');
    const updated:any=await changeMaster('customers',c.id,{version:0,name:'Updated Customer'},owner);assert.equal(updated.version,1);assert.equal(updated.email,c.email);
    await assert.rejects(changeMaster('customers',c.id,{version:0,name:'Stale edit'},owner),/diubah pengguna lain/);
    const archived:any=await changeMaster('customers',c.id,{version:1,action:'archive'},owner);assert(archived.archivedAt);
    assert(!(await listMaster('customers',owner,new URLSearchParams('limit=100'))).records.some((r:any)=>r.id===c.id));
    const restored:any=await changeMaster('customers',c.id,{version:2,action:'restore'},owner);assert.equal(restored.archivedAt,null);
    await changeMaster('customers',c.id,{version:3},owner,true);assert.equal(await prisma.contact.findUnique({where:{id:c.id}}),null);
    assert.equal(await prisma.auditLog.count({where:{documentType:'MASTER_customers',documentId:c.id}}),5);
  });
  await check('Invalid contact values and unauthorized credit edits are rejected',async()=>{
    await assert.rejects(createMaster('customers',{name:'Bad',city:'Jakarta',email:'invalid'},owner),/Email/);
    await assert.rejects(createMaster('customers',{name:'Bad',city:'Jakarta',openReceivable:1000},owner),/Saldo/);
    await assert.rejects(changeMaster('customers','C01',{version:0,creditLimit:9000000},sales),/Owner/);
  });
  await check('Referenced contacts cannot be deleted; archived customer cannot enter new sales',async()=>{
    const c:any=await createMaster('customers',{name:'Referenced',city:'Jakarta',creditLimit:500000},owner);
    await createSalesQuotation({contactId:c.id,lines:[{productSku:'RICE-CHICK-S',quantity:1,unitPrice:48000}],actor:owner});
    assert.equal((await getMaster('customers',c.id,owner)).record.capabilities.delete,false);
    await assert.rejects(changeMaster('customers',c.id,{version:0},owner,true),/terkait/);
    await changeMaster('customers',c.id,{version:0,action:'archive'},owner);
    await assert.rejects(createSalesQuotation({contactId:c.id,lines:[{productSku:'RICE-CHICK-S',quantity:1,unitPrice:48000}],actor:owner}),/Pelanggan/);
  });
  await check('All appropriate masters support create/edit/archive/restore/safe-delete',async()=>{
    const cases:any[]=[['vendors',{name:'Vendor Uji',city:'Bogor'},'id'],['categories',{code:'TEST-CATEGORY',name:'Kategori Uji'},'code'],['units',{code:'test-unit',name:'Satuan Uji'},'code'],['locations',{code:'TEST-LOCATION',name:'Lokasi Uji',usage:'Internal'},'code'],['accounts',{code:'9990',name:'Akun Uji',type:'ASSET'},'code'],['vendor-prices',{vendorId:'V03',productSku:'COF-LATT-HOT',minimumQty:99,price:11000},'id'],['leads',{name:'Lead Uji',contactId:'C01',expectedRevenue:200000,stage:'NEW'},'id']];
    for(const [resource,input,key] of cases){
      const record:any=await createMaster(resource,input,owner);const id=record[key];
      await changeMaster(resource,id,{version:0,...(resource==='vendor-prices'?{price:10500}:{name:'Diubah'})},owner);
      await changeMaster(resource,id,{version:1,action:'archive'},owner);await changeMaster(resource,id,{version:2,action:'restore'},owner);await changeMaster(resource,id,{version:3},owner,true);
    }
  });
  await check('Products persist metadata and protect valued stock/history',async()=>{
    const p:any=await createMaster('products',{sku:'CRUD-SKU',name:'Produk Uji',size:'Small',color:'Original',unit:'box',salesPrice:10000,standardCost:5000},owner);
    await changeMaster('products',p.sku,{version:0,name:'Produk Baru',description:'Deskripsi dinamis',salesPrice:11000},owner);
    await adjustStock({sku:p.sku,locationCode:'WH-JKT',newOnHand:3,reason:'Opening stock from verified count',actor:owner});
    assert.equal((await prisma.account.findUnique({where:{code:'1030'}}))?.currentBalance,12214000+15000);
    await assert.rejects(changeMaster('products',p.sku,{version:1},owner,true),/terkait/);
    await assert.rejects(changeMaster('products',p.sku,{version:1,standardCost:9000},owner),/Biaya standar/);
    await changeMaster('products',p.sku,{version:1,action:'archive'},owner);assert.equal((await prisma.productVariant.findUnique({where:{sku:p.sku}}))?.description,'Deskripsi dinamis');
  });
  await check('HTTP handlers enforce permissions, duplicate identities and stale writes',async()=>{
    const request=async(method:string,url:string,body:any,user:any)=>new NextRequest('http://localhost'+url,{method,headers:{'Content-Type':'application/json',authorization:'Bearer '+await createSessionToken(user)},body:JSON.stringify(body)});
    const denied=await createAPI(await request('POST','/api/master/customers',{name:'Unauthorized'},cashier),{params:Promise.resolve({resource:'customers'})});assert.equal(denied.status,403);
    const input={code:'API-UNIT',name:'Unit API'};const context={params:Promise.resolve({resource:'units'})};
    assert.equal((await createAPI(await request('POST','/api/master/units',input,owner),context)).status,200);
    assert.equal((await createAPI(await request('POST','/api/master/units',input,owner),context)).status,409);
    const item={params:Promise.resolve({resource:'units',id:'API-UNIT'})};
    assert.equal((await editAPI(await request('PATCH','/api/master/units/API-UNIT',{version:0,name:'Updated'},owner),item)).status,200);
    assert.equal((await editAPI(await request('PATCH','/api/master/units/API-UNIT',{version:0,name:'Lost update'},owner),item)).status,409);
    const del=new NextRequest('http://localhost/api/master/units/API-UNIT?version=1',{method:'DELETE',headers:{authorization:'Bearer '+await createSessionToken(owner)}});assert.equal((await deleteAPI(del,item)).status,200);
  });
  await check('Legacy CRM endpoints share master validation, version checks and request identity',async()=>{
    const headers={'Content-Type':'application/json',authorization:'Bearer '+await createSessionToken(sales),'Idempotency-Key':'legacy-lead'};
    const body={name:'Legacy route lead',contactId:'C01',expectedRevenue:100000,stage:'NEW'};
    const request=()=>new NextRequest('http://localhost/api/crm/leads',{method:'POST',headers,body:JSON.stringify(body)});
    const response=await createLeadAPI(request());assert.equal(response.status,200);const {lead}=await response.json();
    const retry=await createLeadAPI(request());assert.equal((await retry.json()).lead.id,lead.id);
    const patch=(input:any)=>new NextRequest('http://localhost/api/crm/leads/'+lead.id,{method:'PATCH',headers,body:JSON.stringify(input)});
    const context={params:Promise.resolve({id:lead.id})};
    assert.equal((await editLeadAPI(patch({version:0,expectedRevenue:-1}),context)).status,400);
    assert.equal((await editLeadAPI(patch({version:0,stage:'PROPOSITION'}),context)).status,200);
    assert.equal((await editLeadAPI(patch({version:0,name:'Stale'}),context)).status,409);
  });
  await check('Core account/location archival is forbidden and audit is preserved',async()=>{
    await assert.rejects(changeMaster('accounts','1010',{version:0,action:'archive'},owner),/sistem/);
    await assert.rejects(changeMaster('locations','WH-JKT',{version:0},owner,true),/terkait/);
    assert.equal((await getMaster('accounts','1010',owner)).record.capabilities.delete,false);
  });
  console.log(`CRUD SUMMARY: ${passed} scenario groups passed`);
}
main().catch(error=>{console.error('[FAIL]',error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
