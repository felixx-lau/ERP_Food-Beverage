'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight, CircleCheck, ClipboardList, FileClock, FilePenLine,
  PackageCheck, PackageSearch, ReceiptText, RefreshCw, ScanLine,
  ShieldCheck, Target, Truck, type LucideIcon,
} from 'lucide-react';
import { NAVIGATION_GROUPS } from './Sidebar';
import useDataRefresh from './ui/useDataRefresh';
import type { WorkItem } from '@/lib/operationalOverview';

const categories: Record<string, { label: string; department: string; icon: LucideIcon; href: string; action: string }> = {
  deliveries: { label: 'Pengiriman menunggu', department: 'Gudang · Sales', icon: Truck, href: '/inventory/delivery', action: 'Lihat pengiriman' },
  receipts: { label: 'Penerimaan menunggu', department: 'Purchase · Gudang', icon: PackageCheck, href: '/inventory/receipts', action: 'Lihat penerimaan' },
  overdueInvoices: { label: 'Invoice lewat tempo', department: 'Finance · Sales', icon: FileClock, href: '/accounting/invoices', action: 'Periksa tagihan' },
  discountApprovals: { label: 'Persetujuan diskon', department: 'Sales · Head Admin', icon: ShieldCheck, href: '/sales/orders', action: 'Tinjau penjualan' },
  lowStockLocations: { label: 'Stok rendah per lokasi', department: 'Inventory', icon: PackageSearch, href: '/inventory/products?lowStock=1', action: 'Periksa persediaan' },
  openSessions: { label: 'Sesi kasir aktif', department: 'Point of Sale', icon: ScanLine, href: '/pos', action: 'Buka kasir' },
  uninvoicedLines: { label: 'Barang terkirim belum ditagih', department: 'Sales · Finance', icon: ReceiptText, href: '/sales/orders', action: 'Tinjau penjualan' },
  draftInvoices: { label: 'Invoice draft menunggu', department: 'Invoicing', icon: FilePenLine, href: '/accounting/invoices', action: 'Periksa draft invoice' },
};

type Overview = { asOf: string; role: string; counts: Record<string, number>; tasks: WorkItem[] };

