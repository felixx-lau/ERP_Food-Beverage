import Link from 'next/link';
import { documentNextSteps } from '@/lib/uxFlows';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { statusLabel } from '@/lib/statusLabels';

const draftHints: Record<string, string> = {
  sales: 'Periksa pelanggan, harga, dan jumlah. Konfirmasi pesanan untuk memesan stok dari gudang yang dipilih.',
  purchase: 'Periksa vendor, jumlah, harga, dan jadwal. Konfirmasi untuk membuat rencana penerimaan di gudang tujuan.',
  invoices: 'Periksa barang yang sudah dikirim dan nilai tagihan. Posting untuk mencatat invoice ke pembukuan.',
  bills: 'Cocokkan tagihan dengan pesanan dan penerimaan barang. Posting setelah nilainya sesuai.',
  deliveries: 'Isi jumlah yang benar-benar dikirim. Validasi akan mengurangi stok; sisa jumlah dibuat sebagai pengiriman susulan.',
  receipts: 'Periksa barang yang tiba, lalu isi jumlah diterima dan ditolak. Validasi akan menambah stok yang diterima.',
  transfers: 'Periksa asal, tujuan, dan jumlah barang. Validasi akan memindahkan stok antar lokasi.',
};
export default function DocumentGuidance({ kind, record, role }: { kind: string; record: any; role?:string }) {
  const cancelled = record.status === 'CANCELLED';
  let hint = record.status === 'DRAFT' ? draftHints[kind] : '';
  if (record.status === 'CONFIRMED') hint = kind === 'sales' ? 'Pesanan sudah dikonfirmasi. Tim gudang menyiapkan pengiriman; invoice dibuat setelah barang dikirim.' : kind === 'purchase' ? 'Pesanan sudah dikonfirmasi. Tim gudang memeriksa dan memvalidasi barang saat diterima.' : draftHints[kind];
  if (record.isPosted && !cancelled) hint = record.outstandingAmount > 0 ? 'Dokumen sudah tercatat di pembukuan. Tindak lanjuti sisa tagihan melalui modul Pembayaran.' : 'Dokumen sudah tercatat di pembukuan dan tidak memiliki sisa tagihan.';
  if (cancelled) hint = 'Dokumen dibatalkan. Riwayat tetap tersedia untuk penelusuran.';
  if (record.status === 'DONE') hint = 'Proses dokumen selesai. Periksa dokumen terkait dan riwayat aktivitas untuk menelusuri hasilnya.';
  const steps = documentNextSteps(kind, record);
  if (!hint && !steps.length) return null;
  const number = record.orderNumber || record.poNumber || record.invoiceNumber || record.billNumber || record.deliveryNumber || record.receiptNumber || record.transferNumber;
  return <div className="flex items-start gap-3 text-sm min-w-0">
    {record.status === 'DONE' ? <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" /> : <ArrowRight className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" aria-hidden="true" />}
    <div className="min-w-0">
      <p className="font-semibold text-slate-900 break-words">{number} · {statusLabel(record.status)}</p>
      {steps.length ? <ul className="mt-2 space-y-2">
        {steps.map(step => <li key={step.text + (step.href ?? '')} className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
          {step.owner && <strong className="block text-slate-900">{step.owner}</strong>}
          <span>{step.text}</span>
          {step.href && step.roles?.includes(role ?? '') && <Link className="block w-fit py-2 font-semibold text-indigo-700 underline underline-offset-4" href={step.href}>{step.label}</Link>}
        </li>)}
      </ul> : <p className="mt-1 text-xs leading-relaxed text-slate-600">{hint}</p>}
    </div>
  </div>;
}
