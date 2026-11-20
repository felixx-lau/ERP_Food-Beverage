'use client';
import { STOCK_POLICY } from '@/lib/stockPolicy';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AppLayout from './AppLayout';
import DialogFrame from './ui/DialogFrame';
import useDataRefresh, { publishDataRefresh } from './ui/useDataRefresh';
import { useCompany } from '@/context/CompanyContext';
import { supplyAreas } from '@/lib/supplyAccess';
const titles = { production: 'Resep & produksi', purchase: 'Pengajuan pembelian' };
const descriptions = {
  production: 'Fitur opsional untuk SKU yang dibuat sendiri. Simpan resep dan catat pemakaian bahan saat produksi atau transaksi POS.',
  purchase: 'Stok yang mencapai batas minimum memicu pengajuan untuk disetujui sebelum menjadi pesanan pembelian.',
};
type IngredientAmount = { productSku: string; quantity: number };
type ProductionInput = { productSku: string; quantity: number | ''; recipeQuantity: number; manual?: boolean };
const quantityFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 });
const amountFor = (recipeQuantity: number, outputQty: number, batchYield: number) => recipeQuantity * outputQty / batchYield;
const money=(n:number)=>`Rp ${Number(n).toLocaleString('id-ID')}`;
const date=(d:string)=>new Date(d).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta'});
const status:Record<string,string>={PENDING:'Menunggu',APPROVED:'Disetujui',REJECTED:'Ditolak',CONVERTED:'Sudah dibuat pesanan',CONFIRMED:'PO dikonfirmasi',DRAFT:'Draft',DONE:'Selesai',ACCEPTED:'Diterima dapur',PREPARING:'Dimasak',READY:'Siap disajikan',COMPLETED:'Selesai',CANCELLED:'Dibatalkan'};
export default function OperationsWorkspace({area}:{area:keyof typeof supplyAreas}){
 const {activeCompany}=useCompany();const [data,setData]=useState<any>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[form,setForm]=useState<any>({}),[dialog,setDialog]=useState('');
 const pending=useRef(false),requestKey=useRef(''),lastBody=useRef('');
 async function load(){try{const r=await fetch(`/api/supply?area=${area}`,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);setError('');}catch(e){setError(e instanceof Error?e.message:'Gagal memuat data.');}}
 useEffect(()=>{setData(null);setDialog('');void load();},[area,activeCompany?.id]);useDataRefresh(load,10000);
 const user = data?.user;
 const approver = ['HEAD_ADMIN','OWNER'].includes(user?.role);
 const canSeeStock = ['HEAD_ADMIN','WAREHOUSE'].includes(user?.role);
 const canPurchase = ['HEAD_ADMIN','PROCUREMENT'].includes(user?.role);
 const activeProducts = data?.products?.filter((p:any) => !p.archivedAt) ?? [];
 const product = (sku:string) => data?.products?.find((p:any) => p.sku === sku);
 const name = (sku:string) => product(sku)?.name ?? sku;
 const stockName = (sku: string, locationCode?: string) => {
   const item = product(sku);
   if (!canSeeStock || !item || item.archivedAt) return name(sku);
   const query = new URLSearchParams({ sku, kind: item.kind });
   if (locationCode) query.set('location', locationCode);
   return <Link href={`/inventory/products?${query}`} className="text-indigo-800 underline underline-offset-2">{item.name}</Link>;
 };
 const amountLabel = (quantity: number, sku: string) => [quantityFormat.format(quantity), product(sku)?.unit].filter(Boolean).join(' ');
 const selectedRecipe = data?.recipes?.find((recipe:any) => recipe.id === form.recipeId);
 const place = (code:string) => data?.locations.find((l:any) => l.code === code)?.name ?? code;
 const selectedRequest = data?.requests?.find((request:any) => request.id === form.id);
 const requestProduct = selectedRequest ? product(selectedRequest.productSku) : null;
 const vendorPrice = selectedRequest && data?.vendorPrices?.find((price:any) =>
   price.vendorId === form.vendorId && price.productSku === selectedRequest.productSku && price.minimumQty <= selectedRequest.quantity);
 const backflushSkus: string[] = data?.backflushSkus ?? data?.recipes?.filter((r:any) => r.active && r.mode === 'BACKFLUSH').map((r:any) => r.productSku) ?? [];

 const ingredientChoices = activeProducts.filter((p:any) => p.sku !== form.productSku && !backflushSkus.includes(p.sku));
 const materialChoices = ingredientChoices.filter((p:any) => p.kind === 'MATERIAL');
 const otherIngredients = ingredientChoices.filter((p:any) => p.kind !== 'MATERIAL');

 useEffect(() => {
   if (!data || area !== 'purchase') return;
   const id = new URLSearchParams(window.location.search).get('id');
   if (id) document.getElementById(`request-${id}`)?.scrollIntoView({ block: 'nearest' });
 }, [!!data, area]);
 function open(action:string,initial:any={}){setForm(initial);setDialog(action);setError('');requestKey.current='';lastBody.current='';}
 function openProductionCompletion(order: any) {
   const recipe = order.recipeSnapshot;
   const inputs: ProductionInput[] = (JSON.parse(recipe.lines) as IngredientAmount[]).map(line => ({
     productSku: line.productSku, recipeQuantity: line.quantity,
     quantity: amountFor(line.quantity, order.plannedQty, recipe.outputQty),
   }));
   open('finishProduction', {
     id: order.id, productSku: order.productSku, actualQty: order.plannedQty, plannedQty: order.plannedQty,
     batchYield: recipe.outputQty, inputs,
   });
 }

 async function act(action:string,input:any={},close=true){if(pending.current)return;pending.current=true;setBusy(true);setError('');setNotice('');try{const body=JSON.stringify({action,...input});if(body!==lastBody.current){requestKey.current=crypto.randomUUID();lastBody.current=body;}const r=await fetch(`/api/supply?area=${area}`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':requestKey.current},body});const d=await r.json();if(!r.ok)throw new Error(d.error);if(close)setDialog('');setNotice(action==='evaluateRules'?'Aturan stok diperiksa.':'Perubahan tersimpan.');publishDataRefresh();await load();}catch(e){setError(e instanceof Error?e.message:'Operasi belum terkonfirmasi. Coba kembali.');}finally{pending.current=false;setBusy(false);}}
 const input=(label:string,key:string,type='text',required=true)=><label className="block text-sm">{label}<input required={required} disabled={busy} className="input-glass w-full p-2.5 mt-1" type={type} min={type==='number'?0:undefined} step={type==='number'?1:undefined} value={form[key]??''} onChange={e=>setForm((f:any)=>({...f,[key]:type==='number'?Number(e.target.value):e.target.value}))}/></label>;
 const select=(label:string,key:string,options:any[],valueKey='sku',labelKey='name')=><label className="block text-sm">{label}<select required={key!=='lotId'} disabled={busy} className="input-glass w-full p-2.5 mt-1" value={form[key]||''} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))}><option value="">Pilih…</option>{options.map(o=><option key={o[valueKey]} value={o[valueKey]}>{o[valueKey]} · {o[labelKey]}</option>)}</select></label>;
 const loc=()=>select('Lokasi','locationCode',data?.locations||[],'code');
 const btn=(label:string,action:string,args:any,primary=false)=><button disabled={busy} type="button" className={primary?'btn-primary':'btn-secondary'} onClick={()=>void act(action,args,false)}>{label}</button>;
 const card='surface-card p-4 space-y-3';
 const linkJournal=(id:string)=>id&&<Link className="text-xs font-semibold text-indigo-700" href={`/accounting/journal-entries?id=${id}`}>Lihat jurnal →</Link>;
 return <AppLayout currentUser={user} breadcrumbs={[{label:'Operasional F&B'},{label:titles[area]||area}]} title={titles[area]||'Operasional F&B'} subtitle={descriptions[area]} actions={<button className="btn-secondary" onClick={()=>void load()}>Segarkan</button>}>
  {user && <nav aria-label="Tautan operasional" className="flex flex-wrap gap-3">
    {['HEAD_ADMIN','WAREHOUSE','PROCUREMENT'].includes(user.role) && <Link href="/master/products" className="btn-secondary">Bahan baku & menu</Link>}
    {area === 'production' && ['HEAD_ADMIN','WAREHOUSE'].includes(user.role) && <Link href="/master/units" className="btn-secondary">Satuan produk</Link>}
    {area === 'production' && ['HEAD_ADMIN','WAREHOUSE'].includes(user.role) && <Link href="/operations/purchase" className="btn-secondary">Atur minimum stok bahan</Link>}
    {area === 'purchase' && canPurchase && <>
      <Link href="/sales/contacts?type=vendors" className="btn-secondary">Data pemasok</Link>
      <Link href="/master/vendor-prices" className="btn-secondary">Harga pemasok</Link>
    </>}
    {area === 'purchase' && user.role !== 'WAREHOUSE' && <Link href="/purchase/orders" className="btn-secondary">Pesanan pembelian</Link>}
  </nav>}
  {!data&&!error&&<p role="status">Memuat operasional…</p>}
  {error&&!dialog&&<p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">{error}</p>}
  {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
  {data && area === 'production' && <>
    <section aria-labelledby="recipe-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="recipe-title" className="text-lg font-semibold">Resep per produk</h2>
        <button className="btn-primary" onClick={() => open('recipe', {outputQty: 1, mode: 'PRODUCTION', lines: [{productSku: '', quantity: 1}]})}>Tambah resep (BoM)</button>
      </div>
      {!data.recipes.length && <p className={card}>Buat bahan baku dan produk di Data Master, lalu tambahkan komposisi resepnya di sini.</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {data.recipes.map((recipe:any) => {
          const output = product(recipe.productSku);
          const estimatedCost = recipe.lines.reduce((sum:number, line:IngredientAmount) =>
            sum + line.quantity * (product(line.productSku)?.standardCost ?? 0), 0);
          return <article key={recipe.id} className={card}>
            <header>
              <p className="text-xs font-semibold text-indigo-700">{output?.kind === 'MATERIAL' ? 'Bahan hasil produksi' : 'Produk hasil'}</p>
              <h3 className="text-lg font-semibold">{stockName(recipe.productSku)}</h3>
              <p className="text-sm text-slate-600">{recipe.productSku} · Resep {recipe.name}</p>
            </header>
            <p className="text-sm">
              Hasil standar <strong>{amountLabel(recipe.outputQty, recipe.productSku)}</strong>
              {' · '}{recipe.mode === 'BACKFLUSH' ? 'Bahan terpakai saat POS' : 'Bahan terpakai saat produksi selesai'}
              {!recipe.active && ' · Resep nonaktif'}
            </p>
            <div className="rounded-lg bg-slate-50 p-3">
              <h4 className="text-sm font-semibold">Bahan untuk satu batch resep</h4>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {recipe.lines.map((line:IngredientAmount) => <li key={line.productSku} className="flex justify-between gap-3">
                  <span>{stockName(line.productSku)}</span>
                  <span className="shrink-0 tabular-nums">{amountLabel(line.quantity, line.productSku)}</span>
                </li>)}
              </ul>
            </div>
            <p className="text-sm text-slate-600">
              Biaya bahan {money(estimatedCost)} per batch
              {output?.kind === 'MENU' && <> · Harga jual {money(output.salesPrice)} per {output.unit}</>}
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => open('recipe', recipe)}>{recipe.active ? 'Edit resep' : 'Edit & aktifkan resep'}</button>
              {recipe.active && <button className="btn-secondary" onClick={() => open('deactivateRecipe', {id: recipe.id, version: recipe.version, mode: recipe.mode})}>Nonaktifkan resep</button>}
            </div>
          </article>;
        })}
      </div>
    </section>
    <section aria-labelledby="production-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="production-title" className="text-lg font-semibold">Perintah produksi</h2>
        <button className="btn-primary" onClick={() => open('production', {plannedQty: 1})}>Rencanakan produksi</button>
      </div>
      {!data.orders.length && <p className={card}>Belum ada perintah produksi.</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {data.orders.map((order:any) => {
          const completed = order.status === 'DONE';
          const usage: IngredientAmount[] = completed ? JSON.parse(order.actualInputs) : JSON.parse(order.recipeSnapshot.lines);
          return <article className={card} key={order.id}>
            <h3 className="font-semibold">{stockName(order.productSku, order.locationCode)} · {status[order.status]}</h3>
            <p className="break-all text-xs text-slate-500">{order.number}</p>
            <p className="text-sm">{place(order.locationCode)} · Rencana {amountLabel(order.plannedQty, order.productSku)}
              {completed && <> · Jadi <strong>{amountLabel(order.actualQty, order.productSku)}</strong></>}
            </p>
            {(completed || order.status === 'DRAFT') && <div className="rounded-lg bg-slate-50 p-3">
              <h4 className="text-sm font-semibold">{completed ? 'Bahan yang terpakai' : 'Perkiraan kebutuhan bahan'}</h4>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {usage.map(line => <li key={line.productSku} className="flex justify-between gap-3">
                  <span>{stockName(line.productSku, order.locationCode)}</span>
                  <span className="shrink-0 tabular-nums">{amountLabel(
                    completed ? line.quantity : amountFor(line.quantity, order.plannedQty, order.recipeSnapshot.outputQty), line.productSku,
                  )}</span>
                </li>)}
              </ul>
            </div>}
            {order.status === 'DRAFT' && <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => openProductionCompletion(order)}>Catat pemakaian & selesaikan</button>
              <button disabled={busy} className="btn-secondary" onClick={() => open('cancelProduction', {id: order.id})}>Batalkan rencana</button>
            </div>}
            {completed && <>
              <p className="text-sm">Biaya bahan {money(order.totalCost)} · Selisih biaya bahan {money(order.varianceValue)}</p>
              {linkJournal(order.journalId)}
            </>}
          </article>;
        })}
      </div>
    </section>
  </>}
  {data && area === 'purchase' && <>
    <section className="space-y-3" aria-labelledby="reorder-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="reorder-title" className="text-lg font-semibold">Aturan stok per lokasi</h2>
        <div className="flex flex-wrap gap-2">
          {canPurchase && <button type="button" className="btn-primary" onClick={() => open('rule', { minimum: STOCK_POLICY.minimum, target: STOCK_POLICY.target })}>Tambah aturan</button>}
          {user.role !== 'OWNER' && btn('Periksa stok sekarang', 'evaluateRules', {})}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {data.rules.map((rule:any) => <article className={card} key={rule.id}>
          <h3 className="font-semibold">{name(rule.productSku)} · {place(rule.locationCode)}</h3>
          <p className="text-sm">Tersedia <strong>{rule.available} {product(rule.productSku)?.unit}</strong> · Minimum {rule.minimum} · Target {rule.target}</p>
          <p className="text-sm text-slate-600">{rule.active ? 'Aktif' : 'Dijeda'}</p>
          {canPurchase && <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => open('rule', rule)}>Ubah aturan</button>
            {btn(rule.active ? 'Jeda aturan' : 'Aktifkan aturan','toggleRule',{id:rule.id,active:!rule.active})}
          </div>}
        </article>)}
      </div>
      {!data.rules.length && <p className={card}>Belum ada aturan stok. Tentukan batas minimum dan target untuk tiap bahan dan lokasi.</p>}
    </section>
    <section className="space-y-3" aria-labelledby="request-title">
      <h2 id="request-title" className="text-lg font-semibold">Pengajuan pembelian (PR)</h2>
      {!data.requests.length && <p className={card}>Belum ada pengajuan pembelian.</p>}
      <div className="grid md:grid-cols-2 gap-3">
        {data.requests.map((request:any) => <article id={`request-${request.id}`} className={`${card} scroll-mt-28`} key={request.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{name(request.productSku)} · {request.quantity} {product(request.productSku)?.unit}</h3>
            <span className="text-sm font-medium text-indigo-800">{status[request.status]}</span>
          </div>
          <p className="text-sm break-all">{request.number} · {place(request.locationCode)} · {date(request.createdAt)}</p>
          <p className="text-sm text-slate-600">{request.reason}</p>
          {request.purchaseOrder && <p className="text-sm">
            {user.role === 'WAREHOUSE' ? request.purchaseOrder.poNumber : <Link className="font-semibold text-indigo-700 underline" href={`/purchase/orders?id=${encodeURIComponent(request.purchaseOrder.id)}`}>{request.purchaseOrder.poNumber}</Link>}
            {' · '}{status[request.purchaseOrder.status]}{request.purchaseOrder.sentAt && ` · Pengiriman dicatat ${date(request.purchaseOrder.sentAt)}`}
          </p>}
          <div className="flex flex-wrap gap-2">
            {approver && request.status === 'PENDING' && <>
              {btn('Setujui pengajuan','approveRequest',{id:request.id},true)}
              <button type="button" disabled={busy} className="btn-secondary" onClick={() => open('rejectRequest',{id:request.id})}>Tolak & jeda aturan</button>
            </>}
            {canPurchase && request.status === 'APPROVED' && <button type="button" className="btn-primary" onClick={() => {
              const preferred = product(request.productSku)?.defaultVendorId;
              open('requestToPO', { id: request.id, vendorId: data.vendors.some((vendor:any) => vendor.id === preferred) ? preferred : '' });
            }}>Buat draft PO</button>}
          </div>
        </article>)}
      </div>
    </section>
  </>}
  {dialog&&data&&<DialogFrame onClose={()=>!busy&&setDialog('')} label={dialog === 'requestToPO' ? 'Buat draft PO' : 'Tinjau operasional'}><form onSubmit={e=>{e.preventDefault();
    if (dialog === 'finishProduction') {
      void act(dialog, {id: form.id, actualQty: form.actualQty, lotCode: form.lotCode, expiresAt: form.expiresAt,
        inputs: form.inputs.map(({productSku, quantity}:ProductionInput) => ({productSku, quantity})),
      });
    } else {
      void act(dialog, form);
    }}} className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90dvh] overflow-auto space-y-4"><h2 className="text-lg font-semibold">{{recipe:'Komposisi resep (BoM)',deactivateRecipe:'Nonaktifkan resep',production:'Rencana produksi',finishProduction:'Pemakaian aktual & hasil',rule:'Aturan pengadaan',requestToPO:'Draft pembelian dari pengajuan',cancelProduction:'Batalkan rencana produksi',rejectRequest:'Tolak pengajuan pembelian'}[dialog]}</h2>
   {error&&<p role="alert" className="text-sm text-rose-800 bg-rose-50 p-3 rounded-xl">{error}</p>}
   {dialog === 'recipe' && <>
     {form.id ? <p className="text-sm">Produk hasil <strong>{name(form.productSku)}</strong></p>
       : select('Produk hasil', 'productSku', activeProducts.filter((p:any) => !data.recipes.some((recipe:any) => recipe.productSku === p.sku)))}
     {input('Nama resep internal', 'name')}
     {input(`Jumlah hasil per batch (${product(form.productSku)?.unit ?? 'satuan produk'})`, 'outputQty', 'number')}
     <label className="block text-sm">Waktu pemakaian bahan
       <select className="input-glass w-full p-2 mt-1" value={form.mode} onChange={e => setForm((f:any) => ({...f, mode: e.target.value}))}>
         <option value="PRODUCTION">Saat produksi selesai</option>
         <option value="BACKFLUSH">Saat penjualan POS</option>
       </select>
     </label>
     <fieldset className="space-y-3 border-t pt-3">
       <legend className="text-sm font-semibold">Bahan untuk satu batch resep</legend>
       {(form.lines ?? []).map((line:IngredientAmount, i:number) => <div key={i} className="flex flex-wrap items-end gap-2">
         <label className="min-w-40 flex-1 text-sm">Bahan {i + 1}
           <select required className="input-glass w-full p-2 mt-1" value={line.productSku} onChange={e => setForm((f:any) => ({
             ...f, lines: f.lines.map((entry:IngredientAmount, index:number) => index === i ? {...entry, productSku: e.target.value} : entry),
           }))}>
             <option value="">Pilih bahan…</option>
             {materialChoices.length > 0 && <optgroup label="Bahan baku">
               {materialChoices.map((p:any) => <option key={p.sku} value={p.sku}>{p.name} · {p.sku} ({p.unit})</option>)}
             </optgroup>}
             {otherIngredients.length > 0 && <optgroup label="Produk lain dengan stok fisik">
               {otherIngredients.map((p:any) => <option key={p.sku} value={p.sku}>{p.name} · {p.sku} ({p.unit})</option>)}
             </optgroup>}
           </select>
         </label>
         <label className="text-sm">Takaran {product(line.productSku)?.unit}
           <input required type="number" min={1} step={1} className="input-glass block w-24 p-2 mt-1" value={line.quantity} onChange={e => setForm((f:any) => ({
             ...f, lines: f.lines.map((entry:IngredientAmount, index:number) => index === i ? {...entry, quantity: Number(e.target.value)} : entry),
           }))}/>
         </label>
         <button type="button" aria-label={`Hapus bahan ${i + 1}`} className="btn-secondary" disabled={busy}
           onClick={() => setForm((f:any) => ({...f, lines: f.lines.filter((_:IngredientAmount, index:number) => index !== i)}))}>Hapus</button>
       </div>)}
       <button type="button" className="btn-secondary"
         onClick={() => setForm((f:any) => ({...f, lines: [...f.lines, {productSku: '', quantity: 1}]}))}>Tambah bahan</button>
     </fieldset>
   </>}
   {dialog==='rejectRequest'&&<p className="text-sm">Pengajuan ditolak dan aturan stok untuk produk di lokasi ini dijeda agar tidak membuat pengajuan yang sama lagi. Aktifkan kembali aturan saat pengadaan boleh dilanjutkan.</p>}
   {dialog==='cancelProduction'&&<p className="text-sm">Rencana ini akan dibatalkan. Bahan dan stok belum berubah karena produksi belum diselesaikan.</p>}
   {dialog === 'production' && <>
     <label className="block text-sm">Produk yang akan dibuat
       <select required disabled={busy} className="input-glass w-full p-2 mt-1" value={form.recipeId ?? ''}
         onChange={e => setForm((f:any) => ({...f, recipeId: e.target.value}))}>
         <option value="">Pilih produk…</option>
         {data.recipes.filter((recipe:any) => recipe.active && recipe.mode === 'PRODUCTION').map((recipe:any) =>
           <option key={recipe.id} value={recipe.id}>{name(recipe.productSku)} · {recipe.name}</option>)}
       </select>
     </label>
     {loc()}
     {input('Rencana jumlah hasil', 'plannedQty', 'number')}
     {selectedRecipe && <div className="rounded-lg bg-slate-50 p-3">
       <h3 className="text-sm font-semibold">Kebutuhan untuk {amountLabel(form.plannedQty, selectedRecipe.productSku)} {name(selectedRecipe.productSku)}</h3>
       <ul className="mt-2 space-y-1 text-sm">
         {selectedRecipe.lines.map((line:IngredientAmount) => <li key={line.productSku} className="flex justify-between gap-3">
           <span>{name(line.productSku)}</span>
           <span>{amountLabel(amountFor(line.quantity, form.plannedQty, selectedRecipe.outputQty), line.productSku)}</span>
         </li>)}
       </ul>
     </div>}
   </>}
   {dialog === 'finishProduction' && <>
     <p className="text-sm">Produk hasil <strong>{name(form.productSku)}</strong></p>
     <label className="block text-sm">Jumlah jadi ({product(form.productSku)?.unit ?? 'satuan produk'})
       <input required disabled={busy} type="number" min={1} max={form.plannedQty} step={1} className="input-glass w-full p-2 mt-1"
         value={form.actualQty} onChange={e => {
           const actualQty = e.target.value === '' ? '' : Number(e.target.value);
           setForm((f:any) => ({
             ...f, actualQty, inputs: f.inputs.map((line:ProductionInput) => line.manual ? line : {
               ...line, quantity: actualQty === '' ? '' : amountFor(line.recipeQuantity, actualQty, f.batchYield),
             }),
           }));
         }}/>
     </label>
     <fieldset className="space-y-3 border-t pt-3">
       <legend className="font-semibold text-sm">Bahan yang akan dikurangi dari stok</legend>
       <p className="text-sm text-slate-600">Jumlah terisi dari resep. Sesuaikan jika pemakaian berbeda, termasuk bahan yang terbuang.</p>
       {form.inputs.map((line:ProductionInput, i:number) => <label key={line.productSku} className="block text-sm">
         {name(line.productSku)} ({product(line.productSku)?.unit ?? line.productSku})
         <input required disabled={busy} className="input-glass w-full p-2 mt-1" type="number" min={0} step={1}
           value={line.quantity} onChange={e => {
             const quantity = e.target.value === '' ? '' : Number(e.target.value);
             setForm((f:any) => ({...f, inputs: f.inputs.map((entry:ProductionInput, index:number) =>
               index === i ? {...entry, quantity, manual: true} : entry)}));
           }}/>
       </label>)}
     </fieldset>
     {product(form.productSku)?.trackLots && <>
       {input('Kode batch hasil', 'lotCode')}
       {input('Kedaluwarsa hasil', 'expiresAt', 'date')}
     </>}
   </>}
   {dialog === 'deactivateRecipe' && <p className="text-sm">{form.mode === 'BACKFLUSH' ? 'Setelah resep dinonaktifkan, POS akan mengambil stok produk jadi.' : 'Resep ini akan dikeluarkan dari pilihan rencana produksi.'}</p>}
   {dialog === 'rule' && <>
     {form.id ? <p className="text-sm font-semibold">{name(form.productSku)} · {place(form.locationCode)}</p> : <>
       {select('Produk / bahan', 'productSku', activeProducts.filter((p:any) => !backflushSkus.includes(p.sku)))}
       {loc()}
     </>}
     {input(`Batas minimum ${product(form.productSku)?.unit ?? ''}`, 'minimum', 'number')}
     {input(`Target persediaan ${product(form.productSku)?.unit ?? ''}`, 'target', 'number')}
   </>}
   {dialog === 'requestToPO' && selectedRequest && <>
     <p className="text-sm">{name(selectedRequest.productSku)} · {selectedRequest.quantity} {requestProduct?.unit} · {place(selectedRequest.locationCode)}</p>
     {select('Pemasok', 'vendorId', data.vendors, 'id')}
     {form.vendorId && <p className="text-sm">{vendorPrice ? 'Harga pemasok' : 'Biaya standar'} {money(vendorPrice?.price ?? requestProduct?.standardCost ?? 0)} per {requestProduct?.unit}</p>}
     {!data.vendors.length && <Link href="/sales/contacts?type=vendors" className="text-sm font-semibold text-indigo-700 underline">Tambahkan pemasok melalui Data Master</Link>}
     <p className="text-sm text-slate-600">Konfirmasi draft pada Pesanan pembelian untuk menyiapkan penerimaan dan mengirim PO ke pemasok.</p>
   </>}
   <div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" disabled={busy} onClick={()=>setDialog('')}>Batal</button><button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Menyimpan…' : (({ requestToPO: 'Buat draft PO', finishProduction: 'Selesaikan produksi' } as Record<string, string>)[dialog] ?? 'Simpan & proses')}</button></div>
  </form></DialogFrame>}
 </AppLayout>;
}
