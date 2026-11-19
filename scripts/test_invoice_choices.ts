import assert from 'node:assert/strict';
import { test } from 'node:test';
import { invoiceChoices, validInvoiceQuantities } from '../src/lib/invoiceChoices';
test('draft invoices consume billable quantity, cancelled invoices do not', () => {
 const lines = invoiceChoices({lines:[{productSku:'A',quantity:8,deliveredQty:5}],invoices:[{status:'DRAFT',lines:[{productSku:'A',quantity:2}]},{status:'CANCELLED',lines:[{productSku:'A',quantity:3}]}]});
 assert.equal(lines[0].billable,3);
 assert(validInvoiceQuantities(lines,{}));
 for(const q of [-1,0,3.5,4,NaN]) assert(!validInvoiceQuantities(lines,{A:q}));
 assert(validInvoiceQuantities(lines,{A:1}));
});
test('undelivered or already fully invoiced orders cannot be submitted', () => {
 const lines = invoiceChoices({lines:[{productSku:'A',quantity:8,deliveredQty:0}]});
 assert.equal(lines[0].billable,0);assert(!validInvoiceQuantities(lines,{}));
 assert(!validInvoiceQuantities(invoiceChoices(),{}));
});
