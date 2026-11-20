import assert from 'node:assert/strict';
import { contactView, documentNextSteps, discountApprovalLabel, canCancelDocument } from '../src/lib/uxFlows';
assert.equal(contactView(null,'PROCUREMENT'),'vendors');
assert.equal(contactView('customers','PROCUREMENT'),'customers');
assert.equal(contactView('vendors','SALES'),'vendors');
assert.equal(contactView('unknown','SALES'),'customers');
const documentNextStep = (kind: string, record: any) => documentNextSteps(kind, record)[0] ?? null;
const draft=documentNextStep('sales',{status:'DRAFT',discountPercent:20,discountApproved:false});
assert(draft?.owner?.includes('Head Admin'));assert(!draft.href);
const confirmed=documentNextStep('sales',{status:'CONFIRMED'});
assert.equal(confirmed?.href,'/inventory/delivery');assert(!confirmed.roles?.includes('SALES'));assert(confirmed.roles?.includes('WAREHOUSE'));
const purchase=documentNextStep('purchase',{status:'CONFIRMED'});
assert.equal(purchase?.href,'/inventory/receipts');assert(!purchase.roles?.includes('PROCUREMENT'));
const shipped=documentNextStep('deliveries',{status:'DONE'});
assert.equal(shipped?.href,'/accounting/invoices');assert(!shipped.roles?.includes('WAREHOUSE'));
const unpaid=documentNextStep('invoices',{status:'POSTED',isPosted:true,outstandingAmount:50000});
assert.equal(unpaid?.href,'/accounting/payments');
assert(!documentNextStep('invoices',{status:'PAID',isPosted:true,outstandingAmount:0})?.href);
assert.equal(documentNextStep('invoices',{status:'CANCELLED',isPosted:true,outstandingAmount:50000}),null);

const fulfilled={status:'CONFIRMED',lines:[{productSku:'A',quantity:2,deliveredQty:2}],invoices:[{status:'POSTED',isPosted:true,outstandingAmount:500,lines:[{productSku:'A',quantity:2}]}]};
assert.equal(documentNextStep('sales',fulfilled)?.href,'/accounting/payments');
assert(!canCancelDocument('sales',fulfilled));
assert.equal(documentNextStep('sales',{...fulfilled,invoices:[{...fulfilled.invoices[0],isPosted:false,status:'DRAFT'}]})?.href,'/accounting/invoices');
assert(!documentNextStep('sales',{...fulfilled,invoices:[{...fulfilled.invoices[0],outstandingAmount:0}]})?.href);
assert.equal(documentNextStep('sales',{...fulfilled,invoices:[]})?.href,'/accounting/invoices');
assert(!canCancelDocument('purchase',{lines:[{receivedQty:1}]}));
const partialSale = {
  id: 'SO-1', status: 'CONFIRMED',
  lines: [{ productSku: 'BOX', quantity: 10, deliveredQty: 6 }],
  deliveryOrders: [{ id: 'sent', status: 'DONE' }, { id: 'backorder', status: 'CONFIRMED' }],
  invoices: [],
};
const saleSteps = documentNextSteps('sales', partialSale);
assert.deepEqual(saleSteps.map(step => step.owner), ['Gudang', 'Finance']);
assert.equal(saleSteps[0].href, '/inventory/delivery?id=backorder');
assert.match(saleSteps[0].text, /BOX × 4/);
assert.equal(saleSteps[1].href, '/accounting/invoices?salesOrderId=SO-1');
assert.match(saleSteps[1].text, /BOX × 6/);
const customerDraft = documentNextSteps('sales', {
  ...partialSale, invoices: [{ id: 'draft-buy', status: 'DRAFT', lines: [{ productSku: 'BOX', quantity: 6 }] }],
});
assert.deepEqual(customerDraft.map(step => step.href), ['/inventory/delivery?id=backorder', '/accounting/invoices?id=draft-buy']);
const partialPurchase = {
  id: 'PO-1', status: 'CONFIRMED',
  lines: [{ productSku: 'BOX', orderedQty: 10, receivedQty: 6 }],
  receipts: [
    { id: 'received', status: 'DONE', lines: [{ productSku: 'BOX', acceptedQty: 6, rejectedQty: 2 }] },
    { id: 'pending', status: 'DRAFT', lines: [{ productSku: 'BOX', acceptedQty: 4 }] },
  ],
  bills: [{ id: 'draft-vendor', status: 'DRAFT', lines: [{ productSku: 'BOX', quantity: 4 }] }],
};
const purchaseSteps = documentNextSteps('purchase', partialPurchase);
assert.deepEqual(purchaseSteps.map(step => step.href), [
  '/inventory/receipts?id=pending', '/accounting/vendor-bills?purchaseOrderId=PO-1', '/accounting/vendor-bills?id=draft-vendor',
]);
assert.match(purchaseSteps[1].text, /BOX × 2/);
assert.equal(discountApprovalLabel({ discountPercent: 20, discountApproved: true, discountApprovedBy: 'Rani', discountApprovalRole: 'HEAD_ADMIN' }), 'Disetujui oleh Rani · Head Admin');
assert.equal(discountApprovalLabel({ discountPercent: 20, discountApproved: true, discountApprovedBy: 'Rani' }), 'Disetujui oleh Rani');
console.log('PASS: contact view persists by URL, Procurement defaults to vendors, approvals and document handoffs follow role and payment state.');
