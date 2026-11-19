'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { FinancialReconciliation } from '@/lib/dashboardEngine';

type Inventory = FinancialReconciliation['inventoryReconciliation'];
const currency = new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0});

export default function InventoryReconciliation({inventory}: {inventory:Inventory}) {
  const [simulation, setSimulation] = useState<Inventory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function simulate() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/dashboard/reconciliation?simulatedDiff=1', {cache:'no-store'});
      if (!response.ok) throw new Error();
      const result = await response.json();
      setSimulation(result.data.inventoryReconciliation);
    } catch {
      setError('Simulasi gagal dimuat. Silakan coba kembali.');
    } finally {
      setBusy(false);
    }
  }
  return <section id="inventory" className="surface-card p-5 space-y-3">
    <h2 className="text-lg font-semibold">Rekonsiliasi persediaan · akun 1030</h2>
    <dl className="grid gap-3 sm:grid-cols-3 text-sm">
      <div><dt>Valuasi stok fisik</dt><dd>{currency.format(inventory.physicalValuation)}</dd></div>
      <div><dt>Saldo akun tersimpan</dt><dd>{inventory.cachedBalance === null ? 'Belum tersedia' : currency.format(inventory.cachedBalance)}</dd></div>
      <div><dt>Saldo dari jurnal posted</dt><dd>{currency.format(inventory.ledgerBalance)}</dd></div>
    </dl>
    {inventory.warningMessage && <p role="alert" className="text-amber-900">{inventory.warningMessage}</p>}
    <details><summary className="cursor-pointer">Telusuri sumber persediaan</summary>
      <ul className="mt-2 space-y-1 text-sm">{inventory.sourceTrail.map((item,i)=><li key={i}>{item}</li>)}</ul>
    </details>
    <h3 className="font-medium">Jurnal persediaan terbaru</h3>
    {inventory.postingSources.length ? <ul>{inventory.postingSources.map(j=><li key={j.id}><Link className="text-indigo-700 underline" href={'/accounting/journal-entries?id='+encodeURIComponent(j.id)}>{j.entryNumber} · {j.sourceDocument}</Link></li>)}</ul> : <p>Belum ada jurnal posted untuk akun 1030.</p>}
    <button className="btn-secondary" type="button" disabled={busy} onClick={simulate}>{busy ? 'Menghitung…' : 'Simulasikan selisih +1 unit'}</button>
    {error && <p role="alert">{error}</p>}
    {simulation && <div role="status" className="rounded-lg bg-amber-50 p-3"><strong>Hasil simulasi +1 unit</strong><p>{simulation.warningMessage}</p><p>Stok dan jurnal tetap pada nilai aktual.</p><button className="underline" onClick={()=>setSimulation(null)}>Tutup simulasi</button></div>}
  </section>;
}
