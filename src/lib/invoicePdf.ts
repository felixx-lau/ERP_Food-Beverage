import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { Prisma } from '@prisma/client';
import type { Company } from './companyManager';

type Invoice = Prisma.CustomerInvoiceGetPayload<{ include: { customer: true; salesOrder: true; lines: { include: { product: true } } } }>;
const number = (value: number) => value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
const money = (value: number) => `Rp ${number(value)}`;
const date = (value: Date | null) => value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-';

/** Uses persisted invoice amounts, including discounts, rather than recalculating tax. */
export function createInvoicePdf(invoice: Invoice, company: Pick<Company, 'name' | 'brand' | 'address' | 'city'>) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm', compress: true });
  const margin = 18;
  const right = 192;
  const width = right - margin;
  const bottom = 275;
  const status = invoice.status === 'CANCELLED' ? 'DIBATALKAN' : !invoice.isPosted ? 'DRAFT - BELUM DIPOSTING' : invoice.outstandingAmount <= 0 ? 'LUNAS' : invoice.paidAmount > 0 ? 'DIBAYAR SEBAGIAN' : 'BELUM LUNAS';
  doc.setProperties({ title: `Invoice ${invoice.invoiceNumber}`, author: company.name, subject: 'Faktur pelanggan' });
  doc.setTextColor(20);
  doc.setDrawColor(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const companyHeading = doc.splitTextToSize(company.name, 108) as string[];
  doc.text(companyHeading, margin, 23);
  doc.setFontSize(17);
  doc.text('INVOICE', right, 23, { align: 'right' });
  doc.setFontSize(8);
  const invoiceHeading = doc.splitTextToSize(invoice.invoiceNumber, 58) as string[];
  doc.text(invoiceHeading, right, 28, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const companyDetails = doc.splitTextToSize([company.brand, company.address, company.city].filter(Boolean).join(' | '), 108) as string[];
  const detailY = 23 + companyHeading.length * 5;
  doc.text(companyDetails, margin, detailY);
  const ruleY = Math.max(detailY + companyDetails.length * 4, 28 + invoiceHeading.length * 4) + 3;
  doc.setLineWidth(0.5);
  doc.line(margin, ruleY, right, ruleY);

  let customerEnd = ruleY;
  autoTable(doc, {
    startY: ruleY + 3, margin: { left: margin, right: 105, top: 18, bottom: 22 }, tableWidth: 87,
    theme: 'plain', styles: { fontSize: 9, cellPadding: 0.6, textColor: 20, overflow: 'linebreak' },
    body: [
      [{ content: 'Pelanggan', styles: { fontStyle: 'bold' } }],
      [invoice.customer.name],
      ...[invoice.customer.address, invoice.customer.city, invoice.customer.email, invoice.customer.phone].filter(Boolean).map(value => [value!]),
    ],
    didDrawPage: ({ cursor }) => { customerEnd = cursor?.y ?? customerEnd; },
  });
  let endY = ruleY;
  autoTable(doc, {
    startY: ruleY + 3, margin: { left: 109, right: margin, top: 18, bottom: 22 }, tableWidth: 83,
    theme: 'plain', styles: { fontSize: 8.5, cellPadding: 0.8, textColor: 20, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 23, textColor: 90 }, 1: { cellWidth: 3 }, 2: { cellWidth: 57 } },
    body: [
      ['Tanggal', ':', date(invoice.invoiceDate)],
      ['Status', ':', status],
      ['Sales order', ':', invoice.salesOrder.orderNumber],
      ['Jatuh tempo', ':', date(invoice.dueDate)],
    ],
    didDrawPage: ({ cursor }) => { endY = cursor?.y ?? endY; },
  });

  autoTable(doc, {
    startY: Math.max(customerEnd, endY) + 7, margin: { left: margin, right: margin, top: 18, bottom: 22 },
    theme: 'grid', rowPageBreak: 'avoid', showHead: 'everyPage',
    styles: { fontSize: 8.5, cellPadding: 1.8, textColor: 20, lineColor: 30, lineWidth: 0.25, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [255, 255, 255], textColor: 20, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: 25 }, 2: { cellWidth: 60 },
      3: { cellWidth: 12, halign: 'right' }, 4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 14, halign: 'right' }, 6: { cellWidth: 29, halign: 'right' },
    },
    head: [['No', 'SKU', 'Produk', 'Qty', 'Harga', 'Disc', 'Subtotal']],
    body: invoice.lines.map((line, index) => [
      String(index + 1), line.productSku, line.product.name, number(line.quantity), money(line.unitPrice), `${number(line.discountPercent)}%`, money(line.netPrice),
    ]),
    didDrawPage: ({ cursor }) => { endY = cursor?.y ?? endY; },
  });

  // Keep totals, signatures and the document note together on the final page.
  const note = invoice.status === 'CANCELLED' ? 'Invoice ini telah dibatalkan dan tidak berlaku untuk penagihan.' : !invoice.isPosted ? 'Dokumen draft untuk pemeriksaan. Invoice ini belum diposting.' : 'Dokumen ini menampilkan status dan saldo invoice saat PDF diunduh.';
  doc.setFontSize(8);
  const noteLines = doc.splitTextToSize(note, width) as string[];
  const signatureNames = ['Sales', 'Manajer', invoice.customer.name].map(name => doc.splitTextToSize(name, 48) as string[]);
  const signatureHeight = Math.max(...signatureNames.map(lines => lines.length)) * 4;
  if (endY + 93 + signatureHeight + noteLines.length * 3.5 > bottom) { doc.addPage(); endY = 18; }
  autoTable(doc, {
    startY: endY + 3, margin: { left: 113, right: margin, top: 18, bottom: 22 }, tableWidth: 79,
    theme: 'plain', pageBreak: 'avoid', styles: { fontSize: 9, cellPadding: 1.3, textColor: 20 },
    columnStyles: { 0: { cellWidth: 43 }, 1: { cellWidth: 36, halign: 'right' } },
    body: [
      ['Subtotal (DPP)', money(invoice.subtotalNet)],
      ['PBJT', money(invoice.pbjtTax)],
      [{ content: 'TOTAL TAGIHAN', styles: { fontStyle: 'bold', lineWidth: { top: 0.4 }, lineColor: 20 } }, { content: money(invoice.totalGross), styles: { fontStyle: 'bold', lineWidth: { top: 0.4 }, lineColor: 20 } }],
      ['Sudah dibayar', money(invoice.paidAmount)],
      ['Sisa piutang', money(invoice.outstandingAmount)],
    ],
    didDrawPage: ({ cursor }) => { endY = cursor?.y ?? endY; },
  });
  const signatureY = endY + 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  [44, 105, 166].forEach((center, index) => {
    doc.text(['Dibuat oleh', 'Disetujui oleh', 'Diterima pelanggan'][index], center, signatureY, { align: 'center' });
    doc.setLineWidth(0.25);
    doc.line(center - 16, signatureY + 19, center + 16, signatureY + 19);
    doc.text(signatureNames[index], center, signatureY + 24, { align: 'center' });
  });
  doc.setFontSize(8);
  doc.text(noteLines, margin, signatureY + 31 + signatureHeight);
  const footerY = signatureY + 36 + signatureHeight + noteLines.length * 3.5;
  const pages = doc.getNumberOfPages();
  const printedAt = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const y = page === pages ? footerY : 281;
    doc.setDrawColor(170);
    doc.setLineWidth(0.2);
    doc.line(margin, y, right, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`Dicetak pada ${printedAt} | Dokumen dihasilkan oleh sistem ERP.`, margin, y + 4);
    doc.text(`Halaman ${page} / ${pages}`, right, y + 4, { align: 'right' });
  }
  return doc;
}

export function invoicePdfFilename(invoiceNumber: string) {
  return `Invoice-${invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100)}.pdf`;
}