export default function OperationalOverview({ identity }: { identity: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [showAllCounts, setShowAllCounts] = useState(false);

  const load = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch('/api/operations', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Prioritas belum tersedia.');
      setData(result);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Koneksi terputus.');
    } finally {
      if (manual) setRefreshing(false);
    }
  };

  useEffect(() => { setData(null); void load(); }, [identity]);
  useDataRefresh(load);

  const allowed = (href: string) => NAVIGATION_GROUPS.some(g => g.items.some(i => i.href === href.split('?')[0] && i.roles.includes(data?.role || '')));
  const visibleTasks = data?.tasks.filter(t => allowed(t.href) && (!urgentOnly || t.priority === 'HIGH')) || [];

  return (
    <section className="surface-card p-5 sm:p-6 space-y-5" aria-label="Prioritas operasional">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700"><Target className="w-4 h-4" aria-hidden="true" />Fokus pekerjaan</p>
          <h2 className="text-xl font-semibold text-slate-900 mt-1">Yang perlu ditindaklanjuti</h2>
          <p className="text-sm text-slate-600 mt-1">Dahulukan pekerjaan yang masih menunggu. Buka kartu untuk melihat rinciannya.</p>
        </div>
        <button onClick={() => void load(true)} disabled={refreshing} className="btn-secondary" aria-label="Perbarui prioritas" aria-busy={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />{refreshing ? 'Memperbarui…' : 'Perbarui'}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-rose-800 bg-rose-50 p-3 rounded-xl">{error}{data ? ' Data terakhir tetap ditampilkan.' : ''}</p>}
      {!data && !error ? <p role="status" className="text-sm text-slate-600">Memuat prioritas pekerjaan…</p> : data && <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {Object.entries(data.counts).filter(([key]) => categories[key] && allowed(key === 'lowStockLocations' && data.role === 'CASHIER' ? '/pos' : categories[key].href)).filter(([,value]) => showAllCounts || value > 0).sort((a, b) => Number(b[1] > 0) - Number(a[1] > 0)).map(([key, value]) => {
            const category = categories[key] || { label: key, department: 'Operasional', icon: ClipboardList, href: '/', action: 'Buka ruang kerja' };
            const Icon = category.icon;
            const isCashierStock = key === 'lowStockLocations' && data.role === 'CASHIER';
            const action = isCashierStock ? 'Periksa stok kasir' : category.action;
            return (
              <Link key={key} href={isCashierStock ? '/pos' : category.href} prefetch={false} data-available="true"
                aria-label={`${category.label}: ${value.toLocaleString('id-ID')}. ${action}`}
                className="brand-card module-card group relative overflow-hidden flex flex-col min-w-0 p-3.5 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none">
                <div className="flex items-start gap-3 mb-3">
                  <span className="module-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><Icon className="w-4 h-4" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <span className="text-2xl font-semibold tracking-tight tabular-nums leading-none">{value.toLocaleString('id-ID')}</span>
                    <h3 className="text-xs font-medium mt-1 leading-4">{category.label}</h3>
                    {value === 0 && <span className="text-[10px] text-slate-600">Tidak ada antrean</span>}
                  </div>
                </div>
                <div className="module-footer module-destination flex items-center justify-between gap-2 border-t pt-2 mt-auto text-[11px] font-semibold">
                  <span>{action}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
        <button type="button" className="text-sm text-indigo-700 font-semibold" aria-expanded={showAllCounts} onClick={()=>setShowAllCounts(v=>!v)}>{showAllCounts?'Ringkas kategori tanpa antrean':'Lihat juga kategori tanpa antrean'}</button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Daftar tindak lanjut</h3>
          <button className="text-xs font-semibold rounded-lg px-3 py-2 border border-indigo-200 text-indigo-700" aria-pressed={urgentOnly} onClick={() => { setUrgentOnly(v => !v); setExpanded(false); }}>{urgentOnly ? 'Tampilkan semua prioritas' : 'Prioritas tinggi saja'}</button>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleTasks.slice(0, expanded ? visibleTasks.length : 3).map(t => (
            <Link key={t.id} href={t.href} className="flex items-start gap-3 py-4 rounded-lg hover:bg-indigo-50/60 focus-visible:outline-indigo-600">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.priority === 'HIGH' ? 'bg-amber-500' : 'bg-indigo-500'}`} aria-label={t.priority === 'HIGH' ? 'Prioritas tinggi' : 'Prioritas normal'} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-indigo-700">{t.department}{t.priority === 'HIGH' && <span className="ml-2 text-[10px] rounded-full px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200">Prioritas tinggi</span>}</p>
                <h3 className="text-sm font-semibold text-slate-900 mt-1">{t.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{t.reason}</p>
                {t.dueAt && <p className="text-xs text-slate-600 mt-1">Jadwal / jatuh tempo {new Date(t.dueAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>}
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 shrink-0 mt-1" aria-hidden="true" />
            </Link>
          ))}
          {urgentOnly && !data.tasks.some(t => t.priority === 'HIGH') && <p className="py-4 text-sm text-slate-600">Tidak ada tindak lanjut berprioritas tinggi saat ini.</p>}
          {!urgentOnly && !visibleTasks.length && <p className="flex gap-2 items-center text-sm text-emerald-800 py-4"><CircleCheck className="w-5 h-5" aria-hidden="true" />Tidak ada tindak lanjut terdeteksi dari pemeriksaan saat ini.</p>}
        </div>
        <div className="flex flex-wrap justify-between items-center gap-3 text-xs text-slate-600">
          <span>Diperiksa {new Date(data.asOf).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB · diperbarui setiap 15 detik</span>
          {visibleTasks.length > 3 && <button className="text-sm font-semibold text-indigo-700 min-h-10" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? 'Ringkas daftar' : `Lihat ${visibleTasks.length} tindak lanjut`}</button>}
        </div>
      </>}
    </section>
  );
}
