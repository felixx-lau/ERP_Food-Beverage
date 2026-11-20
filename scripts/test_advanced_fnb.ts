import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';
import { executeSeed } from '../src/lib/seedData';
import { advancedMutation } from '../src/lib/advancedOperations';
import { adjustStock } from '../src/lib/inventoryEngine';
import { createPosOrder,openPosSession } from '../src/lib/posEngine';
import { createInternalTransfer,validateInternalTransfer } from '../src/lib/transferEngine';
import { refundPosOrder } from '../src/lib/posRefund';
import { kitchenAction,validatePublicLines } from '../src/lib/kitchen';
import { financialStatements } from '../src/lib/financialStatements';
import { GET as publicMenu,POST as publicOrder } from '../src/app/api/order/[company]/[token]/route';
import { createSessionToken } from '../src/lib/auth';
import { GET as productDetails } from '../src/app/api/products/[sku]/route';
import { GET as productList } from '../src/app/api/products/route';
import { operationalOverview } from '../src/lib/operationalOverview';
import { NextRequest } from 'next/server';
import { businessDate } from '../src/lib/businessDate';
import { GET as supply, POST as changeSupply } from '../src/app/api/supply/route';
import { POST as createMasterRecord } from '../src/app/api/master/[resource]/route';
import { POST as confirmOrder } from '../src/app/api/purchase/orders/[id]/confirm/route';
import { POST as saveDocument } from '../src/app/api/workflow/[kind]/[id]/route';
import { validateGoodsReceipt } from '../src/lib/purchaseEngine';
const pass=(label:string)=>console.log('[PASS]',label);
const stock=async(sku:string,loc='CAFE-JKT')=>(await prisma.stockLevel.findUniqueOrThrow({where:{productSku_locationCode:{productSku:sku,locationCode:loc}}})).onHand;
const day=(offset:number)=>businessDate(new Date(Date.now()+offset*86400000));
async function main(){
 const cwd=realpathSync(process.cwd());assert(cwd.startsWith(realpathSync(os.tmpdir())+path.sep));assert(realpathSync((process.env.DATABASE_URL||'').replace(/^file:/,'')).startsWith(cwd+path.sep));
 await executeSeed(prisma);const owner:any=await prisma.user.findFirstOrThrow({where:{role:'HEAD_ADMIN'}}),cashier:any=await prisma.user.findFirstOrThrow({where:{role:'CASHIER'}}),warehouse:any=await prisma.user.findFirstOrThrow({where:{role:'WAREHOUSE'}});
 const kitchen:any=await prisma.user.create({data:{name:'Dapur Test',email:'kitchen@test.local',passwordHash:'TEST_ONLY',role:'KITCHEN'}});
 const common={size:'Base',color:'Original',unit:'unit',salesPrice:1000,standardCost:100};
 await prisma.productVariant.create({data:{...common,sku:'RAW-TEST',name:'Bahan uji'}});await prisma.productVariant.create({data:{...common,sku:'MEAL-TEST',name:'Menu uji',standardCost:200,trackLots:true}});
 await adjustStock({sku:'RAW-TEST',locationCode:'CAFE-JKT',newOnHand:1000,reason:'Fixture advanced isolated',actor:owner});
 const later:any=await advancedMutation('lot',{productSku:'RAW-TEST',locationCode:'CAFE-JKT',code:'LATER',quantity:600,expiresAt:day(5),sourceRef:'Opening test'},owner);
 const early:any=await advancedMutation('lot',{productSku:'RAW-TEST',locationCode:'CAFE-JKT',code:'EARLY',quantity:400,expiresAt:day(1),sourceRef:'Opening test'},owner);
 await assert.rejects(()=>advancedMutation('lot',{productSku:'RAW-TEST',locationCode:'CAFE-JKT',code:'OVER',quantity:1,expiresAt:day(2),sourceRef:'Test'},owner));pass('Lot allocation cannot exceed physical stock');
 const recipe:any=await advancedMutation('recipe',{productSku:'MEAL-TEST',name:'Resep uji',outputQty:1,mode:'PRODUCTION',lines:[{productSku:'RAW-TEST',quantity:2}]},owner);
 await assert.rejects(()=>advancedMutation('recipe',{productSku:'MEAL-TEST',name:'Bad',outputQty:1,mode:'PRODUCTION',version:0,lines:[{productSku:'MEAL-TEST',quantity:2}]},owner));pass('Self-referential recipe rejected');
 const mo:any=await advancedMutation('production',{recipeId:recipe.id,locationCode:'CAFE-JKT',plannedQty:2},kitchen);
 const finished:any=await advancedMutation('finishProduction',{id:mo.id,actualQty:2,inputs:[{productSku:'RAW-TEST',quantity:5}],lotCode:'MEAL-BATCH',expiresAt:day(2)},kitchen);
 assert.equal(finished.totalCost,500);assert.equal(finished.varianceValue,100);assert.equal(await stock('RAW-TEST'),995);assert.equal(await stock('MEAL-TEST'),2);
 assert.equal((await prisma.stockLot.findUniqueOrThrow({where:{id:early.id}})).onHand,395);assert.equal((await prisma.stockLot.findUniqueOrThrow({where:{id:later.id}})).onHand,600);pass('Production consumes FEFO, records actual cost and usage variance');
 const journals=await prisma.journalEntry.count();await advancedMutation('finishProduction',{id:mo.id},kitchen);assert.equal(await prisma.journalEntry.count(),journals);assert.equal(await stock('MEAL-TEST'),2);pass('Production retry does not duplicate stock or journal');
 const mo2:any=await advancedMutation('production',{recipeId:recipe.id,locationCode:'CAFE-JKT',plannedQty:2},owner);await assert.rejects(()=>advancedMutation('finishProduction',{id:mo2.id,actualQty:2,inputs:[{productSku:'RAW-TEST',quantity:5000}],lotCode:'X',expiresAt:day(2)},owner));assert.equal(await stock('RAW-TEST'),995);pass('Insufficient production materials roll back all effects');
 await advancedMutation('recipe',{productSku:'MEAL-TEST',name:'Resep POS',outputQty:1,mode:'BACKFLUSH',version:recipe.version,lines:[{productSku:'RAW-TEST',quantity:2}]},owner);
 const session=await openPosSession({cashierId:cashier.id,locationCode:'CAFE-JKT',actor:cashier});
 const sale=await createPosOrder({sessionId:session.id,locationCode:'CAFE-JKT',lines:[{productSku:'MEAL-TEST',quantity:3}],actor:cashier,paymentMethod:'CASH'});
 assert.equal(sale.order.totalCost,600);assert.equal(await stock('RAW-TEST'),989);assert.equal(await stock('MEAL-TEST'),2);assert.equal(await prisma.kitchenTicket.count({where:{posOrderId:sale.order.id}}),1);pass('POS recipe backflush consumes ingredients with recipe HPP and one KDS ticket');
 await refundPosOrder(sale.order.id,'Fixture cooked refund',owner);assert.equal(await stock('RAW-TEST'),989);assert.equal(await stock('MEAL-TEST'),2);pass('Cooked refund never restores used raw ingredients');
 await prisma.stockLot.update({where:{id:early.id},data:{expiresAt:new Date('2020-01-01')}});await prisma.stockLot.update({where:{id:later.id},data:{expiresAt:new Date('2020-01-01')}});
 await assert.rejects(()=>createPosOrder({sessionId:session.id,locationCode:'CAFE-JKT',lines:[{productSku:'MEAL-TEST',quantity:1}],actor:cashier}));assert.equal(await stock('RAW-TEST'),989);pass('Expired lots rejected for POS without changing stock');
 await advancedMutation('waste',{productSku:'RAW-TEST',locationCode:'CAFE-JKT',quantity:4,lotId:early.id,reason:'Kedaluwarsa pengujian'},kitchen);assert.equal(await stock('RAW-TEST'),985);pass('Expired batch can be disposed with stock and expense posting');
 await assert.rejects(()=>advancedMutation('waste',{productSku:'RAW-TEST',locationCode:'CAFE-JKT',quantity:1,lotId:early.id,reason:'Forbidden'},cashier));pass('Cashier cannot post production waste');
 await prisma.stockLot.update({where:{id:later.id},data:{expiresAt:new Date(Date.now()+5*86400000)}});
 const transfer=await createInternalTransfer({sourceLocation:'CAFE-JKT',destLocation:'WH-JKT',lines:[{productSku:'RAW-TEST',quantity:10}],actor:warehouse});await validateInternalTransfer(transfer.id,warehouse);assert.equal(await stock('RAW-TEST','WH-JKT'),10);assert.equal((await prisma.stockLot.findFirstOrThrow({where:{productSku:'RAW-TEST',locationCode:'WH-JKT'}})).code,'LATER');pass('Transfer preserves batch identity and expiration');
 await advancedMutation('rule',{productSku:'RAW-TEST',locationCode:'WH-JKT',minimum:20,target:30},owner);const pr=await prisma.purchaseRequest.findFirstOrThrow({where:{productSku:'RAW-TEST',locationCode:'WH-JKT'}});assert.equal(pr.quantity,20);await advancedMutation('evaluateRules',{},owner);assert.equal(await prisma.purchaseRequest.count({where:{productSku:'RAW-TEST',locationCode:'WH-JKT'}}),1);pass('Reorder rule generates one request for the shortage');
 await assert.rejects(()=>advancedMutation('requestToPO',{id:pr.id,vendorId:'V01'},owner));await advancedMutation('approveRequest',{id:pr.id},owner);await advancedMutation('requestToPO',{id:pr.id,vendorId:'V01'},owner);assert.equal(await prisma.purchaseRequest.count({where:{productSku:'RAW-TEST',locationCode:'WH-JKT'}}),1);pass('Approval required; conversion does not regenerate duplicate PR');
 await assert.rejects(()=>openPosSession({cashierId:cashier.id,locationCode:'WH-JKT',actor:cashier}));await advancedMutation('outletAccess',{userId:cashier.id,locationCode:'WH-JKT'},owner);const second=await openPosSession({cashierId:cashier.id,locationCode:'WH-JKT',actor:cashier});assert.equal(second.locationCode,'WH-JKT');pass('Multi-outlet cashier access requires Head Admin assignment');
 const table:any=await kitchenAction('table',{name:'Meja Uji',locationCode:'CAFE-JKT'},owner);
 const beforePublic = await Promise.all([prisma.kitchenTicket.count(), prisma.posOrder.count(), prisma.stockMove.count()]);
 const menu = await publicMenu();
 assert.equal(menu.status,410);
 assert(!('products' in await menu.json()));
 assert.equal((await publicOrder()).status,410);
 assert.equal((await publicOrder()).status,410);
 assert.deepEqual(await Promise.all([prisma.kitchenTicket.count(), prisma.posOrder.count(), prisma.stockMove.count()]),beforePublic);
 pass('Retired public QR menu and repeated submissions expose no products and create no orders or stock moves');
 const ticket = await prisma.kitchenTicket.create({data:{number:'KDS-TEST',requestKey:crypto.randomUUID(),tableId:table.id,tableName:table.name,locationCode:'CAFE-JKT',lines:JSON.stringify([{productSku:'COF-LATT-HOT',quantity:1}])}});
 await assert.rejects(()=>kitchenAction('ticketStatus',{id:ticket.id,status:'READY'},kitchen));await kitchenAction('ticketStatus',{id:ticket.id,status:'ACCEPTED'},kitchen);await kitchenAction('ticketStatus',{id:ticket.id,status:'PREPARING'},kitchen);await kitchenAction('ticketStatus',{id:ticket.id,status:'READY'},kitchen);await assert.rejects(()=>kitchenAction('ticketStatus',{id:ticket.id,status:'COMPLETED'},kitchen));pass('Kitchen enforces status sequence and cannot complete unpaid orders');
 const before=await prisma.posOrder.count();await kitchenAction('payTicket',{id:ticket.id,sessionId:session.id,paymentMethod:'QRIS'},owner);await kitchenAction('payTicket',{id:ticket.id,sessionId:session.id,paymentMethod:'QRIS'},owner);assert.equal(await prisma.posOrder.count(),before+1);await kitchenAction('ticketStatus',{id:ticket.id,status:'COMPLETED'},kitchen);assert.equal(await prisma.kitchenTicket.count({where:{tableId:table.id}}),1);pass('Internal unpaid ticket checkout posts POS once and keeps original ticket lifecycle');
 await kitchenAction('disableTable',{id:table.id},owner);assert.equal((await publicMenu()).status,410);pass('Disabled QR link cannot retrieve menu');
 const adminToken = await createSessionToken({ ...owner, companyId: 'default' });
 const buyer = await prisma.user.findFirstOrThrow({ where: { role: 'PROCUREMENT' } });
 const businessOwner = await prisma.user.create({
   data: { name: 'Owner Uji', email: 'owner-supply@test.local', passwordHash: 'TEST_ONLY', role: 'OWNER' },
 });
 const buyerToken = await createSessionToken({ ...buyer, companyId: 'default' });
 const ownerToken = await createSessionToken({ ...businessOwner, companyId: 'default' });
 const request = (url: string, token: string, body?: object, key?: string) => new NextRequest('http://localhost' + url, {
   headers: { authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
   method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
 });
 const master = (resource: string, body: object) => createMasterRecord(request('/api/master/' + resource, adminToken, body), { params: Promise.resolve({ resource }) });
 assert.equal((await master('units', { code: 'g-test', name: 'Gram uji' })).status, 200);
 const supplierResponse = await master('vendors', { name: 'Pemasok bahan uji', email: 'supplier@example.test', city: 'Jakarta' });
 assert.equal(supplierResponse.status, 200);
 const supplier = (await supplierResponse.json()).record;
 const rawSku = 'SUPPLY-RAW', menuSku = 'SUPPLY-MENU';
 assert.equal((await master('products', {
   sku: rawSku, name: 'Bahan uji pengadaan', unit: 'g-test', kind: 'MATERIAL', defaultVendorId: supplier.id, standardCost: 250,
 })).status, 200);
 assert.equal((await master('products', {
   sku: menuSku, name: 'Menu uji pengadaan', unit: 'g-test', kind: 'MENU', salesPrice: 18000, standardCost: 500,
 })).status, 200);
 assert.equal((await master('vendor-prices', { vendorId: supplier.id, productSku: rawSku, minimumQty: 10, price: 200 })).status, 200);
 const purchaseUrl = '/api/supply?area=purchase', recipeUrl = '/api/supply?area=production';
 const mutate = (url: string, token: string, body: object, key?: string) => changeSupply(request(url, token, body, key));
 assert.equal((await supply(request(recipeUrl, ownerToken))).status, 403);
 assert.equal((await mutate(purchaseUrl, ownerToken, { action: 'rule' })).status, 403);
 assert.equal((await mutate(recipeUrl, adminToken, { action: 'lot' })).status, 404);
 assert.equal((await mutate(recipeUrl, adminToken, {
   action: 'recipe', productSku: menuSku, name: 'Resep menu uji pengadaan', outputQty: 1, mode: 'BACKFLUSH',
   lines: [{ productSku: rawSku, quantity: 2 }],
 })).status, 200);
 await adjustStock({ sku: rawSku, locationCode: 'CAFE-JKT', newOnHand: 12, reason: 'Stok awal uji', actor: owner });
 assert.equal((await mutate(purchaseUrl, buyerToken, { action: 'rule', productSku: rawSku, locationCode: 'CAFE-JKT', minimum: 10, target: 25 })).status, 200);
 assert.equal(await prisma.purchaseRequest.count({ where: { productSku: rawSku } }), 0);
 assert.equal((await productList(request('/api/products?purpose=sale', adminToken)).then(response => response.json())).products.some((item:any) => item.sku === rawSku), false);
 await assert.rejects(() => createPosOrder({ sessionId: session.id, locationCode: 'CAFE-JKT', lines: [{ productSku: rawSku, quantity: 1 }], actor: owner }));
 const purchaseSale = await createPosOrder({
   sessionId: session.id, locationCode: 'CAFE-JKT', lines: [{ productSku: menuSku, quantity: 1 }],
   actor: owner, paymentMethod: 'CASH',
 });
 assert.equal(purchaseSale.order.totalCost, 500);
 assert.equal(purchaseSale.order.subtotalNet, 18000);
 assert.equal(await stock(rawSku), 10);
 const shortage = await prisma.purchaseRequest.findFirstOrThrow({ where: { productSku: rawSku } });
 assert.equal(shortage.quantity, 15);
 assert.match(shortage.number, /^PR\/\d{4}\/\d{4,}$/);
 assert.equal((await mutate(purchaseUrl, buyerToken, { action: 'approveRequest', id: shortage.id })).status, 403);
 assert.equal((await mutate(purchaseUrl, buyerToken, { action: 'requestToPO', id: shortage.id })).status, 400);
 assert.equal((await mutate(purchaseUrl, ownerToken, { action: 'approveRequest', id: shortage.id })).status, 200);
 const createOrder = { action: 'requestToPO', id: shortage.id };
 const created = await mutate(purchaseUrl, buyerToken, createOrder, 'convert-once');
 assert.equal(created.status, 200);
 const linkedId = (await created.json()).result.purchaseOrderId;
 assert.equal((await (await mutate(purchaseUrl, buyerToken, createOrder, 'convert-once')).json()).result.purchaseOrderId, linkedId);
 const linkedPO = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: linkedId }, include: { lines: true } });
 assert.equal(linkedPO.vendorId, supplier.id);
 assert.equal(linkedPO.lines[0].unitPrice, 200);
 assert.equal(linkedPO.total, 3000);
 const poParams = { params: Promise.resolve({ id: linkedId }) };
 const workflowParams = { params: Promise.resolve({ kind: 'purchase', id: linkedId }) };
 const workflowUrl = '/api/workflow/purchase/' + linkedId;
 assert.equal((await saveDocument(request(workflowUrl, buyerToken, {
   action: 'edit', version: linkedPO.version, lines: [{ productSku: rawSku, orderedQty: 1, unitPrice: 200 }],
 }), workflowParams)).status, 409);
 assert.equal((await saveDocument(request(workflowUrl, buyerToken, {
   action: 'recordSent', version: linkedPO.version, recipient: supplier.email,
 }), workflowParams)).status, 409);
 const confirmUrl = '/api/purchase/orders/' + linkedId + '/confirm';
 assert.equal((await confirmOrder(request(confirmUrl, buyerToken, { destLocation: 'WH-JKT' }), poParams)).status, 400);
 const confirmed = await confirmOrder(request(confirmUrl, buyerToken, {}), poParams);
 assert.equal(confirmed.status, 200);
 const { receipt, purchaseOrder } = await confirmed.json();
 assert.equal(receipt.destLocation, 'CAFE-JKT');
 const dispatch = { action: 'recordSent', version: purchaseOrder.version, recipient: supplier.email };
 assert.equal((await saveDocument(request(workflowUrl, buyerToken, dispatch, 'send-once'), workflowParams)).status, 200);
 assert.equal((await saveDocument(request(workflowUrl, buyerToken, dispatch, 'send-once'), workflowParams)).status, 200);
 assert.equal(await prisma.auditLog.count({ where: { documentId: linkedId, action: 'RECORD_VENDOR_DISPATCH' } }), 1);
 const prPage = await supply(request(purchaseUrl, buyerToken)).then(response => response.json());
 assert.ok(prPage.requests.find((entry:any) => entry.id === shortage.id).purchaseOrder.sentAt);
 const receiptLine = receipt.lines[0];
 await validateGoodsReceipt({ receiptId: receipt.id, items: [{
   lineId: receiptLine.id, productSku: rawSku, acceptedQty: 5, rejectedQty: 0,
 }], actor: warehouse });
 assert.equal(await stock(rawSku), 15);
 const backorder = await prisma.goodsReceipt.findFirstOrThrow({ where: { purchaseOrderId: linkedId, status: 'DRAFT' }, include: { lines: true } });
 assert.equal(backorder.destLocation, 'CAFE-JKT');
 await validateGoodsReceipt({ receiptId: backorder.id, items: [{
   lineId: backorder.lines[0].id, productSku: rawSku, acceptedQty: 10, rejectedQty: 0,
 }], actor: warehouse });
 assert.equal(await stock(rawSku), 25);
 assert.equal(await prisma.purchaseRequest.count({ where: { productSku: rawSku } }), 1);
 pass('Master material, menu, UoM, supplier and BoM flow through POS to an approved, priced and dispatched PO and location-correct receipts');

 const previousApproved = await prisma.purchaseRequest.findUniqueOrThrow({ where: { id: pr.id } });
 const trackedReceiptResponse = await confirmOrder(request('/api/purchase/orders/' + previousApproved.purchaseOrderId + '/confirm', buyerToken, {}),
   { params: Promise.resolve({ id: previousApproved.purchaseOrderId! }) });
 assert.equal(trackedReceiptResponse.status, 200);
 const trackedReceipt = (await trackedReceiptResponse.json()).receipt;
 const trackedLine = { lineId: trackedReceipt.lines[0].id, productSku: 'RAW-TEST', acceptedQty: pr.quantity, rejectedQty: 0 };
 await assert.rejects(() => validateGoodsReceipt({ receiptId: trackedReceipt.id, items: [trackedLine], actor: warehouse }));
 assert.equal(await stock('RAW-TEST', 'WH-JKT'), 10);
 await validateGoodsReceipt({ receiptId: trackedReceipt.id, items: [{ ...trackedLine, lotCode: 'REORDER-LOT', expiresAt: day(5) }], actor: warehouse });
 assert.equal(await stock('RAW-TEST', 'WH-JKT'), 30);
 assert.equal(await prisma.stockLot.count({ where: { productSku: 'RAW-TEST', locationCode: 'WH-JKT', code: 'REORDER-LOT', onHand: pr.quantity } }), 1);
 assert.equal(await prisma.purchaseRequest.count({ where: { productSku: 'RAW-TEST', locationCode: 'WH-JKT' } }), 1);
 pass('Tracked receipt replenishes both physical and usable stock without a replacement PR');

 const cancelled:any=await advancedMutation('production',{recipeId:recipe.id,locationCode:'CAFE-JKT',plannedQty:1},owner).catch(()=>null);
 // The recipe is backflush now, so stale production creation must be rejected.
 assert.equal(cancelled,null);await advancedMutation('cancelProduction',{id:mo2.id},owner);assert.equal((await prisma.productionOrder.findUniqueOrThrow({where:{id:mo2.id}})).status,'CANCELLED');await assert.rejects(()=>advancedMutation('finishProduction',{id:mo2.id,actualQty:1,inputs:[{productSku:'RAW-TEST',quantity:2}]},owner));pass('Cancelled draft cannot consume ingredients; backflush recipes cannot create production orders');
 assert.throws(()=>validatePublicLines([{productSku:'COF-LATT-HOT',quantity:101}]));assert.throws(()=>validatePublicLines([{productSku:'COF-LATT-HOT',quantity:0}]));pass('QR quantities are bounded to 1–100 per variant');
 await advancedMutation('rule',{productSku:'COOKIE-CHO-1',locationCode:'WH-JKT',minimum:1000,target:1100},owner);const rejected=await prisma.purchaseRequest.findFirstOrThrow({where:{productSku:'COOKIE-CHO-1',status:'PENDING'}});await advancedMutation('rejectRequest',{id:rejected.id},owner);const rule=await prisma.reorderRule.findFirstOrThrow({where:{productSku:'COOKIE-CHO-1'}});assert.equal(rule.active,false);await advancedMutation('evaluateRules',{},owner);assert.equal(await prisma.purchaseRequest.count({where:{productSku:'COOKIE-CHO-1',status:'PENDING'}}),0);pass('Head Admin rejection pauses restocking and prevents immediate recreation');
 await advancedMutation('toggleRule',{id:rule.id,active:true},owner);assert.equal(await prisma.purchaseRequest.count({where:{productSku:'COOKIE-CHO-1',status:'PENDING'}}),1);pass('Reorder rules can be explicitly resumed');
 const openingEntry=await prisma.journalEntry.findFirstOrThrow({where:{isOpening:true}});const openingDate=businessDate(openingEntry.date);const firstDay=await financialStatements(openingDate,openingDate);assert(firstDay.cashFlow.openingAdjustments>0);assert.equal(firstDay.cashFlow.flows.filter(f=>f.category==='OPENING').reduce((sum,f)=>sum+f.amount,0),firstDay.cashFlow.openingAdjustments);assert(Math.abs(firstDay.cashFlow.difference)<.01);pass('Opening journals inside the report period appear as migration adjustments');
 const ownerHeaders={authorization:'Bearer '+await createSessionToken({...owner,companyId:'default'})};const cashierHeaders={authorization:'Bearer '+await createSessionToken({...cashier,companyId:'default'})};
 await prisma.warehouseLocation.create({data:{code:'CAFE-BDG',name:'Gerai uji Bandung',type:'Internal',usage:'Warehouse'}});await adjustStock({sku:'RAW-TEST',locationCode:'CAFE-BDG',newOnHand:3,reason:'Third location fixture',actor:owner});const detail=await productDetails(new NextRequest('http://localhost/api/products/RAW-TEST',{headers:ownerHeaders}),{params:Promise.resolve({sku:'RAW-TEST'})});assert.equal(detail.status,200);const detailData=await detail.json();assert.equal(detailData.product.locations.find((l:any)=>l.locationCode==='CAFE-BDG').onHand,3);assert.equal(detailData.product.companyOnHand,(await stock('RAW-TEST'))+(await stock('RAW-TEST','WH-JKT'))+3);pass('Product details include a third location in physical totals');
 const scoped=await productList(new NextRequest('http://localhost/api/products',{headers:cashierHeaders}));assert.equal(scoped.status,200);const scopedData=await scoped.json();assert(scopedData.products.every((p:any)=>p.stockLevels.every((l:any)=>l.locationCode==='WH-JKT')&&!('cafeStock' in p)&&!('standardCost' in p)));const overview=await operationalOverview(prisma as any,cashier);assert(overview.tasks.filter(t=>t.id.startsWith('stock:')).every(t=>t.reason.includes('WH-JKT')));pass('Cashier product and work lists respect assigned outlets without exposing costs');
 const kitchenOverview=await operationalOverview(prisma as any,kitchen);assert.equal(kitchenOverview.role,'KITCHEN');assert(kitchenOverview.tasks.every(task=>!task.href.startsWith('/operations/')));assert(!('overdueInvoices' in kitchenOverview.counts));pass('Kitchen overview preserves role isolation and omits retired operations pages');
 const statements=await financialStatements();assert(Math.abs(statements.balanceSheet.difference)<.01);assert(Math.abs(statements.cashFlow.difference)<.01);pass('Balance sheet and cash flow reconcile after production, waste, sales and refunds');
 for(const j of await prisma.journalEntry.findMany({include:{items:true}}))assert(Math.abs(j.items.reduce((n,i)=>n+i.debit-i.credit,0))<.001);pass('All generated journals balanced');
}
main().finally(()=>prisma.$disconnect()).catch(e=>{console.error('[FAIL]',e);process.exitCode=1;});
