'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { OperationalMetrics } from '@/lib/dashboardEngine';
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
export default function OperationalMetricsChart({ metrics: m, role }: { metrics: OperationalMetrics; role: string }) {
  const [selected, setSelected] = useState('stock');
  const choices = [
    { key: 'stock', links: role === 'FINANCE' ? ['/accounting/reports#inventory','/accounting/reports#inventory',null] : [m.inventory.sourceLink+'?location=WH-JKT', m.inventory.sourceLink+'?location=CAFE-JKT', m.sales.sourceLink], label: 'Persediaan', unit: 'Unit', labels: ['Gudang', 'Kafe', 'Direservasi'], values: [m.inventory.whUnits, m.inventory.cafeUnits, m.inventory.reservedUnits], note: 'Stok gudang dan kafe adalah stok fisik. Stok direservasi merupakan bagian dari stok fisik.' },
    { key: 'money', links: ['1010','1020','2010','2020'].map(code => '/accounting/journal-entries?account='+code), label: 'Kas, piutang & utang', unit: 'Rupiah', labels: ['Kas & bank', 'Piutang pelanggan', 'Utang vendor', 'PBJT terutang'], values: [m.bank.balance, m.receivables.totalAR, m.payables.totalAP, m.tax.balance], note: 'Saldo berjalan perusahaan; piutang adalah tagihan pelanggan, utang adalah kewajiban kepada vendor.' },
    { key: 'orders', links: role === 'FINANCE' ? [null,null,null] : [m.sales.sourceLink,m.purchase.sourceLink,m.crm.sourceLink], label: 'Pesanan & peluang', unit: 'Jumlah', labels: ['Pesanan penjualan', 'Pesanan pembelian', 'Peluang penjualan'], values: [m.sales.confirmedOrdersCount, m.purchase.confirmedOrdersCount, m.crm.leadsCount], note: 'Jumlah pesanan terkonfirmasi dan peluang penjualan yang tercatat.' },
    { key: 'value', links: ['/accounting/reports#inventory',role === 'FINANCE' ? null : m.pos.sourceLink, role === 'FINANCE' ? null : m.crm.sourceLink], label: 'Nilai bisnis', unit: 'Rupiah', labels: ['Persediaan', 'Penjualan bersih POS', 'Peluang penjualan'], values: [m.inventory.totalValuation, m.pos.revenue, m.crm.leadsValue], note: 'Nilai persediaan memakai biaya standar. Nilai peluang penjualan belum menjadi pendapatan.' },
  ];
  const chart = choices.find(c => c.key === selected)!;
  return <section className="surface-card p-5 sm:p-6 space-y-5">
    <div><h2 className="text-lg font-semibold">Operasional hari ini</h2><p className="text-sm text-slate-500 mt-1">Pilih ringkasan yang ingin dilihat. Angka menunjukkan posisi terkini perusahaan.</p><p className="text-xs text-slate-500 mt-1">{m.metadata.companyName} · {m.metadata.reportingDate}</p></div>
    <div className="flex flex-wrap gap-2" aria-label="Pilihan grafik operasional">{choices.map(c => <button key={c.key} aria-pressed={selected === c.key} onClick={() => setSelected(c.key)} className={selected === c.key ? 'btn-primary' : 'btn-secondary'}>{c.label}</button>)}</div>
    <h3 className="font-semibold">{chart.label} <span className="font-normal text-sm text-slate-500">({chart.unit})</span></h3>
    <div className="h-72 sm:h-80"><Bar key={selected} role="img" aria-label={`${chart.label} dalam ${chart.unit}`} data={{ labels: chart.labels, datasets: [{ label: chart.unit, data: chart.values, backgroundColor: ['#4f46e5', '#0d9488', '#f59e0b', '#e11d48'], borderRadius: 6 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${chart.unit === 'Rupiah' ? 'Rp ' : ''}${Number(ctx.raw).toLocaleString('id-ID')}` } } }, scales: { y: { beginAtZero: true, ticks: chart.unit === 'Jumlah' || chart.unit === 'Unit' ? { precision: 0 } : {} } } }} /></div>
    <p className="text-sm text-slate-500">{chart.note}</p>
    <Link href="/accounting/reports#inventory" className="text-indigo-700 underline">Rekonsiliasi persediaan dan jurnal sumber</Link>
    <details open><summary className="text-sm font-medium cursor-pointer">Lihat angka {chart.label.toLowerCase()}</summary><dl className="mt-3 space-y-2">{chart.labels.map((label, i) => <div key={label} className="flex justify-between gap-4 border-b py-2 text-sm"><dt>{chart.links[i] ? <Link href={chart.links[i]!} className="text-indigo-700 underline">{label}</Link> : label}</dt><dd className="font-semibold">{chart.unit === 'Rupiah' ? 'Rp ' : ''}{chart.values[i].toLocaleString('id-ID')}</dd></div>)}</dl></details>
  </section>;
}
