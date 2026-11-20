import { businessDate, businessDayStart, businessDayEnd } from "@/lib/businessDate";
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
function selections(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || value.length > 10 || value.some(item => typeof item !== 'string' || !item.trim() || item.length > 100)) {
    throw new BusinessError(`Pilih 1–10 ${label} yang valid.`);
  }
  return [...new Set(value as string[])];
}

export async function permittedInventoryLocations({ db, user }: AgentContext) {
  if (user.role !== 'CASHIER') return undefined;
  const assigned = await db.outletAccess.findMany({ where: { userId: user.id }, select: { locationCode: true } });
  return assigned.length ? assigned.map(row => row.locationCode) : ['CAFE-JKT'];
}

function accessibleDetail(role: Role, kind: string, id: string, purchaseOrderId?: string) {
  if (kind === 'receipts' && role === 'PROCUREMENT' && purchaseOrderId) {
    return `/purchase/orders?id=${encodeURIComponent(purchaseOrderId)}#status-penerimaan`;
  }
  const pages: Record<string, [string, Role[]]> = {
    sales_orders: ['/sales/orders', ['SALES']],
    purchase_orders: ['/purchase/orders', ['PROCUREMENT']],
    invoices: ['/accounting/invoices', ['FINANCE', 'SALES']],
    vendor_bills: ['/accounting/vendor-bills', ['FINANCE']],
    deliveries: ['/inventory/delivery', ['WAREHOUSE']],
    receipts: ['/inventory/receipts', ['WAREHOUSE']],
    transfers: ['/inventory/transfers', ['WAREHOUSE']],
    leads: ['/crm/leads', ['SALES']],
  };
  const page = pages[kind];
  return page && (role === 'HEAD_ADMIN' || page[1].includes(role)) ? `${page[0]}?id=${encodeURIComponent(id)}` : undefined;
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
  const reference = args.reference;
  if (reference !== undefined && (typeof reference !== 'string' || !/^[A-Z0-9][A-Z0-9/-]{0,99}$/i.test(reference))) {
    throw new BusinessError('Nomor dokumen tidak valid.');
  }
  const exactReference = typeof reference === 'string' ? reference.toUpperCase() : undefined;
  const contextArgs = { query: q || undefined, reference: exactReference, start: args.start, end: args.end, limit: take };
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
    const where = {
      ...(kind === 'leads' ? { archivedAt: null } : {}),
      ...(range ? { [c.date]: range } : {}),
      ...(exactReference ? { [c.number]: exactReference } : q ? { [c.number]: { contains: q } } : {}),
    };
    const progress = kind === 'receipts'
      ? { purchaseOrderId: true, destLocation: true, lines: { take: 11, select: { productSku: true, demandQty: true, acceptedQty: true, rejectedQty: true } } }
      : kind === 'deliveries'
        ? { sourceLocation: true, lines: { take: 11, select: { productSku: true, orderedQty: true, deliveredQty: true } } }
        : {};
    const model = (db as any)[c.model];
    const [rows, totalCount] = await Promise.all([
      model.findMany({where,take:take+1,orderBy:{[c.date]:'desc'},select:{id:true,[c.number]:true,[c.status]:true,...(kind==='leads'?{name:true}:{}),...(kind==='vendor_bills'?{totalGross:true,outstandingAmount:true}:{}),...progress}}),
      model.count({where}),
    ]);
    return {
      title: c.title, source: c.href, totalCount, hasMore: rows.length > take, reference: exactReference,
      contextArgs: { ...contextArgs, kind },
      records: rows.slice(0,take).map((row:any) => ({
        reference: row[c.number], status: row.status ?? row[c.status], name: row.name, total: row.totalGross, outstanding: row.outstandingAmount,
        location: row.sourceLocation ?? row.destLocation, lines: row.lines,
        href: accessibleDetail(user.role, kind, row.id, row.purchaseOrderId),
      })),
    };
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
    const skus = selections(args.skus, 'SKU');
    const requested = selections(args.locations ?? (typeof args.location === 'string' ? [args.location] : undefined), 'lokasi');
    const permitted = await permittedInventoryLocations(ctx);
    if (permitted && requested?.some(code => !permitted.includes(code))) throw new BusinessError('Lokasi yang diminta tidak tersedia untuk akun Anda.', 403);
    const locations = await db.warehouseLocation.findMany({
      where: { archivedAt: null, ...((requested ?? permitted) ? { code: { in: requested ?? permitted } } : {}) },
      select: { code: true, name: true },
      orderBy: { code: 'asc' },
    });
    if (requested && locations.length !== requested.length) throw new BusinessError('Lokasi yang diminta tidak ditemukan.');
    const scope = { locationCode: { in: locations.map(row => row.code) } };
    const productWhere = { archivedAt: null, ...(skus ? { sku: { in: skus } } : q ? { OR: [{ sku: { contains: q } }, { name: { contains: q } }] } : {}) };
    const [totalProducts, totals, products] = await Promise.all([
      db.productVariant.count({where:productWhere}),
      db.stockLevel.aggregate({where:{product:productWhere,...scope},_sum:{onHand:true,reserved:true}}),
      db.productVariant.findMany({where:productWhere,orderBy:{sku:'asc'},take:take+1,
        select:{sku:true,name:true,unit:true,salesPrice:true,...(costAccess?{standardCost:true,defaultVendorId:true}:{}),
          stockLevels:{where:scope,select:{locationCode:true,onHand:true,reserved:true}}}}),
    ]);
    const onHand = totals._sum.onHand ?? 0;
    const reserved = totals._sum.reserved ?? 0;
    return {
      currency: 'IDR', totalProducts, totals: { onHand, reserved, available: onHand - reserved },
      location: requested ? locations.map(row => row.code).join(', ') : permitted ? 'Outlet yang ditugaskan' : 'Semua lokasi aktif',
      contextArgs: { query: q || undefined, skus, locations: requested, limit: take },
      hasMore: products.length > take,
      products: products.slice(0,take).map(product => {
        const byLocation = new Map(product.stockLevels.map(row => [row.locationCode, row]));
        return { ...product, stockLevels: locations.map(({code, name}) => {
          const row = byLocation.get(code);
          const physical = row?.onHand ?? 0, allocated = row?.reserved ?? 0;
          return { locationCode:code, locationName:name, onHand:physical, reserved:allocated, available:physical-allocated };
        }) };
      }),
    };
  }
  if (action === "contacts") {
    const type = args.type;
    if (type !== undefined && !["CUSTOMER", "VENDOR"].includes(String(type))) throw new BusinessError("Jenis kontak CUSTOMER atau VENDOR.");
    const rows = await db.contact.findMany({ where: { archivedAt: null, ...(type ? { type: type as "CUSTOMER" | "VENDOR" } : {}), ...(q ? { OR: [{ id: { contains: q } }, { name: { contains: q } }] } : {}) }, orderBy: { id: "asc" }, take: take + 1, select: { id: true, name: true, type: true, city: true, paymentTerms: true } });
    return { totalCount:await db.contact.count({where:{archivedAt:null,...(type?{type:type as "CUSTOMER"|"VENDOR"}:{}),...(q?{OR:[{id:{contains:q}},{name:{contains:q}}]}:{})}}), type: type || "CUSTOMER_AND_VENDOR", hasMore: rows.length > take, contacts: rows.slice(0, take) };
  }
  if (action === "sales_orders") {
    const where = {...(range?{orderDate:range}:{}),...(exactReference ? { orderNumber: exactReference } : q ? { OR: [{ orderNumber: { contains: q } }, { contact: { name: { contains: q } } }] } : {})};
    const rows = await db.salesOrder.findMany({ where, take: take + 1, orderBy: { orderDate: "desc" }, select: { id: true, orderNumber: true, status: true, orderDate: true, contact: { select: { name: true } }, ...(["HEAD_ADMIN", "SALES", "FINANCE"].includes(user.role) ? { totalGross: true } : {}), lines: { take: 11, select: { productSku: true, quantity: true, deliveredQty: true } } } });
    return { totalCount:await db.salesOrder.count({where}), currency: "IDR", hasMore: rows.length > take, orders: rows.slice(0, take).map(order => ({ ...order, href: accessibleDetail(user.role, action, order.id) })), reference: exactReference, contextArgs };
  }
  if (action === "purchase_orders") {
    const where = {...(range?{orderDate:range}:{}),...(exactReference ? { poNumber: exactReference } : q ? { OR: [{ poNumber: { contains: q } }, { vendor: { name: { contains: q } } }] } : {})};
    const rows = await db.purchaseOrder.findMany({ where, take: take + 1, orderBy: { orderDate: "desc" }, select: { id: true, poNumber: true, status: true, scheduledDate: true, vendor: { select: { name: true } }, ...(costAccess ? { total: true } : {}), lines: { take: 11, select: { productSku: true, orderedQty: true, receivedQty: true } } } });
    return { totalCount:await db.purchaseOrder.count({where}), currency: "IDR", hasMore: rows.length > take, orders: rows.slice(0, take).map(order => ({ ...order, href: accessibleDetail(user.role, action, order.id) })), reference: exactReference, contextArgs };
  }
  if (action === "invoices") {
    const overdueOnly = args.overdueOnly === true;
    const outstandingOnly = overdueOnly || args.outstandingOnly !== false;
    const where = {
      ...(range ? { invoiceDate: range } : {}),
      ...(outstandingOnly ? { status: 'POSTED' as const, isPosted:true, outstandingAmount:{gt:0} } : {}),
      ...(overdueOnly ? { dueDate: { lt: businessDayStart() } } : {}),
      ...(exactReference ? { invoiceNumber: exactReference } : q ? { OR: [{ invoiceNumber: { contains:q } }, { customer: { name:{contains:q} } }] } : {}),
    };
    const [rows, totalCount] = await Promise.all([
      db.customerInvoice.findMany({where,orderBy:[{dueDate:'asc'},{invoiceDate:'desc'}],take:take+1,
        select:{id:true,invoiceNumber:true,status:true,dueDate:true,isPosted:true,totalGross:true,outstandingAmount:true,customer:{select:{name:true}}}}),
      db.customerInvoice.count({where}),
    ]);
    return {
      totalCount, outstandingOnly, overdueOnly, reference: exactReference, currency: 'IDR', hasMore: rows.length > take,
      contextArgs: { ...contextArgs, outstandingOnly, overdueOnly },
      invoices: rows.slice(0,take).map(invoice => ({ ...invoice, href: accessibleDetail(user.role, action, invoice.id), dueDate: invoice.dueDate ? businessDate(invoice.dueDate) : null })),
    };
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
      const overdue = await db.customerInvoice.aggregate({ where: { isPosted: true, outstandingAmount: { gt: 0 }, dueDate: { lt: businessDayStart() }, status: 'POSTED' }, _count: true, _sum: { outstandingAmount: true } });
      tasks.overdueInvoices = { count: overdue._count, outstanding: overdue._sum.outstandingAmount || 0, currency: "IDR" };
    }
    if (permissions.restock_plan.includes(user.role)) tasks.stockPlan = await dispatchAgentTool(ctx, "restock_plan", { limit: 5 });
    if (permissions.pos_sessions.includes(user.role)) tasks.pos = await dispatchAgentTool(ctx, "pos_sessions", { limit: 3 });
    return { asOf: new Date().toISOString(), role: user.role, tasks, instruction: "Urutkan prioritas berdasarkan data ini; sebutkan asumsi. Tawaran tindakan berikutnya harus sesuai peran." };
  }
  throw new BusinessError("Tool belum tersedia.");
}
