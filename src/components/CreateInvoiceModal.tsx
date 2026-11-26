'use client';
import React, { useEffect, useRef, useState } from 'react';
import DialogFrame from './ui/DialogFrame';
import { invoiceChoices, validInvoiceQuantities } from '@/lib/invoiceChoices';
export default function CreateInvoiceModal({ onClose, onCreated, initialOrderId = '' }: { initialOrderId?: string; onClose: () => void; onCreated: (invoice: any) => void | Promise<void> }) {
  const [orders, setOrders] = useState<any[]>([]), [selected, setSelected] = useState(initialOrderId), [quantities, setQuantities] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const pending = useRef(false), requestKey = useRef(crypto.randomUUID());
  async function load() {
    setLoading(true); setError('');
    try { const r = await fetch('/api/sales/orders', { cache: 'no-store' }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Pesanan gagal dimuat.'); setOrders((d.orders || []).filter((o: any) => o.status === 'CONFIRMED')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Koneksi terputus. Coba muat ulang.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const order = orders.find(o => o.id === selected), lines = invoiceChoices(order);
  const canSave = !!order && validInvoiceQuantities(lines, quantities);
  const close = () => { if (!pending.current && (!selected || window.confirm('Tutup invoice yang belum disimpan?'))) onClose(); };
  async function save() {
    if (pending.current || !canSave) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const chosen = lines.map(l => ({ productSku: l.productSku, quantity: quantities[l.productSku] ?? l.billable })).filter(l => l.quantity > 0);
      const r = await fetch('/api/accounting/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey.current }, body: JSON.stringify({ salesOrderId: selected, lines: chosen }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Invoice gagal disimpan.'); await onCreated(d.invoice);
    } catch (e) { setError(e instanceof Error ? e.message : 'Invoice belum terkonfirmasi. Coba kembali dengan isian yang sama.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <DialogFrame onClose={close} label="Buat invoice pelanggan"><div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90dvh] overflow-y-auto space-y-5">
    <h2 className="text-xl font-bold">Buat invoice pelanggan</h2><p className="text-sm text-slate-600">Tagih barang yang sudah dikirim dan belum masuk invoice lain. Harga, diskon, dan PBJT mengikuti pesanan.</p>
    {loading && <p role="status" className="text-sm text-slate-600">Memuat pesanan…</p>}
    {error && <div role="alert" className="text-sm text-rose-800 bg-rose-50 p-3 rounded-xl"><p>{error}</p>{!order && <button className="font-semibold mt-2" disabled={loading} onClick={() => void load()}>Muat ulang pesanan</button>}</div>}
    {!loading && !error && !orders.length && <p className="text-sm rounded-xl bg-slate-50 p-3">Belum ada pesanan yang dikonfirmasi. Buat dan konfirmasi pesanan, lalu validasi pengiriman sebelum membuat invoice.</p>}
    <label className="block text-sm">Pesanan penjualan<select disabled={busy || loading} className="input-glass w-full p-3 mt-1" value={selected} onChange={e => { setSelected(e.target.value); setQuantities({}); requestKey.current = crypto.randomUUID(); }}><option value="">Pilih pesanan…</option>{orders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} · {o.contact?.name}{invoiceChoices(o).some(l => l.billable > 0) ? '' : ' · Belum ada jumlah siap ditagih'}</option>)}</select></label>
    {order && !lines.some(l => l.billable > 0) && <p role="status" className="text-sm text-amber-900 bg-amber-50 p-3 rounded-xl">Belum ada barang siap ditagih. Periksa apakah pengiriman sudah divalidasi atau seluruh jumlah sudah masuk invoice.</p>}
    {lines.map(l => <div key={l.productSku} className="border rounded-xl p-4 flex flex-wrap items-center gap-4"><div className="flex-1 min-w-0"><strong className="text-sm break-words">{l.product?.name || l.productSku}</strong><p className="text-xs text-slate-500 mt-1">{l.productSku}</p><p className="text-sm text-slate-600 mt-1">Dipesan {l.quantity} · Dikirim {l.deliveredQty} · Masuk invoice atau draft {l.invoiced} · Siap ditagih {l.billable}</p></div><label className="text-sm">Jumlah ditagih<input disabled={busy || !l.billable} type="number" min={0} max={l.billable} step={1} value={quantities[l.productSku] ?? l.billable} onChange={e => { setQuantities(q => ({ ...q, [l.productSku]: Number(e.target.value) })); requestKey.current = crypto.randomUUID(); }} className="input-glass p-2 w-24 block" /></label></div>)}
    {order && lines.some(l => l.billable > 0) && !canSave && <p role="status" className="text-sm text-amber-900">Isi jumlah bulat antara 0 dan jumlah siap ditagih. Minimal satu barang harus ditagih.</p>}
    <p className="text-xs text-slate-500">Invoice akan disimpan sebagai draft. Periksa kembali sebelum posting ke pembukuan.</p>
    <div className="flex justify-end gap-3 border-t pt-4"><button className="btn-secondary" disabled={busy} onClick={close}>Batal</button><button className="btn-primary" disabled={busy || loading || !canSave} onClick={() => void save()}>{busy ? 'Menyimpan…' : 'Simpan draft invoice'}</button></div>
  </div></DialogFrame>;
}
