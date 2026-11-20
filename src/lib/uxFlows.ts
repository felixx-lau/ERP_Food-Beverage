import { invoiceChoices } from './invoiceChoices';
import { vendorBillChoices } from './vendorBillChoices';

/** Presentation decisions shared by contact navigation and document handoffs. */
export function contactView(value: string | null, role: string, initial = 'customers') {
  if (value === 'customers' || value === 'vendors') return value;
  return role === 'PROCUREMENT' ? 'vendors' : initial;
}

const warehouseRoles = ['HEAD_ADMIN', 'WAREHOUSE'];
const financeRoles = ['HEAD_ADMIN', 'FINANCE'];
export type NextStep = { owner?: string; text: string; href?: string; label?: string; roles?: string[] };
const documentUrl = (path: string, id?: string) => id ? `${path}?id=${encodeURIComponent(id)}` : path;

function describeQuantities(lines: { productSku: string; quantity: number }[]) {
  return lines.map(line => `${line.productSku} × ${line.quantity.toLocaleString('id-ID')}`).join(', ');
}

export function documentNextSteps(kind: string, record: any): NextStep[] {
  if (record.status === 'CANCELLED') return [];
  if (['invoices', 'bills'].includes(kind) && record.isPosted) {
    return record.outstandingAmount > 0
      ? [{ owner: 'Finance', text: 'Tagihan tercatat di pembukuan dan masih memiliki sisa pembayaran.', href: '/accounting/payments', label: 'Buka pembayaran', roles: financeRoles }]
      : [{ text: 'Tagihan lunas. Riwayat pembayaran tersedia untuk diperiksa.' }];
  }
  if (kind === 'sales' && record.status === 'DRAFT' && record.discountPercent > 10 && !record.discountApproved) {
    return [{ owner: 'Owner atau Head Admin', text: 'Diskon di atas 10% perlu disetujui. Setelah itu, Sales dapat mengonfirmasi pesanan.' }];
  }
  if (['sales', 'purchase'].includes(kind) && ['CONFIRMED', 'DONE'].includes(record.status)) {
    const sales = kind === 'sales';
    const stockPath = sales ? '/inventory/delivery' : '/inventory/receipts';
    const billingPath = sales ? '/accounting/invoices' : '/accounting/vendor-bills';
    const billingParam = sales ? 'salesOrderId' : 'purchaseOrderId';
    const stockDocuments = (sales ? record.deliveryOrders : record.receipts) ?? [];
    const bills: {id: string; status: string; isPosted: boolean; outstandingAmount: number; invoiceNumber?: string; billNumber?: string}[] =
      (sales ? record.invoices : record.bills) ?? [];
    const remaining = (record.lines ?? []).map((line: any) => ({
      productSku: line.productSku,
      quantity: sales ? line.quantity - line.deliveredQty : line.orderedQty - line.receivedQty,
    })).filter((line: {quantity: number}) => line.quantity > 0);
    const billable = (sales ? invoiceChoices(record) : vendorBillChoices(record))
      .filter(line => line.billable > 0).map(line => ({ productSku: line.productSku, quantity: line.billable }));
    const steps: NextStep[] = [];

    if (record.status === 'CONFIRMED' && (remaining.length || !record.lines?.length)) {
      const active = stockDocuments.find((doc: {status: string}) => ['DRAFT', 'CONFIRMED'].includes(doc.status));
      const verb = sales ? 'Kirim sisa pesanan' : 'Periksa dan terima sisa pesanan';
      steps.push({
        owner: 'Gudang',
        text: remaining.length ? `${verb} (${describeQuantities(remaining)}).` : `${verb} saat barang siap diproses.`,
        href: documentUrl(stockPath, active?.id),
        label: sales ? 'Buka pengiriman' : 'Buka penerimaan',
        roles: warehouseRoles,
      });
    }
    if (record.status === 'CONFIRMED' && billable.length) {
      steps.push({
        owner: 'Finance',
        text: `Buat tagihan untuk barang yang sudah ${sales ? 'dikirim' : 'lolos inspeksi'} dan belum masuk tagihan (${describeQuantities(billable)}).`,
        href: record.id ? `${billingPath}?${billingParam}=${encodeURIComponent(record.id)}` : billingPath,
        label: 'Buat draft tagihan',
        roles: financeRoles,
      });
    }
    for (const draft of bills.filter(bill => bill.status === 'DRAFT' && !bill.isPosted)) {
      steps.push({
        owner: 'Finance',
        text: `Periksa draft ${draft.invoiceNumber || draft.billNumber || 'tagihan'} sebelum posting.`,
        href: documentUrl(billingPath, draft.id),
        label: 'Buka draft tagihan',
        roles: financeRoles,
      });
    }
    if (bills.some(bill => bill.isPosted && bill.status !== 'CANCELLED' && bill.outstandingAmount > 0)) {
      steps.push({ owner: 'Finance', text: 'Catat pembayaran untuk tagihan yang sudah diposting dan masih memiliki sisa.', href: '/accounting/payments', label: 'Buka pembayaran', roles: financeRoles });
    }
    if (steps.length) return steps;
    if (record.lines?.length && !remaining.length && bills.some(bill => bill.isPosted && bill.status !== 'CANCELLED')) {
      return [{ text: 'Barang sudah dipenuhi dan tagihan terkait lunas.' }];
    }
  }
  if (kind === 'deliveries' && record.status === 'DONE') {
    return [{ owner: 'Finance', text: 'Periksa jumlah barang yang sudah dikirim dan masih dapat ditagih.', href: '/accounting/invoices', label: 'Buka tagihan pelanggan', roles: [...financeRoles, 'SALES'] }];
  }
  if (kind === 'receipts' && record.status === 'DONE') {
    return [{ owner: 'Finance', text: 'Cocokkan pesanan dan barang yang diterima dengan tagihan vendor.', href: '/accounting/vendor-bills', label: 'Buka tagihan vendor', roles: financeRoles }];
  }
  return [];
}

export function discountApprovalLabel(order: {
  discountPercent: number;
  discountApproved: boolean;
  discountApprovedBy?: string | null;
  discountApprovalRole?: string | null;
}) {
  if (order.discountPercent <= 10) return 'Tidak memerlukan persetujuan tambahan';
  if (!order.discountApproved) return 'Menunggu persetujuan Owner atau Head Admin';
  const role = order.discountApprovalRole === 'HEAD_ADMIN' ? 'Head Admin' : order.discountApprovalRole === 'OWNER' ? 'Owner' : '';
  const approver = [order.discountApprovedBy, role].filter(Boolean).join(' · ');
  return approver ? `Disetujui oleh ${approver}` : 'Diskon disetujui';
}

export function canCancelDocument(kind: string, record: any) {
  if (kind === 'sales') return !(record.lines || []).some((line: any) => line.deliveredQty > 0) && !(record.invoices || []).some((doc: any) => doc.status !== 'CANCELLED');
  if (kind === 'purchase') return !(record.lines || []).some((line: any) => line.receivedQty > 0) && !(record.bills || []).some((doc: any) => doc.status !== 'CANCELLED');
  return true;
}
