'use client';

import { useState } from 'react';
import Link from 'next/link';
import DialogFrame from './ui/DialogFrame';
import { useCompany } from '@/context/CompanyContext';
import { publishDataRefresh } from './ui/useDataRefresh';

type SupplierOrder = {
  id: string;
  poNumber: string;
  version: number;
  status: string;
  scheduledDate: string;
  total: number;
  sentAt?: string | null;
  sentTo?: string | null;
  purchaseRequest: { id: string; number: string; locationCode: string };
  vendor: { name: string; email?: string | null; paymentTerms: string };
  lines: { productSku: string; orderedQty: number; unitPrice: number; product: { name: string; unit: string } }[];
};

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
const formatDate = (value: string) => new Date(value).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });

export default function PurchaseOrderDispatch({ order, role, onChanged }: {
  order: SupplierOrder;
  role?: string;
  onChanged: () => Promise<void>;
}) {
  const { activeCompany } = useCompany();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = order.purchaseRequest;
  const recipient = order.vendor.email?.trim() ?? '';
  const canDispatch = ['HEAD_ADMIN', 'PROCUREMENT'].includes(role ?? '') && ['CONFIRMED','DONE'].includes(order.status);
  const companyName = activeCompany?.name || 'Rasa Aruna';
  const subject = `Purchase Order ${order.poNumber} — ${companyName}`;
  const body = [
    `Yth. ${order.vendor.name},`, '',
    `Berikut pesanan pembelian ${order.poNumber} dari ${companyName}.`, '',
    ...order.lines.map(line => `${line.productSku} · ${line.product.name}: ${line.orderedQty} ${line.product.unit} × ${rupiah.format(line.unitPrice)}`),
    '', `Total: ${rupiah.format(order.total)}`,
    `Lokasi penerimaan: ${request.locationCode}`,
    `Tanggal penerimaan yang direncanakan: ${formatDate(order.scheduledDate)}`,
    `Termin pembayaran: ${order.vendor.paymentTerms}`, '',
    'Mohon balas untuk mengonfirmasi ketersediaan dan jadwal pengiriman.', '',
    `Terima kasih,\n${companyName}`,
  ].join('\r\n');

  async function recordDispatch() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/workflow/purchase/${encodeURIComponent(order.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `dispatch-${order.version}` },
        body: JSON.stringify({ action: 'recordSent', version: order.version, recipient }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Pengiriman gagal dicatat.');
      setConfirming(false);
      publishDataRefresh();
      await onChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Pengiriman gagal dicatat.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="surface-card p-5 space-y-3">
    <h2 className="font-semibold">Pengiriman PO ke pemasok</h2>
    <p className="text-sm">Pengajuan <Link className="font-semibold text-indigo-700 underline" href={`/operations/purchase?id=${encodeURIComponent(request.id)}`}>{request.number}</Link> · Lokasi {request.locationCode}</p>
    {order.sentAt ? <p className="text-sm font-medium text-emerald-800">Pengiriman dicatat pada {formatDate(order.sentAt)} ke {order.sentTo}.</p>
      : canDispatch && (recipient
        ? <>
          <p className="text-sm text-slate-600">Buka draf yang sudah memuat rincian PO, kirim melalui aplikasi email, lalu catat pengirimannya di ERP.</p>
          <div className="flex flex-wrap gap-2">
            <a className="btn-primary" href={`mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>Buka draf email</a>
            <button className="btn-secondary" onClick={() => { setError(''); setConfirming(true); }}>Catat sudah dikirim</button>
          </div>
        </>
        : <p className="text-sm">Isi email pemasok di <Link className="text-indigo-700 underline" href="/sales/contacts?type=vendors">Data pemasok</Link>, lalu muat ulang PO.</p>)}
    {confirming && <DialogFrame label="Catat pengiriman PO" onClose={() => !busy && setConfirming(false)}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
        <h3 className="font-semibold">Catat pengiriman {order.poNumber}?</h3>
        <p className="text-sm">Lanjutkan setelah PO dikirim ke {recipient} melalui aplikasi email.</p>
        {error && <p className="text-sm text-rose-800" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>Batal</button>
          <button className="btn-primary" disabled={busy} onClick={() => void recordDispatch()}>{busy ? 'Menyimpan…' : 'Simpan catatan'}</button>
        </div>
      </div>
    </DialogFrame>}
  </section>;
}
