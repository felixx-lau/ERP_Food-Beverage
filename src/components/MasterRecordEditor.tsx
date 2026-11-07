'use client';
import React,{useEffect,useRef,useState} from 'react';
import DialogFrame from './ui/DialogFrame';
import {masterFields} from '@/lib/masterFields';

export default function MasterRecordEditor({resource,record,onClose,onSaved}:{resource:string;record?:any;onClose:()=>void;onSaved:(record:any)=>void}) {
  const config=masterFields[resource];
  const initial=()=>Object.fromEntries(config.fields.map(f=>[f.key,record?.[f.key] ?? (f.type==='number'?(f.key==='minimumQty'?1:0):f.options?.[0] ?? ({city:'Jakarta',size:'Regular',color:'Original',usage:'Internal'} as any)[f.key] ?? '')]));
  const [form,setForm]=useState<any>(initial),[options,setOptions]=useState<any>({}),[role,setRole]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const base=useRef(JSON.stringify(initial())),pending=useRef(false),requestKey=useRef(crypto.randomUUID());
  const dirty=JSON.stringify(form)!==base.current;
  useEffect(()=>{Promise.all([fetch('/api/master/options').then(r=>r.json()),fetch('/api/auth/me').then(r=>r.json())]).then(([data,session])=>{setOptions(data);setRole(session.user?.role||'');if(!record&&resource==='products')setForm((f:any)=>({...f,unit:data.units?.[0]?.code||''}));}).catch(()=>setError('Pilihan data gagal dimuat.'));},[resource,record]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  const close=()=>{if(!pending.current&&(!dirty||window.confirm('Perubahan belum disimpan. Tutup formulir?')))onClose();};
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();if(pending.current)return;pending.current=true;setBusy(true);setError('');
    try{
      const key=record?.id??record?.sku??record?.code;
      const response=await fetch(`/api/master/${resource}${record?'/'+encodeURIComponent(key):''}`,{method:record?'PATCH':'POST',headers:{'Content-Type':'application/json','Idempotency-Key':requestKey.current},body:JSON.stringify({...form,...(record?{version:record.version}:{})})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Data gagal disimpan.');onSaved(data.record);
    }catch(e){setError(e instanceof Error?e.message:'Data gagal disimpan.');}finally{pending.current=false;setBusy(false);}
  };
  return <DialogFrame onClose={close} label={`${record?'Edit':'Tambah'} ${config.title}`}><form onSubmit={save} className="bg-white rounded-2xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto p-6 space-y-5">
    <div><h2 className="text-xl font-bold text-slate-900">{record?'Edit':'Tambah'} {config.title}</h2><p className="text-sm text-slate-500 mt-1">Kolom bertanda * wajib diisi.</p></div>
    {error&&<p role="alert" className="bg-rose-50 text-rose-800 rounded-xl p-3 text-sm">{error}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{config.fields.map(field=>{
      const disabled=busy||!!(record&&field.identity)||!!(field.ownerOnly&&role!=='OWNER');
      const list=field.source?(options[field.source]||[]):[];
      const props={id:`master-${field.key}`,name:field.key,required:field.required,disabled,value:form[field.key]??'',className:'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white disabled:bg-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none',onChange:(e:any)=>setForm((f:any)=>({...f,[field.key]:field.type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value}))};
      return <div key={field.key} className={field.type==='textarea'?'sm:col-span-2':''}><label htmlFor={props.id} className="block text-sm font-medium text-slate-700 mb-1.5">{field.label}{field.required?' *':''}{field.ownerOnly&&role!=='OWNER'?' · Owner':''}</label>{field.type==='textarea'?<textarea {...props} rows={3}/>:field.type==='select'?<select {...props}><option value="">{field.required?'Pilih…':'Tanpa pilihan'}</option>{field.options?.map(o=><option key={o} value={o}>{o}</option>)}{list.map((o:any)=><option key={o.id??o.sku??o.code} value={o.id??o.sku??o.code}>{o.sku??o.code??o.id} · {o.name}</option>)}{record&&field.source&&form[field.key]&&!list.some((o:any)=>(o.id??o.sku??o.code)===form[field.key])&&<option value={form[field.key]}>{form[field.key]} (tersimpan)</option>}</select>:<input {...props} type={field.type==='number'?'number':field.type==='email'?'email':'text'} min={0} step={field.type==='number'?1:undefined}/>}</div>;
    })}</div>
    {resource==='products'&&<p className="text-sm text-slate-500">Stok dicatat melalui penerimaan atau penyesuaian persediaan. Biaya standar SKU yang sudah memiliki stok/riwayat dilindungi.</p>}
    <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={close} disabled={busy} className="btn-secondary">Batal</button><button disabled={busy} className="btn-primary">{busy?'Menyimpan…':record?'Simpan perubahan':'Simpan'}</button></div>
  </form></DialogFrame>;
}
