'use client';
import {canCancelDocument} from '@/lib/uxFlows';
import React,{useEffect,useRef,useState} from 'react';
import ActionButton from './ui/ActionButton';
import DocumentGuidance from './DocumentGuidance';
import DialogFrame from './ui/DialogFrame';
import { publishDataRefresh } from './ui/useDataRefresh';
import { businessDate } from '@/lib/businessDate';
type FulfillmentLocation = {
  code: string;
  name: string;
  sufficient: boolean;
  lines: { sku: string; name: string; unit: string; quantity: number; available: number }[];
};
type Props={kind:string;record:any;role?:string;onChanged:()=>Promise<void>|void};
const roles:Record<string,string[]>={sales:['HEAD_ADMIN','SALES'],purchase:['HEAD_ADMIN','PROCUREMENT'],invoices:['HEAD_ADMIN','FINANCE'],bills:['HEAD_ADMIN','FINANCE'],deliveries:['HEAD_ADMIN','WAREHOUSE'],receipts:['HEAD_ADMIN','WAREHOUSE'],transfers:['HEAD_ADMIN','WAREHOUSE']};
export default function DocumentControls({kind,record,role,onChanged}:Props) {
  const [dialog,setDialog]=useState(''),[form,setForm]=useState<any>({}),[options,setOptions]=useState<any>({}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [fulfillment,setFulfillment]=useState<FulfillmentLocation[] | null>(null);
  const [stockError,setStockError]=useState('');
  const [stockRefresh,setStockRefresh]=useState(0);
  const salesConfirmation = kind === 'sales' && dialog === 'confirm';
  const locationStock = fulfillment?.find(location => location.code === form.sourceLocation);
  const stockBlocked = salesConfirmation && (!locationStock?.sufficient || !!stockError);
  useEffect(() => {
    if (!salesConfirmation || !record?.id) return;
    const controller = new AbortController();
    setFulfillment(null);
    setStockError('');
    async function load() {
      try {
        const response = await fetch(`/api/sales/orders/${encodeURIComponent(record.id)}?stockPreview=1`, {
          cache: 'no-store', signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error('Stok per lokasi belum dapat dimuat.');
        if (controller.signal.aborted) return;
        const locations: FulfillmentLocation[] = result.fulfillment;
        setFulfillment(locations);
        setForm((current:any) => {
          const preferred = locations.find(location => location.code === current.sourceLocation);
          const firstEnough = locations.find(location => location.sufficient);
          const choice = current.locationChosen || preferred?.sufficient
            ? preferred ?? firstEnough
            : firstEnough ?? preferred;
          return { ...current, sourceLocation: choice?.code ?? locations[0]?.code ?? '' };
        });
      } catch {
        if (!controller.signal.aborted) setStockError('Stok per lokasi belum dapat dimuat.');
      }
    }
    void load();
    return () => controller.abort();
  }, [salesConfirmation, record?.id, stockRefresh]);
  const pending=useRef(false),keys=useRef(new Map<string,string>()),base=useRef('');
  useEffect(()=>{fetch('/api/master/options').then(r=>r.json()).then(setOptions).catch(()=>{});},[]);
  const fromRequest = kind === 'purchase' && !!record?.purchaseRequest;
  const dirty=dialog==='edit'||dialog==='validate'?JSON.stringify(form)!==base.current:false;
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  if(!record)return null;
  if(!(kind==='sales' && role==='OWNER') && !roles[kind]?.includes(role||''))return <div className="surface-card p-4"><DocumentGuidance kind={kind} record={record} role={role}/></div>;
  const open=(action:string)=>{
    const next={contactId:record.contactId,vendorId:record.vendorId,scheduledDate:record.scheduledDate?businessDate(new Date(record.scheduledDate)):'',sourceLocation:record.sourceLocation||'WH-JKT',destLocation:record.purchaseRequest?.locationCode||record.destLocation||'WH-JKT',lines:record.lines?.map((l:any)=>({productSku:l.productSku,quantity:l.quantity,orderedQty:l.orderedQty,unitPrice:l.unitPrice,discountPercent:l.discountPercent??0})),items:record.lines?.map((l:any)=>({lineId:l.id,productSku:l.productSku,deliveredQty:l.orderedQty,acceptedQty:l.demandQty,rejectedQty:0,rejectionReason:''}))};
    setFulfillment(null);setStockError('');setForm(next);base.current=JSON.stringify(next);setError('');setDialog(action);
  };
  const close=()=>{if(!pending.current&&(!dirty||window.confirm('Perubahan belum disimpan. Tutup formulir?')))setDialog('');};
  const submit=async()=>{
    if(pending.current||stockBlocked)return;pending.current=true;setBusy(true);setError('');
    try{
      const payload={action:dialog,version:record.version,...(dialog==='edit'?form:dialog==='validate'?{items:form.items}:dialog==='confirm'&&kind==='sales'?{sourceLocation:form.sourceLocation}:['confirm','prepare'].includes(dialog)&&kind==='purchase'?{destLocation:form.destLocation}:{})};const fingerprint=JSON.stringify(payload);if(!keys.current.has(fingerprint))keys.current.set(fingerprint,crypto.randomUUID());
      const endpoint = dialog === "approve" ? `/api/sales/orders/${record.id}/approve-discount` : `/api/workflow/${kind}/${record.id}`;
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':keys.current.get(fingerprint)!},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Operasi gagal.');setDialog('');publishDataRefresh();await onChanged();
    }catch(e){setError(e instanceof Error?e.message:'Operasi gagal.');}finally{pending.current=false;setBusy(false);}
  };
  const field=(label:string,key:string,list:any[],idKey='id')=><label className="block text-sm space-y-1">{label}<select className="input-glass w-full px-3 py-2" value={form[key]||''} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))}>{list.map(o=><option key={o[idKey]} value={o[idKey]}>{o[idKey]} · {o.name}</option>)}</select></label>;
  const labels:Record<string,string>={prepare:kind==='sales'?'Siapkan pengiriman':'Siapkan penerimaan',edit:'Edit draft',confirm:'Konfirmasi',approve:'Setujui diskon',post:'Posting ke pembukuan',validate:kind==='deliveries'?'Validasi pengiriman':kind==='receipts'?'Validasi penerimaan':'Validasi transfer',cancel:'Batalkan'};
  const pendingDiscount = kind === 'sales' && record.discountPercent > 10 && !record.discountApproved;
  const buttons:string[]=[];
  if(role==='OWNER'){
    if(record.status==='DRAFT' && pendingDiscount) buttons.push('approve');
  } else if(record.status==='DRAFT'){
    if(['sales','purchase','invoices','bills','transfers'].includes(kind))buttons.push('edit');
    if(pendingDiscount&&role==='HEAD_ADMIN')buttons.push('approve');
    if(['sales','purchase'].includes(kind)&&!pendingDiscount)buttons.push('confirm');
    if(['invoices','bills'].includes(kind))buttons.push('post');
    if(['deliveries','receipts','transfers'].includes(kind))buttons.push('validate');
    if(!['deliveries','receipts'].includes(kind))buttons.push('cancel');
  } else if(record.status==='CONFIRMED'){
    if ((kind==='sales' && record.deliveryOrders?.length===0 && record.lines.some((l:any)=>l.quantity>l.deliveredQty)) ||
        (kind==='purchase' && record.receipts?.length===0 && record.lines.some((l:any)=>l.orderedQty>l.receivedQty))) buttons.push('prepare');
    if(['sales','purchase'].includes(kind)&&canCancelDocument(kind,record))buttons.push('cancel');
    if(['deliveries','receipts'].includes(kind))buttons.push('validate');
  }
  if(!buttons.length)return <div className="surface-card p-4"><DocumentGuidance kind={kind} record={record} role={role}/></div>;
  return <><div className="surface-card p-4 flex flex-wrap items-center gap-3"><div className="flex-1 min-w-[200px]"><DocumentGuidance kind={kind} record={record} role={role}/></div>{buttons.map(action=>action==='edit'?<ActionButton key={action} action="edit" onClick={()=>open(action)}>Edit draft</ActionButton>:<button key={action} onClick={()=>open(action)} className={['confirm','post','validate','approve'].includes(action)?'btn-primary':'btn-secondary'}>{labels[action]}</button>)}</div>
    {dialog&&<DialogFrame onClose={close} label={labels[dialog]}><div className="bg-white w-full max-w-4xl rounded-2xl p-6 max-h-[90dvh] overflow-y-auto space-y-5"><h2 className="text-xl font-bold">{labels[dialog]} · {record.orderNumber||record.poNumber||record.invoiceNumber||record.billNumber||record.deliveryNumber||record.receiptNumber||record.transferNumber}</h2>
      {error&&<p role="alert" className="p-3 bg-rose-50 text-rose-800 rounded-xl text-sm">{error}</p>}
      {salesConfirmation && <div className="space-y-3">
        {stockError && <p role="alert" className="text-sm text-rose-800">{stockError}</p>}
        {!fulfillment && !stockError && <p role="status" className="text-sm">Memeriksa stok tiap lokasi…</p>}
        {fulfillment?.length === 0 && <p role="alert" className="text-sm text-rose-800">Belum ada lokasi pemenuhan yang aktif.</p>}
        {!!fulfillment?.length && <>
          <label className="block text-sm font-medium">
            Lokasi pemenuhan
            <select className="input-glass mt-1 w-full px-3 py-2" value={form.sourceLocation}
              onChange={event => {
                const sourceLocation = event.target.value;
                setForm((current:any) => ({ ...current, sourceLocation, locationChosen: true }));
                setError('');
              }}>
              {fulfillment.map(location => <option key={location.code} value={location.code}>
                {location.name} ({location.code}) · {location.sufficient ? 'Stok cukup' : 'Stok kurang'}
              </option>)}
            </select>
          </label>
          {locationStock && <ul className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
            {locationStock.lines.map(line => <li key={line.sku} className="flex flex-wrap justify-between gap-2">
              <span>{line.name} ({line.sku})</span>
              <strong className={line.available < line.quantity ? 'text-rose-800' : 'text-emerald-800'}>
                Pesanan {line.quantity} {line.unit} · Tersedia {line.available} {line.unit}
              </strong>
            </li>)}
          </ul>}
          <p className="text-sm text-slate-600">
            {locationStock?.sufficient ? 'Seluruh pesanan akan dicadangkan dari lokasi ini. ERP memeriksa stok kembali saat konfirmasi.'
              : 'Pilih lokasi yang stoknya cukup untuk seluruh pesanan, atau sesuaikan jumlah di draft.'}
          </p>
        </>}
        {(fulfillment || stockError) && <button type="button" className="text-sm font-semibold text-indigo-700 underline"
          disabled={busy} onClick={() => { setError(''); setStockRefresh(count => count + 1); }}>Periksa ulang stok</button>}
      </div>}
      {(dialog==='confirm'||dialog==='prepare')&&kind==='purchase'&&<div className="space-y-2">
        {record.purchaseRequest ? <p className="text-sm">Lokasi penerimaan dari pengajuan {record.purchaseRequest.number} · <strong>{record.purchaseRequest.locationCode}</strong></p>
          : field('Gudang penerimaan','destLocation',options.locations||[],'code')}
        <p className="text-sm text-slate-600">Penerimaan dibuat untuk lokasi ini dengan tanggal rencana pesanan.</p>
      </div>}
      {dialog==='edit'&&<>
        {kind==='sales'&&field('Pelanggan','contactId',options.customers||[])}{kind==='purchase'&&<div className="grid sm:grid-cols-2 gap-4">{field('Vendor','vendorId',options.vendors||[])}<label className="text-sm">Tanggal rencana<input aria-label="Tanggal rencana" type="date" value={form.scheduledDate} className="input-glass w-full px-3 py-2" onChange={e=>setForm((f:any)=>({...f,scheduledDate:e.target.value}))}/></label></div>}
        {kind==='transfers'&&<div className="grid sm:grid-cols-2 gap-4">{field('Lokasi asal','sourceLocation',options.locations||[],'code')}{field('Lokasi tujuan','destLocation',options.locations||[],'code')}</div>}
        <div className="space-y-3">{form.lines?.map((line:any,index:number)=><div key={index} className="border rounded-xl p-4 grid sm:grid-cols-5 gap-3"><label className="sm:col-span-2 text-sm">SKU<select disabled={fromRequest} aria-label={`SKU baris ${index+1}`} value={line.productSku} className="input-glass w-full p-2" onChange={e=>{const p=options.products?.find((p:any)=>p.sku===e.target.value);setForm((f:any)=>({...f,lines:f.lines.map((l:any,i:number)=>i===index?{...l,productSku:e.target.value,unitPrice:kind==='purchase'?p?.standardCost:p?.salesPrice}:l)}));}}><option value="">Pilih SKU…</option>{(options.products||[]).filter((p:any)=>kind!=='sales'||p.kind==='MENU').map((p:any)=><option key={p.sku} value={p.sku}>{p.sku} · {p.name}</option>)}{line.productSku&&!options.products?.some((p:any)=>p.sku===line.productSku)&&<option value={line.productSku}>{line.productSku}</option>}</select></label><label className="text-sm">Kuantitas<input disabled={fromRequest} type="number" min={1} step={1} aria-label={`Kuantitas baris ${index+1}`} value={line[kind==='purchase'?'orderedQty':'quantity']??1} className="input-glass w-full p-2" onChange={e=>setForm((f:any)=>({...f,lines:f.lines.map((l:any,i:number)=>i===index?{...l,[kind==='purchase'?'orderedQty':'quantity']:Number(e.target.value)}:l)}))}/></label>{kind!=='transfers'&&<label className="text-sm">Harga (Rp)<input type="number" min={0} step={1} disabled={['invoices','bills'].includes(kind)} aria-label={`Harga baris ${index+1}`} value={line.unitPrice??0} className="input-glass w-full p-2" onChange={e=>setForm((f:any)=>({...f,lines:f.lines.map((l:any,i:number)=>i===index?{...l,unitPrice:Number(e.target.value)}:l)}))}/></label>}{kind==='sales'&&<label className="text-sm">Diskon %<input type="number" min={0} max={20} value={line.discountPercent} className="input-glass w-full p-2" onChange={e=>setForm((f:any)=>({...f,lines:f.lines.map((l:any,i:number)=>i===index?{...l,discountPercent:Number(e.target.value)}:l)}))}/></label>}<ActionButton action="delete" disabled={form.lines.length<=1} onClick={()=>setForm((f:any)=>({...f,lines:f.lines.filter((_:any,i:number)=>i!==index)}))}>Hapus baris</ActionButton></div>)}</div>
        {!fromRequest && <button className="btn-secondary" onClick={()=>setForm((f:any)=>({...f,lines:[...f.lines,{productSku:'',quantity:1,orderedQty:1,unitPrice:0,discountPercent:0}]}))}>+ Tambah baris</button>}
      </>}
      {dialog==='validate'&&kind!=='transfers'&&<div className="space-y-3"><p className="text-sm text-slate-600">{kind==='deliveries'?'Isi jumlah yang dikirim saat ini. Contoh: pesanan 8, dikirim 5, maka sisa 3 otomatis menjadi backorder. Stok dan jumlah yang dapat ditagih diperbarui setelah validasi.':'Isi jumlah diterima dan ditolak sesuai pemeriksaan. Hanya barang diterima yang masuk stok dan menjadi dasar tagihan vendor.'}</p>{form.items?.map((item:any,index:number)=><div key={item.lineId} className="border rounded-xl p-4"><p className="font-medium mb-3">{item.productSku} · Permintaan {record.lines[index].orderedQty??record.lines[index].demandQty}</p><div className="grid sm:grid-cols-3 gap-3">{(kind==='deliveries'?['deliveredQty']:['acceptedQty','rejectedQty']).map(key=><label key={key} className="text-sm">{key==='deliveredQty'?'Dikirim':key==='acceptedQty'?'Diterima':'Ditolak'}<input aria-label={`${key==='deliveredQty'?'Jumlah dikirim':key==='acceptedQty'?'Jumlah diterima':'Jumlah ditolak'} ${item.productSku}`} type="number" min={0} max={record.lines[index].orderedQty??record.lines[index].demandQty} step={1} value={item[key]??0} className="input-glass w-full p-2" onChange={e=>setForm((f:any)=>({...f,items:f.items.map((l:any,i:number)=>i===index?{...l,[key]:Number(e.target.value)}:l)}))}/></label>)}{kind==='deliveries'&&<p className="text-sm text-slate-600 self-end pb-2">Sisa backorder: {Math.max(0,record.lines[index].orderedQty-(item.deliveredQty||0))} unit</p>}{kind==='receipts'&&record.lines[index].product?.trackLots&&item.acceptedQty>0&&<>
          <label className="text-sm">Kode batch<input className="input-glass w-full p-2" value={item.lotCode??''} onChange={e=>setForm((f:any)=>({...f,items:f.items.map((l:any,i:number)=>i===index?{...l,lotCode:e.target.value}:l)}))}/></label>
          <label className="text-sm">Kedaluwarsa batch<input className="input-glass w-full p-2" type="date" value={item.expiresAt??''} onChange={e=>setForm((f:any)=>({...f,items:f.items.map((l:any,i:number)=>i===index?{...l,expiresAt:e.target.value}:l)}))}/></label>
        </>}{kind==='receipts'&&<label className="text-sm">Alasan penolakan<input value={item.rejectionReason||''} className="input-glass w-full p-2" onChange={e=>setForm((f:any)=>({...f,items:f.items.map((l:any,i:number)=>i===index?{...l,rejectionReason:e.target.value}:l)}))}/></label>}</div></div>)}</div>}
      {!['edit','validate'].includes(dialog)&&<p className="text-sm text-slate-600">{dialog==='prepare'?'Gudang akan menerima dokumen draft untuk sisa pesanan. Stok fisik dan saldo buku besar baru berubah saat validasi.':dialog==='cancel'?'Pembatalan menjaga riwayat dokumen. Order yang sudah dipenuhi atau diposting memerlukan alur retur/reversal.':dialog==='approve'?'Persetujuan Anda akan tercatat bersama identitas dan waktu.':'Status, stok, saldo, dan audit diperiksa serta disimpan sebagai satu transaksi. Harga dokumen yang dikonfirmasi/diposting akan dikunci.'}</p>}
      <div className="flex justify-end gap-3 border-t pt-4"><button className="btn-secondary" disabled={busy} onClick={close}>Batal</button><button className="btn-primary" disabled={busy || stockBlocked} onClick={submit}>{busy?'Memproses…':dialog==='edit'?'Simpan perubahan':labels[dialog]}</button></div>
    </div></DialogFrame>}
  </>;
}
