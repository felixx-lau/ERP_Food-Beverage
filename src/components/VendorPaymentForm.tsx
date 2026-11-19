'use client';
import React,{useEffect,useRef,useState} from 'react';
type PaymentIntent = {key:string; body:string; billNumber:string; amount:number};
export default function VendorPaymentForm({onPaid, identity}:{onPaid:()=>void|Promise<void>; identity:string}) {
  const [bills,setBills]=useState<any[]>([]),[selected,setSelected]=useState(''),[amount,setAmount]=useState(0),[method,setMethod]=useState('BANK'),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');const pending=useRef(false);
  const load=async(prefill=false)=>{const r=await fetch('/api/accounting/vendor-bills');const d=await r.json();if(!r.ok)throw new Error(d.error);const available=(d.bills||[]).filter((b:any)=>b.status==='POSTED'&&b.outstandingAmount>0);setBills(available);const requested=new URLSearchParams(window.location.search).get('billId');const target=available.find((b:any)=>b.id===requested);if(prefill && target){setSelected(target.id);setAmount(target.outstandingAmount);}};
  const slot = 'rasa-aruna.vendor-payment.' + identity;
  const [recovery,setRecovery] = useState<PaymentIntent | null>(null);
  const [ready,setReady] = useState(false);
  useEffect(()=>{
    try {
      const stored = sessionStorage.getItem(slot);
      setRecovery(stored ? JSON.parse(stored) : null);
      setReady(true);
    } catch {
      setError('Riwayat permintaan di tab ini tidak dapat dibaca. Periksa riwayat pembayaran sebelum melanjutkan.');
    }
    load(true).catch(e=>setError(String(e)));
  },[slot]);
  const bill=bills.find(b=>b.id===selected);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const intent = recovery || {
        key: crypto.randomUUID(),
        body: JSON.stringify({billId: selected, amount, paymentMethod: method, paymentDate: date}),
        billNumber: bill.billNumber,
        amount,
      };
      sessionStorage.setItem(slot, JSON.stringify(intent));
      setRecovery(intent);
      const response = await fetch('/api/accounting/payments', {
        method: 'POST', headers: {'Content-Type': 'application/json', 'Idempotency-Key': intent.key}, body: intent.body,
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 400) {
          sessionStorage.removeItem(slot);
          setRecovery(null);
        }
        throw new Error(result.error || 'Pembayaran belum dapat dikonfirmasi.');
      }
      sessionStorage.removeItem(slot);
      setRecovery(null);
      setSelected('');
      setAmount(0);
      setNotice(`Pembayaran ${result.payment.paymentNumber} tercatat. Sisa tagihan Rp${result.remainingBalance.toLocaleString('id-ID')}.`);
      try {
        await Promise.all([load(), onPaid()]);
      } catch {
        setError('Pembayaran sudah tercatat. Segarkan halaman untuk memperbarui daftar tagihan.');
      }
    } catch (err) {
      setError(err instanceof TypeError ? 'Respons belum diterima. Periksa kembali permintaan pembayaran di bawah.' : err instanceof Error ? err.message : 'Pembayaran gagal.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="surface-card p-6 space-y-4"><h2 className="text-lg font-semibold">Pembayaran vendor</h2><p className="text-sm text-slate-500">Bayar sebagian atau seluruh tagihan yang sudah diposting.</p>{error&&<p role="alert" className="text-rose-800 bg-rose-50 p-3 rounded-xl">{error}</p>}{notice&&<p role="status" className="text-emerald-800 bg-emerald-50 p-3 rounded-xl">{notice}</p>}{recovery && <p className="rounded-xl bg-amber-50 p-3">Menunggu kepastian pembayaran {recovery.billNumber} sebesar Rp{recovery.amount.toLocaleString('id-ID')}. Periksa kembali untuk mendapatkan nomor transaksi.</p>}<fieldset disabled={busy||!!recovery} className="grid sm:grid-cols-4 gap-4"><label className="text-sm sm:col-span-2">Tagihan vendor<select required className="input-glass w-full p-2 mt-1" value={selected} onChange={e=>{setSelected(e.target.value);setAmount(bills.find(b=>b.id===e.target.value)?.outstandingAmount||0);}}><option value="">Pilih tagihan…</option>{bills.map(b=><option key={b.id} value={b.id}>{b.billNumber} · {b.vendor?.name} · Rp{b.outstandingAmount.toLocaleString('id-ID')}</option>)}</select></label><label className="text-sm">Jumlah (Rp)<input required type="number" min={1} max={bill?.outstandingAmount} step={1} className="input-glass w-full p-2 mt-1" value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label><label className="text-sm">Metode<select className="input-glass w-full p-2 mt-1" value={method} onChange={e=>setMethod(e.target.value)}>{['BANK','CASH','QRIS'].map(m=><option key={m}>{m}</option>)}</select></label><label className="text-sm">Tanggal<input required type="date" className="input-glass w-full p-2 mt-1" value={date} onChange={e=>setDate(e.target.value)}/></label></fieldset><button className="btn-primary" disabled={!ready||busy||(!selected&&!recovery)}>{busy?'Memproses…':recovery?'Periksa kembali pembayaran':'Catat pembayaran vendor'}</button></form>;
}
