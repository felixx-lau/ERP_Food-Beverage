import type { PrismaClient } from '@prisma/client';
import type { SessionUser } from './auth';
import { permit } from './validation';
import { businessDate, businessDayStart } from './businessDate';
import { STOCK_POLICY, availableStock } from './stockPolicy';

export type WorkItem = { id: string; department: string; title: string; reason: string; href: string; priority: 'HIGH' | 'NORMAL'; dueAt?: string };
const ALL = ['HEAD_ADMIN','SALES','PROCUREMENT','WAREHOUSE','FINANCE','CASHIER','KITCHEN'];
/** Read-only exceptions from source documents, scoped to the authenticated company client. */
export async function operationalOverview(db: PrismaClient, user: Pick<SessionUser,'id'|'name'|'role'>) {
  permit(user, ALL);
  const tasks: WorkItem[] = [], counts: Record<string,number> = {};
  const today = businessDayStart(businessDate());
  if (['HEAD_ADMIN','WAREHOUSE'].includes(user.role)) {
    const where = { status: { in: ['DRAFT','CONFIRMED'] as ('DRAFT'|'CONFIRMED')[] } };
    counts.deliveries = await db.deliveryOrder.count({where});
    const rows = await db.deliveryOrder.findMany({where,orderBy:{scheduledDate:'asc'},take:6});
    for (const r of rows) tasks.push({id:r.id,department:'Gudang → Sales',title:`Siapkan ${r.deliveryNumber}`,reason:`Pemenuhan dari ${r.sourceLocation}; validasi setelah barang benar-benar dikirim.`,href:`/inventory/delivery?id=${encodeURIComponent(r.id)}`,priority:r.scheduledDate<today?'HIGH':'NORMAL',dueAt:r.scheduledDate.toISOString()});
  }
  if (['HEAD_ADMIN','WAREHOUSE','PROCUREMENT'].includes(user.role)) {
    const where = { status: { in: ['DRAFT','CONFIRMED'] as ('DRAFT'|'CONFIRMED')[] }, purchaseOrder:{status:'CONFIRMED' as const} };
    counts.receipts = await db.goodsReceipt.count({where});
    const rows = await db.goodsReceipt.findMany({where,orderBy:{scheduledDate:'asc'},take:6});
    for (const r of rows) tasks.push({id:r.id,department:'Procurement → Gudang',title:`Tindak lanjuti ${r.receiptNumber}`,reason:`Rencana penerimaan di ${r.destLocation}. Cocokkan kedatangan dan hasil inspeksi.`,href:`/inventory/receipts?id=${encodeURIComponent(r.id)}`,priority:r.scheduledDate<today?'HIGH':'NORMAL',dueAt:r.scheduledDate.toISOString()});
  }
  if (['HEAD_ADMIN','FINANCE','SALES'].includes(user.role)) {
    const where={isPosted:true,outstandingAmount:{gt:0},dueDate:{lt:today}};
    counts.overdueInvoices=await db.customerInvoice.count({where});
    for(const r of await db.customerInvoice.findMany({where,orderBy:{dueDate:'asc'},take:6,include:{customer:{select:{name:true}}}})) tasks.push({id:r.id,department:'Finance → Sales',title:`Tagih ${r.invoiceNumber}`,reason:`${r.customer.name} · lewat jatuh tempo; siapkan tindak lanjut pelanggan.`,href:`/accounting/invoices?id=${encodeURIComponent(r.id)}`,priority:'HIGH',dueAt:r.dueDate?.toISOString()});
  }
  if (['HEAD_ADMIN','FINANCE'].includes(user.role)) {
    const where={deliveredQty:{gt:db.salesOrderLine.fields.invoicedQty},salesOrder:{status:{in:['CONFIRMED','DONE'] as ('CONFIRMED'|'DONE')[]}}};
    counts.uninvoicedLines=await db.salesOrderLine.count({where});
    const rows=await db.salesOrderLine.findMany({where,orderBy:{salesOrder:{orderDate:'asc'}},take:10,select:{salesOrder:{select:{id:true,orderNumber:true}}}});
    for(const r of new Map(rows.map(r=>[r.salesOrder.id,r.salesOrder])).values())tasks.push({id:`invoice:${r.id}`,department:'Gudang → Finance',title:`Siapkan invoice ${r.orderNumber}`,reason:'Ada barang terkirim yang belum masuk invoice. Tinjau pengiriman dan buat tagihan dari dokumen sumber.',href:`/sales/orders?id=${encodeURIComponent(r.id)}`,priority:'NORMAL'});
    counts.draftInvoices=await db.customerInvoice.count({where:{status:'DRAFT'}});
    for(const r of await db.customerInvoice.findMany({where:{status:'DRAFT'},orderBy:{invoiceDate:'asc'},take:4}))tasks.push({id:r.id,department:'Finance',title:`Periksa draft ${r.invoiceNumber}`,reason:'Invoice belum diposting. Cocokkan pengiriman, pajak dan jumlah sebelum posting.',href:`/accounting/invoices?id=${encodeURIComponent(r.id)}`,priority:'NORMAL'});
  }
  if (['HEAD_ADMIN','SALES'].includes(user.role)) {
    const where={status:'DRAFT' as const,discountPercent:{gt:10},discountApproved:false};
    counts.discountApprovals=await db.salesOrder.count({where});
    for(const r of await db.salesOrder.findMany({where,orderBy:{orderDate:'asc'},take:4})) tasks.push({id:r.id,department:'Sales → Owner / Head Admin',title:`Tinjau diskon ${r.orderNumber}`,reason:`Diskon ${r.discountPercent}% menunggu persetujuan Owner atau Head Admin sebelum konfirmasi.`,href:`/sales/orders?id=${encodeURIComponent(r.id)}`,priority:'NORMAL'});
  }
  if (['HEAD_ADMIN','WAREHOUSE','PROCUREMENT','CASHIER'].includes(user.role)) {
    const assignments=user.role==='CASHIER'?await db.outletAccess.findMany({where:{userId:user.id}}):[];
    const locations=await db.warehouseLocation.findMany({where:{archivedAt:null,...(user.role==='CASHIER'?{code:{in:assignments.length?assignments.map(a=>a.locationCode):['CAFE-JKT']}}:{})},select:{code:true,name:true}});
    const products=await db.productVariant.findMany({where:{archivedAt:null},select:{sku:true,name:true,unit:true,stockLevels:{select:{locationCode:true,onHand:true,reserved:true}}}});
    const low=products.flatMap(p=>locations.map(l=>({sku:p.sku,name:p.name,unit:p.unit,location:l.code,locationName:l.name,available:availableStock(p.stockLevels.find(s=>s.locationCode===l.code)||{onHand:0,reserved:0})}))).filter(s=>s.available<STOCK_POLICY.minimum).sort((a,b)=>a.available-b.available||a.sku.localeCompare(b.sku));
    counts.lowStockLocations=low.length;
    for(const r of low.slice(0,6)) tasks.push({id:`stock:${r.location}:${r.sku}`,department:user.role==='CASHIER'?'Kasir → Gudang':'Gudang → Procurement',title:`Periksa ${r.sku}`,reason:`${r.name} · ${r.locationName} (${r.location}): tersedia ${r.available} ${r.unit}. Tambah ${STOCK_POLICY.minimum-r.available} ${r.unit} agar mencapai minimum ${STOCK_POLICY.minimum}.`,href:user.role==='CASHIER'?'/pos':`/inventory/products?location=${encodeURIComponent(r.location)}&sku=${encodeURIComponent(r.sku)}`,priority:r.available<=0?'HIGH':'NORMAL'});
  }
  if(user.role==='CASHIER') {
    const session=await db.posSession.findFirst({where:{cashierId:user.id,status:'OPEN'},orderBy:{openedAt:'desc'}});
    counts.openSessions=session?1:0;
    tasks.unshift({id:session?.id||'open-pos',department:'Kasir',title:session?`Lanjutkan ${session.sessionCode}`:'Buka sesi kasir',reason:session?'Periksa transaksi dan saldo sebelum menutup sesi.':'Isi saldo awal dan pilih outlet yang ditugaskan untuk mulai melayani.',href:'/pos',priority:'NORMAL'});
  }
  return {asOf:new Date().toISOString(),role:user.role,counts,stockPolicy:STOCK_POLICY,tasks,note:'Prioritas berasal dari status dokumen, tanggal rencana/jatuh tempo, dan stok tersedia. Daftar rincian dibatasi per jenis; angka ringkasan mencakup seluruh data yang dapat diakses.'};
}
