'use client';
import { useEffect, useRef, useState } from 'react';
import { businessDate } from '@/lib/businessDate';
import type { FinancialSummary } from '@/lib/financialSummary';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);
const money = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
type Data = { summary: FinancialSummary; trend: { month: string; revenue: number; expenses: number; profit: number }[] };
export default function ProfitDashboard() {
  const [start, setStart] = useState(() => businessDate().slice(0, 7) + '-01');
  const [end, setEnd] = useState(businessDate);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const version = useRef(0);
  async function load() {
    const current = ++version.current;
    setBusy(true); setError(''); setData(null);
    try {
      const response = await fetch('/api/dashboard/profit?' + new URLSearchParams({ start, end }), { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Laporan belum tersedia.');
      if (current === version.current) setData(result);
    } catch (e) { if (current === version.current) setError(e instanceof Error ? e.message : 'Laporan gagal dimuat.'); }
    finally { if (current === version.current) setBusy(false); }
  }
  useEffect(() => { void load(); return () => { version.current++; }; }, []);
  const s = data?.summary;
  return <div className="space-y-6">
    <form onSubmit={e => { e.preventDefault(); void load(); }} className="surface-card p-5 flex flex-wrap gap-4 items-end">
      <label className="text-sm">Dari tanggal<input required type="date" max={end} value={start} onChange={e => setStart(e.target.value)} className="input-glass block mt-2 p-2" /></label>
      <label className="text-sm">Sampai tanggal<input required type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} className="input-glass block mt-2 p-2" /></label>
      <button disabled={busy} className="btn-primary">{busy ? 'Memuat…' : 'Tampilkan laporan'}</button>
    </form>
    {error && <p role="alert" className="bg-rose-50 text-rose-800 p-4 rounded-xl">{error}</p>}
    {busy && <p role="status">Menyiapkan laporan perusahaan…</p>}
    {s && <>
      <section className={`rounded-2xl p-6 border ${!s.journalCount ? 'bg-slate-50 border-slate-200' : s.profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
        <p className="text-sm">{s.period.start} sampai {s.period.end}</p>
        <h2 className="text-xl font-semibold mt-2">{!s.journalCount ? 'Belum ada transaksi tercatat' : s.profit > 0 ? 'Perusahaan memperoleh laba' : s.profit < 0 ? 'Perusahaan mengalami rugi' : 'Pendapatan dan biaya seimbang'}</h2>
        <p className="text-3xl sm:text-4xl font-bold mt-3">{money(s.profit)}</p>
        <p className="text-sm mt-3">Pendapatan bersih dikurangi biaya dan harga pokok penjualan.</p>
      </section>
      <div className="grid sm:grid-cols-2 gap-4">{[['Pendapatan bersih', s.revenue - s.returns], ['Total biaya & HPP', s.expenses]].map(([label, n]) => <div key={String(label)} className="surface-card p-5"><p className="text-sm text-slate-500">{label}</p><strong className="text-2xl block mt-2">{money(Number(n))}</strong></div>)}</div>
      <div className="grid xl:grid-cols-2 gap-6">
        <section className="surface-card p-5"><h2 className="font-semibold mb-5">Pendapatan dan biaya pada periode pilihan</h2><div className="h-72"><Bar role="img" aria-label="Perbandingan pendapatan bersih dan total biaya" data={{ labels: ['Pendapatan bersih', 'Biaya & HPP'], datasets: [{ label: 'Rupiah', data: [s.revenue - s.returns, s.expenses], backgroundColor: ['#4f46e5', '#f59e0b'], borderRadius: 6 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} /></div></section>
        <section className="surface-card p-5"><h2 className="font-semibold">Tren laba/rugi 6 bulan</h2><p className="text-xs text-slate-500 mt-1 mb-4">Sampai {s.period.end}. Bulan terakhir dihitung sampai tanggal akhir pilihan.</p><div className="h-64"><Line role="img" aria-label="Tren laba rugi enam bulan" data={{ labels: data.trend.map(r => r.month), datasets: [{ label: 'Laba / rugi (Rp)', data: data.trend.map(r => r.profit), borderColor: '#4f46e5', backgroundColor: '#4f46e5', tension: 0.2 }] }} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} /></div></section>
      </div>
      <details className="surface-card p-5"><summary className="cursor-pointer font-medium">Lihat angka per bulan</summary><div className="overflow-x-auto mt-4"><table className="w-full text-sm text-left"><thead><tr>{['Bulan', 'Pendapatan bersih', 'Biaya & HPP', 'Laba / rugi'].map(h => <th className="p-2" scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{data.trend.map(r => <tr key={r.month} className="border-t"><td className="p-2">{r.month}</td>{[r.revenue, r.expenses, r.profit].map((n, i) => <td className="p-2" key={i}>{money(n)}</td>)}</tr>)}</tbody></table></div></details>
      <p className="text-xs text-slate-500">Berdasarkan jurnal yang sudah diposting, tanpa saldo pembukaan dan PBJT. Transaksi draft belum dihitung. Laba/rugi berbeda dengan saldo kas.</p>
    </>}
  </div>;
}
