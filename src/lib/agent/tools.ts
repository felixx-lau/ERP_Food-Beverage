import { businessDayStart, businessDayEnd } from "@/lib/businessDate";
import { getOperationalDashboardMetrics } from "@/lib/dashboardEngine";
import type { Role } from "@prisma/client";
import { BusinessError, permit } from "@/lib/validation";
import type { AgentContext } from "./capabilities";
import { prepareProposal } from "./proposals";
import { operationalOverview } from "@/lib/operationalOverview";
import { financialSummary } from "@/lib/financialSummary";
import { replenishmentPlan } from "@/lib/replenishment";

const ALL: Role[] = ["HEAD_ADMIN", "SALES", "WAREHOUSE", "PROCUREMENT", "FINANCE", "CASHIER"];
const permissions: Record<string, Role[]> = {
  profile: ALL, records: ALL, inventory: ALL, sop: ALL, briefing: ALL, worklist: ALL,
  dashboard_summary: ["HEAD_ADMIN", "FINANCE"],
  financial_summary: ["HEAD_ADMIN","FINANCE"],
  contacts: ["HEAD_ADMIN", "SALES", "PROCUREMENT", "FINANCE"],
  sales_orders: ["HEAD_ADMIN", "SALES", "WAREHOUSE", "FINANCE"],
  purchase_orders: ["HEAD_ADMIN", "PROCUREMENT", "WAREHOUSE", "FINANCE"],
  invoices: ["HEAD_ADMIN", "FINANCE", "SALES"],
  pos_sessions: ["HEAD_ADMIN", "CASHIER"],
  restock_plan: ["HEAD_ADMIN", "WAREHOUSE", "PROCUREMENT"],
  prepare_sales_quote: ["HEAD_ADMIN", "SALES"],
  prepare_purchase_rfq: ["HEAD_ADMIN", "PROCUREMENT"],
  prepare_transfer: ["HEAD_ADMIN", "WAREHOUSE"],
};
export function actionsFor(role: Role) { return Object.keys(permissions).filter(action => permissions[action].includes(role)); }
function query(args: Record<string, unknown>) {
  if (args.query === undefined) return "";
  if (typeof args.query !== "string" || args.query.length > 100) throw new BusinessError("Pencarian maksimal 100 karakter.");
  return args.query.trim();
}
function limit(args: Record<string, unknown>) {
  if (args.limit === undefined) return 5;
  if (!Number.isInteger(args.limit) || Number(args.limit) < 1 || Number(args.limit) > 10) throw new BusinessError("Batas hasil 1–10.");
  return Number(args.limit);
}
const guides = [
  { topic: "sales", title: "Penjualan", text: "Pilih pelanggan aktif dan SKU, isi kuantitas serta harga. Simpan quotation DRAFT. Periksa PBJT 10% dan diskon. Diskon di atas 10% membutuhkan persetujuan Head Admin. Konfirmasi sales order melalui modul Sales. Gudang memproses delivery; invoice hanya untuk barang yang sudah dikirim. Pembayaran dicatat Finance.", href: "/sales/orders" },
  { topic: "purchase", title: "Pembelian", text: "Pilih vendor aktif, SKU, kuantitas, dan harga. Simpan RFQ DRAFT, tinjau lalu konfirmasi PO di modul Purchase. Gudang menerima barang dan mencatat hasil inspeksi. Finance mencocokkan tagihan vendor dengan penerimaan dan PO sebelum posting/pembayaran.", href: "/purchase/orders" },
  { topic: "inventory", title: "Persediaan", text: "Stok tersedia = on hand dikurangi reserved. Periksa lokasi asal dan tujuan sebelum membuat transfer DRAFT. Stok baru berpindah sesudah validasi di modul Inventory. Rencana restock menggunakan ambang dan target yang dinyatakan pengguna; itu bukan kebijakan reorder otomatis perusahaan.", href: "/inventory/transfers" },
  { topic: "pos", title: "Kasir", text: "Buka sesi POS dengan saldo awal. Pilih produk dan metode pembayaran, periksa PBJT lalu selesaikan transaksi. Saat tutup sesi, hitung uang fisik dan tinjau selisih. Asisten dapat membaca sesi kasir sendiri; penyelesaian transaksi dan tutup sesi dilakukan di modul POS.", href: "/pos" },
  { topic: "finance", title: "Invoice dan penagihan", text: "Periksa status posted, jatuh tempo, dan outstanding invoice. Gunakan informasi invoice untuk menyusun draft tindak lanjut pelanggan. Periksa saldo dan dokumen sumber sebelum mencatat pembayaran. Asisten tidak mengirim pesan pelanggan atau memposting pembayaran.", href: "/accounting/invoices" },
];

