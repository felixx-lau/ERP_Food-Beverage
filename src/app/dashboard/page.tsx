'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ProfitDashboard from '@/components/ProfitDashboard';
import OperationalMetricsChart from '@/components/OperationalMetricsChart';
import DashboardCharts from '@/components/DashboardCharts';
import type { OperationalMetrics } from '@/lib/dashboardEngine';
export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('profit');
  useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)); }, []);
  async function loadMetrics() {
    setError('');
    try {
      const r = await fetch('/api/dashboard/metrics', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Ringkasan belum tersedia.');
      setMetrics(d.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat ringkasan.'); }
  }
  useEffect(() => { if (user && ['OWNER', 'HEAD_ADMIN', 'FINANCE'].includes(user.role) && view === 'operations') void loadMetrics(); }, [user?.role, view]);
  const owner = user?.role === 'OWNER';
  return <AppLayout currentUser={user} title={owner ? 'Laporan perusahaan' : 'Dashboard eksekutif'} subtitle={owner ? 'Lihat pendapatan, biaya, dan hasil usaha perusahaan Anda.' : 'Pilih laporan untuk melihat kondisi perusahaan dengan lebih mudah.'}>
    {user && <>
      {<div className="flex flex-wrap gap-2" aria-label="Pilihan dashboard">{[['profit', 'Laba / rugi'], ['operations', 'Operasional hari ini'], ['sales', 'Analisis penjualan']].map(([key, label]) => <button key={key} aria-pressed={view === key} onClick={() => setView(key)} className={view === key ? 'btn-primary' : 'btn-secondary'}>{label}</button>)}</div>}
      {(view === 'profit') && <ProfitDashboard />}
      {view === 'operations' && <>{error && <p role="alert" className="text-rose-800">{error}</p>}{metrics ? <OperationalMetricsChart metrics={metrics} role={user.role} /> : !error && <p role="status">Memuat grafik operasional…</p>}<button className="btn-secondary" onClick={() => void loadMetrics()}>Segarkan</button></>}
      {view === 'sales' && <DashboardCharts />}
    </>}
  </AppLayout>;
}
