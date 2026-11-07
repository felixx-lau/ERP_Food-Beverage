'use client';
import React,{useEffect,useRef,useState} from 'react';
import DialogFrame from './ui/DialogFrame';
type Props={kind:string;record:any;role?:string;onChanged:()=>Promise<void>|void};
const roles:Record<string,string[]>={sales:['OWNER','SALES'],purchase:['OWNER','PROCUREMENT'],invoices:['OWNER','FINANCE'],bills:['OWNER','FINANCE'],deliveries:['OWNER','WAREHOUSE'],receipts:['OWNER','WAREHOUSE'],transfers:['OWNER','WAREHOUSE']};
export default function DocumentControls({kind,record,role,onChanged}:Props) {
  const [dialog,setDialog]=useState(''),[form,setForm]=useState<any>({}),[options,setOptions]=useState<any>({}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=useRef(false),keys=useRef(new Map<string,string>()),base=useRef('');
  useEffect(()=>{fetch('/api/master/options').then(r=>r.json()).then(setOptions).catch(()=>{});},[]);
  const dirty=dialog==='edit'||dialog==='validate'?JSON.stringify(form)!==base.current:false;
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  if(!record||!roles[kind]?.includes(role||''))return null;
  const open=(action:string)=>{
    const next={contactId:record.contactId,vendorId:record.vendorId,scheduledDate:record.scheduledDate?new Date(record.scheduledDate).toISOString().slice(0,10):'',sourceLocation:record.sourceLocation,destLocation:record.destLocation,lines:record.lines?.map((l:any)=>({productSku:l.productSku,quantity:l.quantity,orderedQty:l.orderedQty,unitPrice:l.unitPrice,discountPercent:l.discountPercent??0})),items:record.lines?.map((l:any)=>({lineId:l.id,productSku:l.productSku,deliveredQty:l.orderedQty,acceptedQty:l.demandQty,rejectedQty:0,rejectionReason:''}))};
    setForm(next);base.current=JSON.stringify(next);setError('');setDialog(action);
  };
  const close=()=>{if(!pending.current&&(!dirty||window.confirm('Perubahan belum disimpan. Tutup formulir?')))setDialog('');};
  const submit=async()=>{
    if(pending.current)return;pending.current=true;setBusy(true);setError('');
    try{
      const payload={action:dialog,version:record.version,...(dialog==='edit'?form:dialog==='validate'?{items:form.items}:{})};const fingerprint=JSON.stringify(payload);if(!keys.current.has(fingerprint))keys.current.set(fingerprint,crypto.randomUUID());
      const response=await fetch(`/api/workflow/${kind}/${record.id}`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':keys.current.get(fingerprint)!},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Operasi gagal.');setDialog('');await onChanged();
    }catch(e){setError(e instanceof Error?e.message:'Operasi gagal.');}finally{pending.current=false;setBusy(false);}
  };
  const field=(label:string,key:string,list:any[],idKey='id')=><label className="block text-sm space-y-1">{label}<select className="input-glass w-full px-3 py-2" value={form[key]||''} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))}>{list.map(o=><option key={o[idKey]} value={o[idKey]}>{o[idKey]} · {o.name}</option>)}</select></label>;
  const labels:Record<string,string>={edit:'Edit draft',confirm:'Konfirmasi',approve:'Setujui diskon',post:'Posting',validate:kind==='deliveries'?'Validasi pengiriman':kind==='receipts'?'Validasi penerimaan':'Validasi transfer',cancel:'Batalkan'};
  const buttons:string[]=[];
  if(record.status==='DRAFT'){
    if(['sales','purchase','invoices','bills','transfers'].includes(kind))buttons.push('edit');
    if(kind==='sales'&&record.discountPercent>10&&!record.discountApproved&&role==='OWNER')buttons.push('approve');
    if(['sales','purchase'].includes(kind))buttons.push('confirm');
    if(['invoices','bills'].includes(kind))buttons.push('post');
    if(['deliveries','receipts','transfers'].includes(kind))buttons.push('validate');
    if(!['deliveries','receipts'].includes(kind))buttons.push('cancel');
  } else if(record.status==='CONFIRMED'){
    if(['sales','purchase'].includes(kind))buttons.push('cancel');
    if(['deliveries','receipts'].includes(kind))buttons.push('validate');
  }
  if(!buttons.length)return null;
  return <><div className="surface-card p-4 flex flex-wrap items-center gap-3"><span className="text-sm font-medium mr-auto">Tindakan dokumen</span>{buttons.map(action=><button key={action} onClick={()=>open(action)} className={['confirm','post','validate','approve'].includes(action)?'btn-primary':'btn-secondary'}>{labels[action]}</button>)}</div>
    {dialog&&<DialogFrame onClose={close} label={labels[dialog]}><div className="bg-white w-full max-w-4xl rounded-2xl p-6 max-h-[90dvh] overflow-y-auto space-y-5"><h2 className="text-xl font-bold">{labels[dialog]} · {record.orderNumber||record.poNumber||record.invoiceNumber||record.billNumber||record.deliveryNumber||record.receiptNumber||record.transferNumber}</h2>
      {error&&<p role="alert" className="p-3 bg-rose-50 text-rose-800 rounded-xl text-sm">{error}</p>}
      {dialog==='edit'&&<>
        {kind==='sales'&&field('Pelanggan','contactId',options.customers||[])}{kind==='purchase'&&<div className="grid sm:grid-cols-2 gap-4">{field('Vendor','vendorId',options.vendors||[])}<label className="text-sm">Tanggal rencana<input aria-label="Tanggal rencana" type="date" value={form.scheduledDate} className="input-glass w-full px-3 py-2" onChange={e=>setForm((f:any)=>({...f,scheduledDate:e.target.value}))}/></label></div>}
        {kind==='transfers'&&<div className="grid sm:grid-cols-2 gap-4">{field('Lokasi asal','sourceLocation',options.locations||[],'code')}{field('Lokasi tujuan','destLocation',options.locations||[],'code')}</div>}
        <div className="space-y-3">{form.lines?.map((line:any,index:number)=><div key={index} className="border rounded-xl p-4 grid sm:grid-cols-5 gap-3"><label className="sm:col-span-2 text-sm">SKU<select aria-label={`SKU baris ${index+1}`} value={line.productSku} className="input-glass w-full p-2" onChange={e=>{const p=options.products?.find((p:any)=>p.sku===e.target.value);setForm((f:any)=>({...f,lines:f.lines.map((l:any,i:number)=>i===index?{...l,productSku:e.target.value,unitPrice:kind==='purchase'?p?.standardCost:p?.salesPrice}:l)}));}}><option value="">Pilih SKU…</option>{(options.products||[]).map((p:any)=><option key={p.sku} value={p.sku}>{p.sku} · {p.name}</option>)}{line.productSku&&!options.products?.some((p:any)=>p.sku===line.productSku)&&<option value={line.productSku}>{line.productSku}</option>}</select></label><label className="text-sm">Kuantitas<input type="number" min={1} step={1} aria-label={`Kuantitas baris ${index+1}`} value={line[kind==='purchase'?'orderedQty':'quantity']??1} className="input-glass w-full p-2" onChange={e=>setForm((f:any)=>({...f,lines:f.lines.map((l:any,i:number)=>i===index?{...l,[kind==='purchase'?'orderedQty':'quantity']:Number(e.target.value)}:l)}))}/></label>{kind!=='transfers'&&<label className="text-sm">Harga (Rp)<input type="number" min={0} step={1} disabled={['invoices','bills'].includes(kind)} aria-label={`Harga baris ${index+1}`} value={line.unitPrice??0} className="input-glass w-full p-2" onChange={e=>setForm((f:any)=>({...f,lines:f.lines.map((l:any,i:number)=>i===index?{...l,unitPrice:Number(e.target.value)}:l)}))}/></label>}{kind==='sales'&&<label className="text-sm">Diskon %<input type="number" min={0} max={20} value={line.discountPercent} className="input-glass w-full p-2" onChange={e=>setForm((f:any)=>({...f,lines:f.lines.map((l:any,i:number)=>i===index?{...l,discountPercent:Number(e.target.value)}:l)}))}/></label>}<button className="text-rose-700 text-sm underline" disabled={form.lines.length<=1} onClick={()=>setForm((f:any)=>({...f,lines:f.lines.filter((_:any,i:number)=>i!==index)}))}>Hapus baris</button></div>)}</div>
        <button className="btn-secondary" onClick={()=>setForm((f:any)=>({...f,lines:[...f.lines,{productSku:'',quantity:1,orderedQty:1,unitPrice:0,discountPercent:0}]}))}>+ Tambah baris</button>
      </>}
      {dialog==='validate'&&kind!=='transfers'&&<div className="space-y-3">{form.items?.map((item:any,index:number)=><div key={item.lineId} className="border rounded-xl p-4"><p className="font-medium mb-3">{item.productSku} · Permintaan {record.lines[index].orderedQty??record.lines[index].demandQty}</p><div className="grid sm:grid-cols-3 gap-3">{(kind==='deliveries'?['deliveredQty']:['acceptedQty','rejectedQty']).map(key=><label key={key} className="text-sm">{key==='deliveredQty'?'Dikirim':key==='acceptedQty'?'Diterima':'Ditolak'}<input type="number" min={0} step={1} value={item[key]??0} className="input-glass w-full p-2" onChange={e=>setForm((f:any)=>({...f,items:f.items.map((l:any,i:number)=>i===index?{...l,[key]:Number(e.target.value)}:l)}))}/></label>)}{kind==='receipts'&&<label className="text-sm">Alasan penolakan<input value={item.rejectionReason||''} className="input-glass w-full p-2" onChange={e=>setForm((f:any)=>({...f,items:f.items.map((l:any,i:number)=>i===index?{...l,rejectionReason:e.target.value}:l)}))}/></label>}</div></div>)}</div>}
      {!['edit','validate'].includes(dialog)&&<p className="text-sm text-slate-600">{dialog==='cancel'?'Pembatalan menjaga riwayat dokumen. Order yang sudah dipenuhi atau diposting memerlukan alur retur/reversal.':dialog==='approve'?'Persetujuan Owner akan tercatat bersama identitas dan waktu.':'Status, stok, saldo, dan audit diperiksa serta disimpan sebagai satu transaksi. Harga dokumen yang dikonfirmasi/diposting akan dikunci.'}</p>}
      <div className="flex justify-end gap-3 border-t pt-4"><button className="btn-secondary" disabled={busy} onClick={close}>Batal</button><button className="btn-primary" disabled={busy} onClick={submit}>{busy?'Memproses…':dialog==='edit'?'Simpan perubahan':labels[dialog]}</button></div>
    </div></DialogFrame>}
  </>;
}
