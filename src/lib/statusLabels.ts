/** Presentation labels only; API and stored status codes stay unchanged. */
export const statusLabels: Record<string, string> = {
  DRAFT: 'Draft', QUOTATION: 'Penawaran', CONFIRMED: 'Dikonfirmasi', SALE: 'Penjualan',
  DELIVERED: 'Terkirim', DONE: 'Selesai', CANCELLED: 'Dibatalkan', PAID: 'Lunas',
  PARTIAL: 'Dibayar sebagian', UNPAID: 'Belum dibayar', OVERDUE: 'Lewat jatuh tempo',
  WAITING: 'Menunggu', READY: 'Siap diproses', INSPECTED: 'Sudah diperiksa',
  POSTED: 'Tercatat di pembukuan', OPEN: 'Aktif', CLOSED: 'Ditutup', NEW: 'Baru',
  QUALIFIED: 'Terkualifikasi', PROPOSITION: 'Penawaran', WON: 'Berhasil', LOST: 'Tidak berhasil',
  SCRAP: 'Tidak layak pakai', APPROVED: 'Disetujui', PENDING: 'Menunggu',
};
export const statusLabel = (status: string) => statusLabels[String(status || '').toUpperCase()] || status || '—';
export function invoicePaymentStatus(invoice: { paidAmount?: number; outstandingAmount?: number; isPosted?: boolean; status?: string }) {
  if (invoice.status === 'CANCELLED' || !invoice.isPosted) return null;
  return (invoice.outstandingAmount ?? 0) <= 0 ? 'PAID' : (invoice.paidAmount ?? 0) > 0 ? 'PARTIAL' : 'UNPAID';
}
