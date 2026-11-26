import { discountApproval, getDiscountDecisions } from './discountApproval';
import { DISCOUNT_APPROVAL_LIMIT } from './discountPolicy';
import type { PrismaClient } from '@prisma/client';
import type { SessionUser } from './auth';
import { permit } from './validation';
import { businessDate, businessDayStart } from './businessDate';
import { invoiceChoices } from './invoiceChoices';
import { STOCK_POLICY, availableStock } from './stockPolicy';

export type WorkItem = { id: string; department: string; title: string; reason: string; href: string; priority: 'HIGH' | 'NORMAL'; dueAt?: string };
const ALL = ['OWNER','HEAD_ADMIN','SALES','PROCUREMENT','WAREHOUSE','FINANCE','CASHIER','KITCHEN'];
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
    const monitoring = user.role === 'PROCUREMENT';
    for (const receipt of rows) tasks.push({
      id: receipt.id,
      department: monitoring ? 'Procurement' : 'Gudang',
      title: `${monitoring ? 'Pantau' : 'Proses'} penerimaan ${receipt.receiptNumber}`,
      reason: monitoring
        ? `Periksa jadwal dan sisa penerimaan di ${receipt.destLocation} dari pesanan pembelian.`
        : `Periksa barang di ${receipt.destLocation}, lalu catat hasil inspeksi saat validasi.`,
      href: monitoring
        ? `/purchase/orders?id=${encodeURIComponent(receipt.purchaseOrderId)}#status-penerimaan`
        : `/inventory/receipts?id=${encodeURIComponent(receipt.id)}`,
      priority: receipt.scheduledDate < today ? 'HIGH' : 'NORMAL',
      dueAt: receipt.scheduledDate.toISOString(),
    });
  }
  if (['HEAD_ADMIN','OWNER','PROCUREMENT'].includes(user.role)) {
    const pendingStatus = user.role === 'PROCUREMENT' ? 'APPROVED' : 'PENDING';
    const where = { status: pendingStatus };
    counts.purchaseRequests = await db.purchaseRequest.count({ where });
    const requests = await db.purchaseRequest.findMany({ where, orderBy: { createdAt: 'asc' }, take: 4 });
    for (const request of requests) tasks.push({
      id: `purchase-request:${request.id}`,
      department: 'Pengadaan',
      title: `${pendingStatus === 'APPROVED' ? 'Siapkan PO dari' : 'Tinjau'} ${request.number}`,
      reason: `${request.productSku} · ${request.locationCode} · ${pendingStatus === 'APPROVED' ? 'Pengajuan sudah disetujui.' : 'Stok mencapai batas pengadaan.'}`,
      href: `/operations/purchase?id=${encodeURIComponent(request.id)}`,
      priority: 'NORMAL',
    });
  }
  if (['HEAD_ADMIN','FINANCE','SALES'].includes(user.role)) {
    const where={isPosted:true,outstandingAmount:{gt:0},dueDate:{lt:today}};
    counts.overdueInvoices=await db.customerInvoice.count({where});
    for(const r of await db.customerInvoice.findMany({where,orderBy:{dueDate:'asc'},take:6,include:{customer:{select:{name:true}}}})) tasks.push({id:r.id,department:'Finance → Sales',title:`Tagih ${r.invoiceNumber}`,reason:`${r.customer.name} · lewat jatuh tempo; siapkan tindak lanjut pelanggan.`,href:`/accounting/invoices?id=${encodeURIComponent(r.id)}`,priority:'HIGH',dueAt:r.dueDate?.toISOString()});
  }
  if (['HEAD_ADMIN','FINANCE'].includes(user.role)) {
    const candidates = await db.salesOrder.findMany({
      where: { status: 'CONFIRMED', lines: { some: { deliveredQty: { gt: db.salesOrderLine.fields.invoicedQty } } } },
      orderBy: [{ orderDate: 'asc' }, { id: 'asc' }],
      select: {
        id: true, orderNumber: true,
        lines: { select: { productSku: true, quantity: true, deliveredQty: true } },
        invoices: {
          where: { status: { not: 'CANCELLED' } },
          select: { status: true, lines: { select: { productSku: true, quantity: true } } },
        },
      },
    });
    const ready = candidates.map(order => ({ order, lines: invoiceChoices(order).filter(line => line.billable > 0) }))
      .filter(item => item.lines.length);
    counts.uninvoicedLines = ready.reduce((sum, item) => sum + item.lines.length, 0);
    for (const { order } of ready.slice(0, 10)) tasks.push({
      id: `invoice:${order.id}`, department: 'Finance', title: `Siapkan invoice ${order.orderNumber}`,
      reason: 'Ada barang terkirim yang masih siap ditagih. Pesanan sudah dipilih saat formulir dibuka.',
      href: `/accounting/invoices?salesOrderId=${encodeURIComponent(order.id)}`, priority: 'NORMAL',
    });
    counts.draftInvoices=await db.customerInvoice.count({where:{status:'DRAFT'}});
    for(const r of await db.customerInvoice.findMany({where:{status:'DRAFT'},orderBy:{invoiceDate:'asc'},take:4}))tasks.push({id:r.id,department:'Finance',title:`Periksa draft ${r.invoiceNumber}`,reason:'Invoice belum diposting. Cocokkan pengiriman, pajak dan jumlah sebelum posting.',href:`/accounting/invoices?id=${encodeURIComponent(r.id)}`,priority:'NORMAL'});
  }
  if (['HEAD_ADMIN','SALES','OWNER'].includes(user.role)) {
    const drafts = await db.salesOrder.findMany({
      where: { status: 'DRAFT', discountPercent: { gt: DISCOUNT_APPROVAL_LIMIT } },
      select: { id:true, orderNumber:true, status:true, version:true, discountPercent:true, discountApproved:true, discountApprovedBy:true },
      orderBy: { orderDate: 'asc' },
    });
    const decisions = await getDiscountDecisions(db, drafts);
    const pending = drafts.filter(order => discountApproval(order, decisions).discountApprovalStatus === 'PENDING');
    counts.discountApprovals = pending.length;
    for (const order of pending.slice(0, 4)) tasks.push({
      id:order.id, department:'Sales → Owner', title:`Tinjau diskon ${order.orderNumber}`,
      reason:`Diskon ${order.discountPercent}% menunggu persetujuan Owner sebelum konfirmasi.`,
      href:`/sales/orders?id=${encodeURIComponent(order.id)}`, priority:'NORMAL',
    });
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
