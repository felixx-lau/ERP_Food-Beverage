import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { prisma, resolveDbFilePath } from '../src/lib/prisma';
import { executeSeed } from '../src/lib/seedData';
import { createSessionToken } from '../src/lib/auth';
import { createSalesQuotation, confirmSalesOrder, updateSalesOrderLine } from '../src/lib/salesEngine';
import { createPurchaseQuotation, confirmPurchaseOrder, validateGoodsReceipt, createVendorBill } from '../src/lib/purchaseEngine';
import { documentAction } from '../src/lib/documentWorkflow';
import { GET as readOrder } from '../src/app/api/sales/orders/[id]/route';
import { POST as decide } from '../src/app/api/sales/orders/[id]/approve-discount/route';

async function main() {
  const cwd = realpathSync(process.cwd());
  assert(cwd.startsWith(realpathSync(tmpdir()) + path.sep));
  assert(realpathSync((process.env.DATABASE_URL ?? '').replace(/^file:/, '')).startsWith(cwd + path.sep));
  await executeSeed(prisma);
  const [owner, sales, admin, warehouse, procurement, finance] = await Promise.all(
    (['OWNER','SALES','HEAD_ADMIN','WAREHOUSE','PROCUREMENT','FINANCE'] as const)
      .map(role => prisma.user.findFirstOrThrow({ where: { role } })),
  );
  const sale = (discountPercent: number) => createSalesQuotation({
    contactId: 'C01', lines: [{ productSku: 'RICE-CHICK-S', quantity: 2, unitPrice: 48000, discountPercent }], actor: sales,
  });
  const tryDecision = async (user: typeof owner, id: string, decision: string, version: number, reason: string, key = 'approval-1') => {
    const request = new NextRequest(`http://localhost:3107/api/sales/orders/${id}/approve-discount`, {
      method: 'POST',
      headers: { authorization: 'Bearer ' + await createSessionToken(user), 'idempotency-key': key },
      body: JSON.stringify({ decision, version, reason }),
    });
    return decide(request, { params: Promise.resolve({ id }) });
  };

  for (const discount of [0, 9.99, 10]) {
    const order = await sale(discount);
    if (discount === 0) assert.deepEqual([order.subtotalNet,order.projectedCost,order.subtotalNet-order.projectedCost], [96000,52000,44000]);
    assert.equal((await confirmSalesOrder(order.id, sales)).confirmedOrder.status, 'CONFIRMED');
  }
  const justOver = await sale(10.01);
  await assert.rejects(confirmSalesOrder(justOver.id, sales), /persetujuan Owner/);
  console.log('[PASS] Discount boundary allows 9.99% and 10%, requires Owner at 10.01%.');

  const draft = await sale(20);
  assert.deepEqual([draft.subtotalNet,draft.projectedCost,draft.subtotalNet-draft.projectedCost,draft.pbjtTax,draft.totalGross],
    [76800,52000,24800,7680,84480]);
  assert.equal(((draft.subtotalNet-draft.projectedCost)/draft.subtotalNet*100).toFixed(2), '32.29');
  for (const actor of [sales, admin]) {
    assert.equal((await tryDecision(actor,draft.id,'APPROVE',draft.version,'Unauthorized role check')).status,403);
    await assert.rejects(documentAction('sales',draft.id,{action:'approve',version:draft.version},actor),/Owner/);
  }
  assert.equal(await prisma.auditLog.count({where:{action:'OPERATION_REJECTED',documentId:`/api/sales/orders/${draft.id}/approve-discount`}}),2);
  assert.equal((await tryDecision(owner,draft.id,'APPROVE',draft.version,'')).status,400);
  assert.equal((await tryDecision(owner,draft.id,'REJECT',draft.version,'Margin di bawah target')).status,200);
  await assert.rejects(confirmSalesOrder(draft.id,sales),/persetujuan Owner/);
  const rejected = await prisma.salesOrder.findUniqueOrThrow({where:{id:draft.id}});
  assert.equal((await tryDecision(owner,draft.id,'APPROVE',rejected.version,'Tanpa revisi','no-revision')).status,409);
  const edited = await updateSalesOrderLine({orderId:draft.id,lineId:draft.lines[0].id,quantity:3,actor:sales});
  assert.equal((await tryDecision(owner,draft.id,'APPROVE',rejected.version,'Versi lama','stale')).status,409);
  const approved = await tryDecision(owner,draft.id,'APPROVE',edited.version,'Margin revisi diterima','latest');
  assert.equal(approved.status,200);
  const {order: decision} = await approved.json();
  assert.equal(decision.discountApprovalStatus,'APPROVED');
  assert.equal(decision.discountApprovalReason,'Margin revisi diterima');
  assert.equal(decision.discountDecisionBy,owner.name);
  assert(Date.parse(decision.discountApprovalAt));
  const retry = await tryDecision(owner,draft.id,'APPROVE',edited.version,'Margin revisi diterima','latest');
  assert.equal((await retry.json()).order.version,decision.version);
  assert.equal((await tryDecision(owner,draft.id,'APPROVE',edited.version,'Isi berbeda','latest')).status,409);
  const revised = await updateSalesOrderLine({orderId:draft.id,lineId:draft.lines[0].id,unitPrice:49000,actor:sales});
  await assert.rejects(confirmSalesOrder(draft.id,sales),/persetujuan Owner/);
  assert.equal((await tryDecision(owner,draft.id,'APPROVE',revised.version,'Harga revisi disetujui','new-price')).status,200);
  assert.equal((await confirmSalesOrder(draft.id,sales)).confirmedOrder.isPriceLocked,true);
  await assert.rejects(updateSalesOrderLine({orderId:draft.id,lineId:draft.lines[0].id,unitPrice:50000,actor:sales}),/dikunci/);
  assert.equal(await prisma.auditLog.count({where:{documentId:draft.orderNumber,actorId:owner.id,action:'APPROVE_DISCOUNT'}}),2);
  console.log('[PASS] Owner-only, approved/rejected reason and identity, version checks, price lock, and idempotent decision.');

  const old = await sale(20);
  await prisma.salesOrder.update({where:{id:old.id},data:{discountApproved:true,discountApprovedBy:admin.name}});
  await assert.rejects(confirmSalesOrder(old.id,sales),/persetujuan Owner/);
  const headers = { authorization: 'Bearer ' + await createSessionToken(warehouse) };
  const read = await readOrder(new NextRequest(`http://localhost:3107/api/sales/orders/${draft.id}`, {headers}), {params:Promise.resolve({id:draft.id})});
  assert.equal(read.status,200);
  const details = (await read.json()).order;
  assert(!('projectedCost' in details));
  assert(details.lines.every((line: any) => !('standardCost' in line) && !('standardCost' in line.product)));
  console.log('[PASS] Legacy draft without Owner evidence needs approval. Warehouse quotation responses omit projected cost.');

  await prisma.vendorPrice.create({data:{vendorId:'V03',productSku:'COF-LATT-HOT',minimumQty:10,currency:'IDR',price:11500}});
  const rfq = await createPurchaseQuotation({vendorId:'V03',lines:[{productSku:'COF-LATT-HOT',orderedQty:10}],actor:procurement});
  assert.equal(rfq.lines[0].unitPrice,11500);
  const newVendor = await documentAction('purchase',rfq.id,{action:'edit',version:rfq.version,vendorId:'V01',
    lines:[{productSku:'RICE-CHICK-S',orderedQty:2}]},procurement);
  assert.equal(newVendor.record.lines[0].unitPrice,26000);
  const fallback = await createPurchaseQuotation({vendorId:'V01',lines:[{productSku:'COF-LATT-HOT',orderedQty:1}],actor:procurement});
  assert.equal(fallback.lines[0].unitPrice,12000);
  const agreement = await createPurchaseQuotation({vendorId:'V03',lines:[{productSku:'COF-LATT-HOT',orderedQty:10,unitPrice:12000}],actor:procurement});
  const po = await confirmPurchaseOrder(agreement.id,procurement);
  await validateGoodsReceipt({receiptId:po.receipt!.id,items:[{lineId:po.receipt!.lines[0].id,productSku:'COF-LATT-HOT',acceptedQty:8,rejectedQty:2,rejectionReason:'Kemasan rusak'}],actor:warehouse});
  await prisma.vendorPrice.updateMany({where:{vendorId:'V03',productSku:'COF-LATT-HOT'},data:{price:15500}});
  const bill = await createVendorBill({purchaseOrderId:agreement.id,lines:[{productSku:'COF-LATT-HOT',quantity:8}],actor:finance});
  assert.equal(bill.totalGross,96000);
  console.log('[PASS] RFQ applies vendor, SKU and tier; draft reprices; fallback works; agreed PO price controls Vendor Bill.');

  assert.throws(() => resolveDbFilePath(path.join(cwd,'missing-tenant', 'erp.db')), /Tidak beralih/);
  assert.equal(resolveDbFilePath('file:./erp.db'),realpathSync(path.join(cwd,'prisma/erp.db')));
  console.log('[PASS] Missing tenant database path is refused without a basename fallback.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
