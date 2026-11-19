'use client';
import React,{useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
type AdjustmentProduct = {
  sku: string;
  unit: string;
  trackLots: boolean;
  locations: { locationCode: string; onHand: number; reserved: number }[];
};

export default function MovementsPage() {
  const [user, setUser] = useState<any>(null);
  const [options, setOptions] = useState<{ products?: {sku:string; name:string}[]; locations?: {code:string; name:string}[] }>({});
  const [data, setData] = useState<any>({ movements: [], pages: 1 });
  const [sku, setSku] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [reason, setReason] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [product, setProduct] = useState<AdjustmentProduct | null>(null);
  const [stockError, setStockError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const pending = useRef(false);
  const keys = useRef(new Map<string, string>());
  const canAdjust = ['HEAD_ADMIN', 'WAREHOUSE'].includes(user?.role);

  const load = async () => {
    const query = new URLSearchParams({ sku, location, page: String(page) });
    const response = await fetch(`/api/inventory/movements?${query}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setData(result);
  };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    Promise.all([
      fetch('/api/auth/me').then(response => response.json()),
      fetch('/api/master/options').then(response => response.json()),
    ]).then(([session, records]) => {
      const initialSku = records.products?.find((item: {sku:string}) => item.sku === query.get('sku'))?.sku ?? '';
      const initialLocation = records.locations?.find((item: {code:string}) => item.code === query.get('location'))?.code ?? '';
      setUser(session.user);
      setOptions(records);
      setFormSku(initialSku);
      setFormLocation(initialLocation || records.locations?.[0]?.code || '');
      setReceiptRef(initialSku && initialLocation ? (query.get('receipt') ?? '').slice(0, 200) : '');
    }).catch(() => setError('Pilihan produk dan lokasi gagal dimuat.'));
  }, []);

  useEffect(() => {
    load().catch(e => setError(e.message));
  }, [sku, location, page]);

  useEffect(() => {
    setProduct(null);
    setStockError('');
    if (!canAdjust || !formSku) return;
    const controller = new AbortController();
    fetch(`/api/products/${encodeURIComponent(formSku)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Stok tercatat gagal dimuat.');
        const result = await response.json();
        if (!controller.signal.aborted) setProduct(result.product);
      })
      .catch(e => { if (!controller.signal.aborted) setStockError(e.message); });
    return () => controller.abort();
  }, [canAdjust, formSku, refreshCount]);

  const current = product?.sku === formSku && formLocation
    ? product.locations.find(item => item.locationCode === formLocation) ?? { onHand: 0, reserved: 0 }
    : null;
  const delta = current && target !== '' ? Number(target) - current.onHand : null;
  const refreshStock = () => {
    setProduct(null);
    setRefreshCount(value => value + 1);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current || !current || target === '' || !reason.trim()) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const body = {
      sku: formSku,
      locationCode: formLocation,
      newOnHand: Number(target),
      expectedOnHand: current.onHand,
      reason: receiptRef ? `Penerimaan ${receiptRef} · ${reason.trim()}` : reason.trim(),
    };
    const identity = JSON.stringify(body);
    if (!keys.current.has(identity)) keys.current.set(identity, crypto.randomUUID());
    try {
      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': keys.current.get(identity)! },
        body: identity,
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          refreshStock();
          setTarget('');
        }
        throw new Error(result.error);
      }
      keys.current.delete(identity);
      setNotice(result.message);
      setReason('');
      setTarget('');
      refreshStock();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Penyesuaian gagal.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return <AppLayout currentUser={user} title="Pergerakan & penyesuaian stok" subtitle="Setiap perubahan persediaan terhubung ke dokumen, pelaku, alasan, dan valuasi.">
    {error && <p role="alert" className="bg-rose-50 text-rose-800 p-4 rounded-xl">{error}</p>}
    {notice && <p role="status" className="bg-emerald-50 text-emerald-800 p-4 rounded-xl">{notice}</p>}
    {canAdjust && (
      <form onSubmit={submit} className="surface-card p-5 space-y-4">
        <h2 className="font-semibold text-lg">Koreksi stok fisik</h2>
        <p className="text-sm text-slate-600">Hitung ulang stok di lokasi, lalu masukkan jumlah fisik yang benar. Selisih diposting sebagai pergerakan stok dan jurnal persediaan.</p>
        {receiptRef && <p className="text-sm text-slate-700">Penerimaan {receiptRef} akan dicatat bersama alasan. Untuk koreksi jumlah di dokumen atau tagihan vendor, koordinasikan dengan Procurement dan Finance.</p>}
        <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm">SKU
            <select required value={formSku} onChange={e => { setFormSku(e.target.value); setTarget(''); setReason(''); setReceiptRef(''); }} className="input-glass w-full p-2 mt-1">
              <option value="">Pilih SKU…</option>
              {options.products?.map(item => <option key={item.sku} value={item.sku}>{item.sku} · {item.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Lokasi
            <select required value={formLocation} onChange={e => { setFormLocation(e.target.value); setTarget(''); setReason(''); setReceiptRef(''); }} className="input-glass w-full p-2 mt-1">
              {options.locations?.map(item => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}
            </select>
          </label>
          {formSku && formLocation && <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3 text-sm space-y-1">
            <p role="status">{stockError || (current
              ? `Stok fisik tercatat ${current.onHand} ${product?.unit} · Dicadangkan ${current.reserved} ${product?.unit}`
              : 'Memuat stok tercatat…')}</p>
            {delta !== null && <p>Selisih {delta > 0 ? '+' : ''}{delta} {product?.unit}</p>}
            {product?.trackLots && <p>Pengurangan produk terlacak dilakukan melalui menu Batch dan Waste dengan memilih batch. Alokasikan stok tambahan ke batch yang sesuai.</p>}
            <button type="button" className="text-indigo-700 underline" onClick={() => { setTarget(''); refreshStock(); }}>Muat ulang stok tercatat</button>
          </div>}
          <label className="text-sm">Jumlah fisik hasil hitung
            <input required min={current?.reserved ?? 0} max={100000000} step={1} type="number" value={target} onChange={e => setTarget(e.target.value)} className="input-glass w-full p-2 mt-1" />
          </label>
          <label className="text-sm">Alasan koreksi (wajib)
            <textarea required maxLength={receiptRef ? 1000 - `Penerimaan ${receiptRef} · `.length : 1000} rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Contoh: salah input 12 pcs, hasil hitung ulang 10 pcs." className="input-glass w-full p-2 mt-1" />
          </label>
        </fieldset>
        <button className="btn-primary" disabled={busy || !current || delta === null || delta === 0 || !reason.trim() || Boolean(product?.trackLots && delta < 0)}>
          {busy ? 'Memproses…' : 'Posting penyesuaian'}
        </button>
      </form>
    )}
    <div className="surface-card p-4 flex flex-wrap gap-3"><input aria-label="Cari SKU" value={sku} placeholder="Cari SKU…" onChange={e=>{setSku(e.target.value);setPage(1);}} className="input-glass p-2"/><select aria-label="Filter lokasi" value={location} onChange={e=>{setLocation(e.target.value);setPage(1);}} className="input-glass p-2"><option value="">Semua lokasi</option>{options.locations?.map((l:any)=><option key={l.code} value={l.code}>{l.code}</option>)}</select></div>
    <div className="surface-card overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{['Tanggal / nomor','SKU','Asal → tujuan','Jumlah','Nilai','Dokumen / jurnal','Pelaku / alasan'].map(h=><th key={h} scope="col" className="p-3">{h}</th>)}</tr></thead><tbody>{data.movements.map((m:any)=><tr key={m.id} className="border-t"><td className="p-3">{new Date(m.date).toLocaleString('id-ID')}<br/>{m.moveNumber}</td><td className="p-3">{m.productSku}</td><td className="p-3">{m.sourceLocation} → {m.destLocation}</td><td className="p-3">{m.quantity}</td><td className="p-3">Rp{m.totalValue.toLocaleString('id-ID')}</td><td className="p-3">{m.documentRef}{m.journalEntryId&&<><br/><Link className="text-blue-700 underline" href={`/accounting/journal-entries?id=${m.journalEntryId}`}>Jurnal sumber</Link></>}</td><td className="p-3">{m.actorId||'Riwayat lama'}<br/>{m.reason||m.documentType}</td></tr>)}</tbody></table>{!data.movements.length&&<p className="p-8 text-center text-slate-500">Belum ada pergerakan pada filter ini.</p>}<div className="p-4 flex justify-between items-center"><span>{data.total||0} pergerakan · {page} / {data.pages}</span><div className="flex gap-2"><button className="btn-secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Sebelumnya</button><button className="btn-secondary" disabled={page>=data.pages} onClick={()=>setPage(p=>p+1)}>Berikutnya</button></div></div></div>
  </AppLayout>;
}
