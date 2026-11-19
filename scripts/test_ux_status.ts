import assert from 'node:assert/strict';
import { test } from 'node:test';
import { invoicePaymentStatus, statusLabel } from '../src/lib/statusLabels';

test('payment status comes from posted balances, never from an absent paymentStatus field', () => {
  assert.equal(invoicePaymentStatus({ status: 'POSTED', isPosted: true, outstandingAmount: 100, paidAmount: 0 }), 'UNPAID');
  assert.equal(invoicePaymentStatus({ status: 'POSTED', isPosted: true, outstandingAmount: 50, paidAmount: 50 }), 'PARTIAL');
  assert.equal(invoicePaymentStatus({ status: 'PAID', isPosted: true, outstandingAmount: 0, paidAmount: 100 }), 'PAID');
  assert.equal(invoicePaymentStatus({ status: 'DRAFT', isPosted: false, outstandingAmount: 0 }), null);
  assert.equal(invoicePaymentStatus({ status: 'CANCELLED', isPosted: true, outstandingAmount: 0 }), null);
});
test('status translation keeps unknown statuses legible', () => {
  assert.equal(statusLabel('POSTED'), 'Tercatat di pembukuan');
  assert.equal(statusLabel('CUSTOM_STATUS'), 'CUSTOM_STATUS');
  assert.equal(statusLabel(''), '—');
});