export async function dispatchAgentTool(ctx: AgentContext, action: string, args: Record<string, unknown>): Promise<unknown> {
  if (!Object.hasOwn(permissions, action)) throw new BusinessError("Tool tidak tersedia.");
  permit(ctx.user, permissions[action]);
  const { db, user } = ctx;
  const q = query(args), take = limit(args);
  const range = args.start || args.end ? { ...(typeof args.start === 'string' ? {gte:businessDayStart(args.start)} : {}), ...(typeof args.end === 'string' ? {lte:businessDayEnd(args.end)} : {}) } : undefined;
  if (range?.gte && range?.lte && range.gte > range.lte) throw new BusinessError('Periode tidak valid.');
  const costAccess = ["HEAD_ADMIN", "FINANCE", "PROCUREMENT"].includes(user.role);
  if (action === 'records') {
    const configs:Record<string,{model:string;number:string;status:string;date:string;roles:string[];title:string;href:string}> = {
      vendor_bills:{model:'vendorBill',number:'billNumber',status:'status',date:'billDate',roles:['HEAD_ADMIN','FINANCE','PROCUREMENT','WAREHOUSE'],title:'Tagihan vendor',href:'/accounting/vendor-bills'},
      deliveries:{model:'deliveryOrder',number:'deliveryNumber',status:'status',date:'scheduledDate',roles:['HEAD_ADMIN','WAREHOUSE','SALES','FINANCE'],title:'Pengiriman',href:'/inventory/delivery'},
      receipts:{model:'goodsReceipt',number:'receiptNumber',status:'status',date:'scheduledDate',roles:['HEAD_ADMIN','WAREHOUSE','PROCUREMENT','FINANCE'],title:'Penerimaan barang',href:'/inventory/receipts'},
      transfers:{model:'internalTransfer',number:'transferNumber',status:'status',date:'createdAt',roles:['HEAD_ADMIN','WAREHOUSE','PROCUREMENT','FINANCE','SALES'],title:'Transfer gudang',href:'/inventory/transfers'},
      leads:{model:'crmLead',number:'id',status:'stage',date:'createdAt',roles:['HEAD_ADMIN','SALES'],title:'Peluang CRM',href:'/crm/leads'},
    };
    const kind=String(args.kind||'');
    if (!Object.hasOwn(configs,kind)) throw new BusinessError('Jenis dokumen tidak tersedia.');
    const c=configs[kind];permit(user,c.roles);
    const where={...(kind==='leads'?{archivedAt:null}:{}),...(range?{[c.date]:range}:{}),...(q?{[c.number]:{contains:q}}:{})};
    const model=(db as any)[c.model];
    const rows=await model.findMany({where,take:take+1,orderBy:{[c.date]:'desc'},select:{[c.number]:true,[c.status]:true,...(kind==='leads'?{name:true}:{}),...(kind==='vendor_bills'?{totalGross:true,outstandingAmount:true}:{})}});
    return {title:c.title,source:c.href,totalCount:await model.count({where}),hasMore:rows.length>take,records:rows.slice(0,take).map((r:any)=>({reference:r[c.number],status:r[c.status],name:r.name,total:r.totalGross,outstanding:r.outstandingAmount}))};
  }
  if (action === "worklist") { const data=await operationalOverview(db,user); return {...data,tasks:data.tasks.slice(0,take),hasMore:data.tasks.length>take}; }
  if (action === "dashboard_summary") return getOperationalDashboardMetrics(db, ctx.companyId);
  if (action === "financial_summary") return financialSummary(db, typeof args.start === "string" ? args.start : undefined, typeof args.end === "string" ? args.end : undefined);
  if (action === "profile") return { name: user.name, role: user.role, companyId: ctx.companyId, actions: actionsFor(user.role), rule: "Tool hanya menyiapkan proposal. Pengguna meninjau kartu dan menekan Simpan draft untuk membuat dokumen DRAFT." };
  if (action === "sop") {
    const requested = String(args.topic || q || "").toLowerCase();
    const relevant = guides.filter(g => !requested || `${g.topic} ${g.title} ${g.text}`.toLowerCase().includes(requested));
    return { source: "Panduan alur ERP bawaan, bukan SOP khusus perusahaan", guides: (relevant.length ? relevant : guides).slice(0, 5) };
  }
  if (action === "inventory") {
    const assigned = user.role === "CASHIER" ? await db.outletAccess.findMany({where:{userId:user.id},select:{locationCode:true}}) : [];
    const location = user.role === "CASHIER" ? undefined : typeof args.location === "string" ? args.location.slice(0, 100) : undefined;
    const scope = user.role === "CASHIER" ? {locationCode:{in:assigned.length ? assigned.map(a=>a.locationCode) : ['CAFE-JKT']}} : location ? {locationCode:location} : {};
    const productWhere = {archivedAt:null,...(q ? {OR:[{sku:{contains:q}},{name:{contains:q}}]} : {})};
    const totalProducts = await db.productVariant.count({where:productWhere});
    const totals = await db.stockLevel.aggregate({where:{product:productWhere,location:{archivedAt:null},...scope},_sum:{onHand:true,reserved:true}});
    const products = await db.productVariant.findMany({ where: { archivedAt: null, ...(q ? { OR: [{ sku: { contains: q } }, { name: { contains: q } }] } : {}) }, orderBy: { sku: "asc" }, take: take + 1,
      select: { sku: true, name: true, unit: true, salesPrice: true, ...(costAccess ? { standardCost: true, defaultVendorId: true } : {}), stockLevels: { where: { location: { archivedAt: null }, ...scope }, select: { locationCode: true, onHand: true, reserved: true } } } });
    return { currency: "IDR", totalProducts, totals:{onHand:totals._sum.onHand||0,reserved:totals._sum.reserved||0,available:(totals._sum.onHand||0)-(totals._sum.reserved||0)}, location:location || (user.role === "CASHIER" ? "Outlet yang ditugaskan" : "Semua lokasi aktif"), hasMore: products.length > take, products: products.slice(0, take).map(p => ({ ...p, stockLevels: p.stockLevels.map(s => ({ ...s, available: s.onHand - s.reserved })) })) };
  }
  if (action === "contacts") {
    const type = args.type;
    if (type !== undefined && !["CUSTOMER", "VENDOR"].includes(String(type))) throw new BusinessError("Jenis kontak CUSTOMER atau VENDOR.");
    const rows = await db.contact.findMany({ where: { archivedAt: null, ...(type ? { type: type as "CUSTOMER" | "VENDOR" } : {}), ...(q ? { OR: [{ id: { contains: q } }, { name: { contains: q } }] } : {}) }, orderBy: { id: "asc" }, take: take + 1, select: { id: true, name: true, type: true, city: true, paymentTerms: true } });
    return { totalCount:await db.contact.count({where:{archivedAt:null,...(type?{type:type as "CUSTOMER"|"VENDOR"}:{}),...(q?{OR:[{id:{contains:q}},{name:{contains:q}}]}:{})}}), type: type || "CUSTOMER_AND_VENDOR", hasMore: rows.length > take, contacts: rows.slice(0, take) };
  }
  if (action === "sales_orders") {
    const where = {...(range?{orderDate:range}:{}),...(q ? { OR: [{ orderNumber: { contains: q } }, { contact: { name: { contains: q } } }] } : {})};
    const rows = await db.salesOrder.findMany({ where, take: take + 1, orderBy: { orderDate: "desc" }, select: { id: true, orderNumber: true, status: true, orderDate: true, contact: { select: { name: true } }, ...(["HEAD_ADMIN", "SALES", "FINANCE"].includes(user.role) ? { totalGross: true } : {}), lines: { take: 10, select: { productSku: true, quantity: true, deliveredQty: true } } } });
    return { totalCount:await db.salesOrder.count({where}), currency: "IDR", hasMore: rows.length > take, orders: rows.slice(0, take) };
  }
  if (action === "purchase_orders") {
    const where = {...(range?{orderDate:range}:{}),...(q ? { OR: [{ poNumber: { contains: q } }, { vendor: { name: { contains: q } } }] } : {})};
    const rows = await db.purchaseOrder.findMany({ where, take: take + 1, orderBy: { orderDate: "desc" }, select: { id: true, poNumber: true, status: true, scheduledDate: true, vendor: { select: { name: true } }, ...(costAccess ? { total: true } : {}), lines: { take: 10, select: { productSku: true, orderedQty: true, receivedQty: true } } } });
    return { totalCount:await db.purchaseOrder.count({where}), currency: "IDR", hasMore: rows.length > take, orders: rows.slice(0, take) };
  }
  if (action === "invoices") {
    const where = { ...(range?{invoiceDate:range}:{}), ...(args.outstandingOnly === false ? {} : { isPosted: true, outstandingAmount: { gt: 0 } }), ...(q ? { OR: [{ invoiceNumber: { contains: q } }, { customer: { name: { contains: q } } }] } : {}) };
    const rows = await db.customerInvoice.findMany({ where, orderBy: [{ dueDate: "asc" }, { invoiceDate: "desc" }], take: take + 1, select: { id: true, invoiceNumber: true, status: true, dueDate: true, isPosted: true, totalGross: true, outstandingAmount: true, customer: { select: { name: true } } } });
    return { totalCount:await db.customerInvoice.count({where}), outstandingOnly:args.outstandingOnly!==false, currency: "IDR", hasMore: rows.length > take, invoices: rows.slice(0, take), note: "Hasil dibatasi; bukan total seluruh piutang. Pesan penagihan hanya draft dan belum terkirim." };
  }
  if (action === "pos_sessions") {
    const rows = await db.posSession.findMany({ where: user.role === "CASHIER" ? { cashierId: user.id } : {}, orderBy: { openedAt: "desc" }, take, select: { sessionCode: true, status: true, openedAt: true, closedAt: true, totalSales: true, totalOrders: true, openingCash: true, closingCash: true, cashier: { select: { name: true } } } });
    return { currency: "IDR", scope: user.role === "CASHIER" ? "sesi milik sendiri" : "semua kasir", sessions: rows };
  }
  if (action === "restock_plan") {
    return replenishmentPlan(db, { location: typeof args.location === "string" ? args.location : undefined, query: q, threshold: args.threshold === undefined ? undefined : Number(args.threshold), target: args.target === undefined ? undefined : Number(args.target), horizonDays: args.horizonDays === undefined ? undefined : Number(args.horizonDays), limit: take });
  }
  if (action.startsWith("prepare_")) {
    const kind = action === "prepare_sales_quote" ? "sales_quote" : action === "prepare_purchase_rfq" ? "purchase_rfq" : "transfer";
    const p = await prepareProposal(ctx, kind, args);
    return { proposalId: p.id, status: "AWAITING_USER_REVIEW", title: p.title, party: p.partyName, items: p.lines.map(l => ({ sku: l.productSku, quantity: l.quantity, unitPrice: kind === "transfer" ? undefined : l.unitPrice, discountPercent: l.discountPercent })), total: kind === "transfer" ? undefined : p.total, currency: "IDR", instruction: "Kartu tinjauan tersedia di chat. Pengguna perlu menekan Simpan draft. Dokumen bisnis belum dibuat." };
  }
  if (action === "briefing") {
    const priorities=await operationalOverview(db,user);
    const tasks: Record<string, unknown> = { priorities: {...priorities,tasks:priorities.tasks.slice(0,5),hasMore:priorities.tasks.length>5} };
    if (permissions.sales_orders.includes(user.role)) tasks.sales = { draft: await db.salesOrder.count({ where: { status: "DRAFT" } }), confirmed: await db.salesOrder.count({ where: { status: "CONFIRMED" } }) };
    if (permissions.purchase_orders.includes(user.role)) tasks.purchase = { draft: await db.purchaseOrder.count({ where: { status: "DRAFT" } }), confirmed: await db.purchaseOrder.count({ where: { status: "CONFIRMED" } }) };
    if (permissions.invoices.includes(user.role)) {
      const overdue = await db.customerInvoice.aggregate({ where: { isPosted: true, outstandingAmount: { gt: 0 }, dueDate: { lt: new Date() } }, _count: true, _sum: { outstandingAmount: true } });
      tasks.overdueInvoices = { count: overdue._count, outstanding: overdue._sum.outstandingAmount || 0, currency: "IDR" };
    }
    if (permissions.restock_plan.includes(user.role)) tasks.stockPlan = await dispatchAgentTool(ctx, "restock_plan", { limit: 5 });
    if (permissions.pos_sessions.includes(user.role)) tasks.pos = await dispatchAgentTool(ctx, "pos_sessions", { limit: 3 });
    return { asOf: new Date().toISOString(), role: user.role, tasks, instruction: "Urutkan prioritas berdasarkan data ini; sebutkan asumsi. Tawaran tindakan berikutnya harus sesuai peran." };
  }
  throw new BusinessError("Tool belum tersedia.");
}
