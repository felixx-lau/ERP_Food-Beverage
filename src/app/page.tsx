'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Package, ShoppingBag, ShoppingCart, UserPlus } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import OperationalOverview from '@/components/OperationalOverview';
import CreateProductModal from '@/components/CreateProductModal';
import CreateContactModal from '@/components/CreateContactModal';
import CreateSalesOrderModal from '@/components/CreateSalesOrderModal';
import CreatePurchaseOrderModal from '@/components/CreatePurchaseOrderModal';
import { APPS_CATALOG } from '@/components/AppSwitcherModal';
import { useCompany } from '@/context/CompanyContext';
import { publishDataRefresh } from '@/components/ui/useDataRefresh';

const destinations:Record<string,string>={sales:'/sales/orders',crm:'/crm/leads',purchase:'/purchase/orders',inventory:'/inventory/products',accounting:'/accounting/reports',invoicing:'/accounting/invoices',pos:'/pos',dashboard:'/dashboard'};
const workplaces:Record<string,{href:string;label:string;hint:string}>={
  OWNER:{href:"/sales/orders",label:"Tinjau pesanan dan diskon",hint:"Periksa pesanan, setujui diskon, atau buka laporan perusahaan."},
  HEAD_ADMIN:{href:'/dashboard',label:'Lihat ringkasan perusahaan',hint:'Pantau kondisi perusahaan atau mulai transaksi melalui pintasan di bawah.'},
  FINANCE:{href:'/accounting/invoices',label:'Periksa tagihan pelanggan',hint:'Periksa tagihan, catat pembayaran, lalu pantau laporan keuangan.'},
  SALES:{href:'/sales/orders',label:'Lihat pesanan penjualan',hint:'Mulai dari pelanggan dan pesanan. Tim gudang melanjutkan pengiriman.'},
  WAREHOUSE:{href:'/inventory/products',label:'Periksa stok barang',hint:'Pantau stok, proses pengiriman, dan periksa barang yang diterima.'},
  PROCUREMENT:{href:'/purchase/orders',label:'Lihat pesanan pembelian',hint:'Pilih vendor, buat pesanan, lalu pantau proses penerimaan oleh tim gudang.'},
  CASHIER:{href:'/pos',label:'Buka kasir',hint:'Buka sesi kasir, catat transaksi, lalu tutup sesi setelah selesai.'},
};
export default function HomePage() {
  const router=useRouter();const {activeCompany}=useCompany();
  const [user,setUser]=useState<any>(null);
  const [modal,setModal]=useState('');
  useEffect(()=>{fetch('/api/auth/me').then(async r=>{if(!r.ok){router.replace('/login');return;}const d=await r.json();setUser(d.user);}).catch(()=>router.replace('/login'));},[router]);
  const workspace=workplaces[user?.role]||{href:'/',label:'Beranda',hint:'Pilih tugas yang tersedia untuk akun Anda.'};
  const actions=[
    {key:'product',label:'Tambah produk',hint:'Daftarkan produk dan harga',roles:['HEAD_ADMIN','WAREHOUSE'],icon:Package},
    {key:'sale',label:'Buat pesanan penjualan',hint:'Simpan draft untuk pelanggan',roles:['HEAD_ADMIN','SALES'],icon:ShoppingCart},
    {key:'contact',label:user?.role==='PROCUREMENT'?'Tambah vendor':'Tambah pelanggan',hint:user?.role==='PROCUREMENT'?'Mitra pemasok barang':'Pembeli produk Anda',roles:['HEAD_ADMIN','SALES','PROCUREMENT'],icon:UserPlus},
    {key:'purchase',label:'Buat pesanan pembelian',hint:'Simpan draft untuk vendor',roles:['HEAD_ADMIN','PROCUREMENT'],icon:ShoppingBag},
  ].filter(a=>a.roles.includes(user?.role));
  const saved=(path:string,record:any)=>{publishDataRefresh();setModal('');router.push(path+(record?.id?'?id='+encodeURIComponent(record.id):''));};
  return <AppLayout currentUser={user} title="Beranda" subtitle={activeCompany?.name} breadcrumbs={[{label:'Beranda'}]}>
    <section className="surface-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Selamat datang, {user?.name?.split(' ')[0]||'Pengguna'}.</h2><p className="text-sm text-slate-600 mt-2 max-w-2xl">{workspace.hint}</p></div><Link className="btn-primary self-start shrink-0" href={workspace.href}>{workspace.label}<ArrowRight className="w-4 h-4" aria-hidden="true"/></Link></div>
      {actions.length>0&&<div><h3 className="text-sm font-semibold mb-3">Mulai pekerjaan</h3><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{actions.map(a=><button key={a.key} onClick={()=>setModal(a.key)} className="rounded-xl border border-slate-200 p-4 text-left hover:bg-indigo-50 hover:border-indigo-200 focus-visible:outline-indigo-600"><a.icon className="w-5 h-5 text-indigo-600 mb-3" aria-hidden="true"/><span className="block text-sm font-semibold">{a.label}</span><span className="block text-xs text-slate-500 mt-1">{a.hint}</span></button>)}</div></div>}
    </section>
    {user && user.role !== 'OWNER' && <OperationalOverview identity={`${user.id}:${user.role}`}/>}
    <details open={user?.role === "OWNER" || undefined} className="surface-card p-5"><summary className="cursor-pointer font-semibold text-sm">Lihat semua modul yang tersedia</summary><p className="text-sm text-slate-500 mt-2">Modul juga dapat dibuka melalui menu samping atau pencarian halaman.</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">{APPS_CATALOG.filter(a=>a.roles.includes(user?.role)).map(a=><Link key={a.key} href={destinations[a.key]} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50"><a.icon className="w-5 h-5 text-indigo-600 shrink-0"/><span><strong className="block text-sm">{a.name}</strong><span className="block mt-1 text-xs text-slate-500">{a.desc}</span></span></Link>)}</div></details>
    <CreateProductModal isOpen={modal==='product'} onClose={()=>setModal('')} onProductCreated={()=>saved('/master/products',null)}/>
    <CreateContactModal isOpen={modal==='contact'} onClose={()=>setModal('')} defaultType={user?.role==='PROCUREMENT'?'VENDOR':'CUSTOMER'} onContactCreated={record=>saved('/sales/contacts?type='+(user?.role==='PROCUREMENT'?'vendors':'customers'),null)}/>
    <CreateSalesOrderModal isOpen={modal==='sale'} onClose={()=>setModal('')} onOrderCreated={record=>saved('/sales/orders',record)}/>
    <CreatePurchaseOrderModal isOpen={modal==='purchase'} onClose={()=>setModal('')} onOrderCreated={record=>saved('/purchase/orders',record)}/>
  </AppLayout>;
}
