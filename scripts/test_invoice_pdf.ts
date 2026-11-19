import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createInvoicePdf, invoicePdfFilename } from '../src/lib/invoicePdf';
import { chatConnectionMessage } from '../src/lib/chatbot';

type Invoice = Parameters<typeof createInvoicePdf>[0];
const invoice = {
  invoiceNumber: 'INV/2026/TEST', invoiceDate: new Date('2026-11-17T00:00:00Z'), dueDate: null,
  status: 'POSTED', isPosted: true, subtotalNet: 45000, pbjtTax: 4500, totalGross: 49500, paidAmount: 10000, outstandingAmount: 39500,
  customer: { name: 'Pelanggan Pengujian', address: 'Jl. Pengujian No. 10', city: 'Jakarta', email: '', phone: '' },
  salesOrder: { orderNumber: 'SO/2026/TEST' },
  lines: [{ product: { name: 'Kopi Susu' }, productSku: 'KOPI-TEST', quantity: 2, unitPrice: 25000, discountPercent: 10, netPrice: 45000, pbjtAmount: 4500, totalAmount: 49500 }],
} as Invoice;
const company = { name: 'PT Contoh Pengujian', brand: 'Dapur Contoh', city: 'Jakarta', address: 'Jl. Contoh No. 1' };
const output = mkdtempSync(join(tmpdir(), 'aruna-invoice-pdf-'));
function render(name: string, data: Invoice) {
  const pdf = createInvoicePdf(data, company);
  const path = join(output, name + '.pdf');
  writeFileSync(path, Buffer.from(pdf.output('arraybuffer')));
  execFileSync('pdftotext', ['-layout', path, path + '.txt']);
  return { pdf, text: readFileSync(path + '.txt', 'utf8') };
}

test('PDF preserves saved discounts, taxes, partial payment and customer/company identity', () => {
  const { pdf, text } = render('invoice', invoice);
  assert.equal(pdf.getNumberOfPages(), 1);
  for (const value of ['PT Contoh Pengujian', 'Pelanggan Pengujian', 'KOPI-TEST', '10%', 'Rp 45.000', 'Rp 4.500', 'Rp 49.500', 'Rp 10.000', 'Rp 39.500', 'DIBAYAR SEBAGIAN']) assert(text.includes(value), value);
  for (const label of ['No', 'SKU', 'Produk', 'Qty', 'Harga', 'Disc', 'Subtotal (DPP)', 'Dibuat oleh', 'Disetujui oleh', 'Diterima pelanggan']) assert(text.includes(label), label);
  assert(!text.includes('undefined'));
});

test('long invoices repeat table headings and keep every line and the final summary', () => {
  const long = { ...invoice, lines: Array.from({ length: 85 }, (_, i) => ({ ...invoice.lines[0], productSku: `ITEM-${String(i + 1).padStart(3, '0')}`, product: { ...invoice.lines[0].product, name: 'Produk dengan deskripsi panjang untuk pemeriksaan pembungkusan teks pada beberapa baris' } })) };
  const { pdf, text } = render('invoice-many-pages', long);
  assert(pdf.getNumberOfPages() > 1);
  for (let i = 1; i <= 85; i++) assert(text.includes(`ITEM-${String(i).padStart(3, '0')}`));
  assert(text.includes('TOTAL TAGIHAN'));
  assert(text.includes(`Halaman ${pdf.getNumberOfPages()} / ${pdf.getNumberOfPages()}`));
  assert((text.match(/Subtotal/g) || []).length > 1);
});

test('draft and cancelled invoices are visibly distinguished', () => {
  assert(render('invoice-draft', { ...invoice, status: 'DRAFT', isPosted: false }).text.includes('DRAFT - BELUM DIPOSTING'));
  const cancelled = render('invoice-cancelled', { ...invoice, status: 'CANCELLED' }).text;
  assert(cancelled.includes('DIBATALKAN'));
  assert(cancelled.includes('tidak berlaku untuk penagihan'));
  assert.equal(invoicePdfFilename('INV/2026/0007\r\n"'), 'Invoice-INV-2026-0007---.pdf');
});

test('offline local AI explains how to restart without misdiagnosing other failures', () => {
  assert(chatConnectionMessage('http://127.0.0.1:7870/api/v1/run/flow', { cause: { code: 'ECONNREFUSED' } }).includes('Mulai Asisten ERP.command'));
  assert(!chatConnectionMessage('https://example.com/run', { cause: { code: 'ECONNREFUSED' } }).includes('lokal'));
  assert(!chatConnectionMessage('http://127.0.0.1:7870/run', { cause: { code: 'ECONNRESET' } }).includes('belum aktif'));
});
console.log('PDF fixtures:', output);
