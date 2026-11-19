import type { PrismaClient } from '@prisma/client';
import {businessDate,businessDayStart,businessDayEnd} from "./businessDate";
import { getActiveCompanyId } from "./prisma";
import { getCompanyById } from "./companyManager";
import { prisma } from "./prisma";

export interface OperationalMetrics {
  inventory: {
    totalUnits: number;
    whUnits: number;
    cafeUnits: number;
    reservedUnits: number;
    availableUnits: number;
    totalValuation: number;
    sourceLink: string;
  };
  receivables: {
    totalAR: number;
    openReceivableSeed: number;
    invoicedReceivable: number;
    sourceLink: string;
  };
  payables: {
    totalAP: number;
    openPayableSeed: number;
    billedPayable: number;
    sourceLink: string;
  };
  tax: { balance: number; sourceLink: string };
  bank: {
    balance: number;
    accountCode: string;
    accountName: string;
    sourceLink: string;
  };
  crm: {
    leadsCount: number;
    leadsValue: number;
    sourceLink: string;
  };
  sales: {
    confirmedOrdersCount: number;
    reservedStockUnits: number;
    sourceLink: string;
  };
  purchase: {
    confirmedOrdersCount: number;
    sourceLink: string;
  };
  pos: {
    revenue: number;
    ordersCount: number;
    sourceLink: string;
  };
  metadata: {
    companyName: string;
    reportingDate: string;
    dataset: string;
  };
}

export interface FinancialReconciliation {
  generalLedger: {
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
    difference: number;
    totalEntries: number;
  };
  inventoryReconciliation: {
    physicalUnits: number;
    physicalValuation: number;
    ledgerAccountCode: string;
    ledgerAccountName: string;
    ledgerBalance: number;
    cachedBalance: number | null;
    postingSources: {id:string; entryNumber:string; sourceDocument:string}[];
    unitDiscrepancy: number;
    valueDiscrepancy: number;
    status: "BALANCED" | "MISMATCH";
    warningMessage?: string;
    autoPostBlocked: boolean;
    sourceTrail: string[];
  };
  subledgerMatching: {
    arSubledgerTotal: number;
    arLedgerAccountBalance: number;
    arIsMatched: boolean;
    apSubledgerTotal: number;
    apLedgerAccountBalance: number;
    apIsMatched: boolean;
  };
}

/**
 * Mengambil KPI Operasional Aktual dari Database (F-20 / Wireframe S-16 / T-31)
 */
export async function getOperationalDashboardMetrics(db: PrismaClient = prisma, companyId?: string): Promise<OperationalMetrics> {
  // 1. Persediaan Fisik & Valuasi per Lokasi
  const stockLevels = await db.stockLevel.findMany({
    include: { product: true },
  });

  let totalUnits = 0;
  let whUnits = 0;
  let cafeUnits = 0;
  let reservedUnits = 0;
  let totalValuation = 0;

  for (const st of stockLevels) {
    totalUnits += st.onHand;
    if (st.locationCode === "WH-JKT") whUnits += st.onHand;
    if (st.locationCode === "CAFE-JKT") cafeUnits += st.onHand;
    reservedUnits += st.reserved;
    totalValuation += st.onHand * st.product.standardCost;
  }

  const availableUnits = totalUnits - reservedUnits;

  // 2. Piutang Dagang (A/R) - baseline customer receivables + posted uninvoiced
  const customers = await db.contact.findMany({
    where: { type: "CUSTOMER" },
  });
  const openReceivableSeed = customers.reduce((sum, c) => sum + c.openReceivable, 0);

  const customerInvoices = await db.customerInvoice.findMany({
    where: { isPosted: true, status: { in: ["POSTED","PAID"] } },
  });
  const creditNotes = await db.creditNote.aggregate({where:{returnRequest:{invoice:{status:{in:["POSTED","PAID"]}}}},_sum:{totalGross:true}});
  const invoicedReceivable = customerInvoices.reduce((sum, inv) => sum + inv.totalGross - inv.paidAmount, 0) - (creditNotes._sum.totalGross || 0);
  const totalAR = openReceivableSeed + invoicedReceivable;

  // 3. Utang Usaha (A/P) - baseline vendor payables + posted unpaid bills
  const vendors = await db.contact.findMany({
    where: { type: "VENDOR" },
  });
  const openPayableSeed = vendors.reduce((sum, v) => sum + v.openPayable, 0);

  const vendorBills = await db.vendorBill.findMany({
    where: { isPosted: true, status: { in: ["POSTED","PAID"] } },
  });
  const billedPayable = vendorBills.reduce((sum, b) => sum + b.outstandingAmount, 0);
  const totalAP = openPayableSeed + billedPayable;

  // 4. Saldo Kas & Bank (Akun 1010)
  const bankAccount = await db.account.findUnique({
    where: { code: "1010" },
  });
  const bankBalance = bankAccount?.currentBalance ?? 0;

  // 5. CRM Leads
  const leads = await db.crmLead.findMany({where:{archivedAt:null}});
  const leadsCount = leads.length;
  const leadsValue = leads.reduce((sum, l) => sum + l.expectedRevenue, 0);

  // 6. Confirmed Sales Orders
  const confirmedSO = await db.salesOrder.findMany({
    where: { status: "CONFIRMED" },
    include: { lines: true },
  });
  const confirmedOrdersCount = confirmedSO.length;
  // S00006 memiliki 6 unit reservasi
  const reservedStockUnits = confirmedSO.reduce(
    (sum, o) => sum + o.lines.reduce((lsum, l) => lsum + l.quantity, 0),
    0
  );

  // 7. Confirmed Purchase Orders
  const confirmedPO = await db.purchaseOrder.findMany({
    where: { status: "CONFIRMED" },
  });
  const confirmedPOCount = confirmedPO.length;

  // 8. POS Revenue
  const posOrders = await db.posOrder.findMany({
    where: { status: "PAID" },
  });
  const posRevenue = posOrders.reduce((sum, o) => sum + o.subtotalNet, 0);
  const company = getCompanyById(companyId || await getActiveCompanyId());

  return {
    inventory: {
      totalUnits,
      whUnits,
      cafeUnits,
      reservedUnits,
      availableUnits,
      totalValuation,
      sourceLink: "/inventory/products",
    },
    receivables: {
      totalAR,
      openReceivableSeed,
      invoicedReceivable,
      sourceLink: "/sales/contacts",
    },
    payables: {
      totalAP,
      openPayableSeed,
      billedPayable,
      sourceLink: "/accounting/vendor-bills",
    },
    tax: {balance:(await db.account.findUnique({where:{code:"2020"}}))?.currentBalance ?? 0,sourceLink:"/accounting/journal-entries"},
    bank: {
      balance: bankBalance,
      accountCode: "1010",
      accountName: bankAccount?.name || "Bank BCA",
      sourceLink: "/accounting/journal-entries",
    },
    crm: {
      leadsCount,
      leadsValue,
      sourceLink: "/crm/leads",
    },
    sales: {
      confirmedOrdersCount,
      reservedStockUnits: reservedUnits,
      sourceLink: "/sales/orders",
    },
    purchase: {
      confirmedOrdersCount: confirmedPOCount,
      sourceLink: "/purchase/orders",
    },
    pos: {
      revenue: posRevenue,
      ordersCount: posOrders.length,
      sourceLink: "/pos",
    },
    metadata: {
      companyName: company.name,
      reportingDate: new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"medium"}).format(new Date()),
      dataset: "Data perusahaan aktif",
    },
  };
}

/**
 * Validasi Keseimbangan Buku Besar & Rekonsiliasi Keuangan (F-21 / T-32 / SR-20)
 * Parameter simulatedStockDiff: digunakan untuk pengujian simulasi ketidakcocokan (T-32)
 */
export async function getFinancialReconciliation(simulatedStockDiff: number = 0): Promise<FinancialReconciliation> {
  // 1. Keseimbangan Double-Entry Buku Besar (General Ledger Balance)
  const journalItems = await prisma.journalItem.findMany({where:{journalEntry:{state:'POSTED'}}});
  const totalDebit = journalItems.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = journalItems.reduce((sum, item) => sum + item.credit, 0);
  const isBalanced = totalDebit === totalCredit;
  const difference = Math.abs(totalDebit - totalCredit);

  const totalEntries = await prisma.journalEntry.count({where:{state:'POSTED'}});

  // 2. Rekonsiliasi Persediaan: Fisik vs Akun Buku Besar 1030
  const stockLevels = await prisma.stockLevel.findMany({
    include: { product: true },
  });

  const basePhysicalUnits = stockLevels.reduce((sum, s) => sum + s.onHand, 0);
  const basePhysicalValuation = stockLevels.reduce(
    (sum, s) => sum + s.onHand * s.product.standardCost,
    0
  );

  const avgCost = basePhysicalUnits > 0 ? basePhysicalValuation / basePhysicalUnits : 0;

  // Terapkan selisih simulasi untuk pengujian T-32
  const physicalUnits = basePhysicalUnits + simulatedStockDiff;
  const physicalValuation = basePhysicalValuation + Math.round(simulatedStockDiff * avgCost);

  const inventoryAccount = await prisma.account.findUnique({
    where: { code: "1030" },
  });
  const ledgerBalance = journalItems.filter(item => item.accountCode === '1030').reduce((sum,item) => sum + item.debit - item.credit, 0);
  const cachedBalance = inventoryAccount?.currentBalance ?? null;
  const postingSources = await prisma.journalEntry.findMany({
    where: {state:'POSTED', items:{some:{accountCode:'1030'}}},
    select: {id:true, entryNumber:true, sourceDocument:true},
    orderBy: [{date:'desc'},{entryNumber:'desc'}], take:25,
  });

  const unitDiscrepancy = simulatedStockDiff;
  const valueDiscrepancy = physicalValuation - ledgerBalance;
  const isStockReconciled = simulatedStockDiff === 0 && valueDiscrepancy === 0 && cachedBalance === ledgerBalance;

  const sourceMoves = await prisma.stockMove.findMany({ orderBy: { date: 'desc' }, take: 100 });
  const sourceTrail = [
    `StockLevel: ${new Set(stockLevels.map(s => s.productSku)).size} SKU, ${new Set(stockLevels.map(s => s.locationCode)).size} lokasi`,
    `Chart of Accounts: 1030, saldo ${ledgerBalance}`,
    ...sourceMoves.map(m => `${m.moveNumber}: ${m.productSku} ${m.quantity} ${m.sourceLocation} → ${m.destLocation}; ${m.documentType} ${m.documentRef}`),
  ];

  let warningMessage: string | undefined = undefined;
  if (!isStockReconciled) {
    const scenario = simulatedStockDiff ? `Simulasi perubahan ${simulatedStockDiff} unit. ` : '';
    warningMessage = `SR-20 / T-32 · ${scenario}Selisih valuasi stok terhadap jurnal posted Rp ${valueDiscrepancy.toLocaleString("id-ID")}. Saldo akun tersimpan ${cachedBalance === null ? 'belum tersedia' : 'Rp ' + cachedBalance.toLocaleString("id-ID")}. Periksa dokumen sumber sebelum mengusulkan koreksi.`;

  }

  // 3. Subledger Matching
  const customers = await prisma.contact.findMany({ where: { type: "CUSTOMER" } });
  const liveInvoices = await prisma.customerInvoice.findMany({ where: { isPosted: true, status: { in: ["POSTED","PAID"] } } });
  const liveCredits = await prisma.creditNote.aggregate({where:{returnRequest:{invoice:{status:{in:["POSTED","PAID"]}}}},_sum:{totalGross:true}});
  const arSubledgerTotal = customers.reduce((sum, c) => sum + c.openReceivable, 0) + liveInvoices.reduce((sum,i) => sum + i.totalGross - i.paidAmount, 0) - (liveCredits._sum.totalGross || 0);
  const arAccount = await prisma.account.findUnique({ where: { code: "1020" } });
  const arLedgerAccountBalance = arAccount?.currentBalance ?? 0;

  const vendors = await prisma.contact.findMany({ where: { type: "VENDOR" } });
  const liveBills = await prisma.vendorBill.findMany({ where: { isPosted: true, status: { in: ["POSTED","PAID"] } } });
  const apSubledgerTotal = vendors.reduce((sum, v) => sum + v.openPayable, 0) + liveBills.reduce((sum,b) => sum + b.outstandingAmount, 0);
  const apAccount = await prisma.account.findUnique({ where: { code: "2010" } });
  const apLedgerAccountBalance = apAccount?.currentBalance ?? 0;

  return {
    generalLedger: {
      totalDebit,
      totalCredit,
      isBalanced,
      difference,
      totalEntries,
    },
    inventoryReconciliation: {
      physicalUnits,
      physicalValuation,
      ledgerAccountCode: "1030",
      ledgerAccountName: inventoryAccount?.name || "Persediaan Barang Dagang",
      ledgerBalance, cachedBalance, postingSources,
      unitDiscrepancy,
      valueDiscrepancy,
      status: isStockReconciled ? "BALANCED" : "MISMATCH",
      warningMessage,
      autoPostBlocked: true, // SR-20: Mencegah auto-posting untuk menutupi selisih
      sourceTrail,
    },
    subledgerMatching: {
      arSubledgerTotal,
      arLedgerAccountBalance,
      arIsMatched: arSubledgerTotal === arLedgerAccountBalance,
      apSubledgerTotal,
      apLedgerAccountBalance,
      apIsMatched: apSubledgerTotal === apLedgerAccountBalance,
    },
  };
}

// -------------------------------------------------------------
// Executive Charts & Analytics Engine (Fase 2)
// -------------------------------------------------------------

export interface LowStockItem {
  sku: string;
  name: string;
  onHand: number;
  minStock: number;
  unit: string;
}

export interface DashboardChartData {
  kpis: {
    totalSales: number;
    totalPurchases: number;
    stockValuation: number;
    lowStockCount: number;
    lowStockProducts: LowStockItem[];
    estimatedGrossProfit: number;
    grossProfitMarginPercent: number;
  };
  salesTrend: {
    period: "day" | "week" | "month";
    labels: string[];
    revenues: number[];
    orderCounts: number[];
  };
  topProducts: {
    labels: string[];
    quantities: number[];
    revenues: number[];
  };
  salesByCategory: {
    labels: string[];
    amounts: number[];
    percentages: number[];
  };
  purchasesVsSalesMonthly: {
    labels: string[];
    sales: number[];
    purchases: number[];
  };
  hasData: boolean;
}

export interface ChartFilterParams {
  locationCode?: string;
  period?: "day" | "week" | "month";
  startDate?: string | Date;
  endDate?: string | Date;
}

export async function getDashboardChartMetrics(params: ChartFilterParams = {}): Promise<DashboardChartData> {
  const period = params.period || "day";
  const now = new Date();
  
  const start = businessDayStart(params.startDate instanceof Date ? businessDate(params.startDate) : params.startDate || businessDate(new Date(now.getTime()-30*86400000)));
  const end = businessDayEnd(params.endDate instanceof Date ? businessDate(params.endDate) : params.endDate || businessDate(now));
  if(start>end) throw new Error("Tanggal mulai tidak boleh melebihi tanggal akhir.");

  // 1. Ambil data penjualan dari Sales Orders & POS Orders
  const [salesOrders, posOrders, purchaseOrders, allProducts, stockLevels] = await Promise.all([
    prisma.salesOrder.findMany({
      where: {
        status: { in: ["CONFIRMED", "DONE"] },
        ...(params.locationCode?{sourceLocation:params.locationCode}:{}),
      },
      include: {
        lines: { include: { product: true } },
      },
    }),
    prisma.posOrder.findMany({
      where: {
        status: "PAID",
        ...(params.locationCode?{locationCode:params.locationCode}:{}),
      },
      include: {
        lines: { include: { product: true } },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        status: { in: ["CONFIRMED", "DONE"] },
        ...(params.locationCode?{destLocation:params.locationCode}:{}),
      },
      include: {
        lines: { include: { product: true } },
      },
    }),
    prisma.productVariant.findMany(),
    prisma.stockLevel.findMany({
      where:params.locationCode?{locationCode:params.locationCode}:{},
      include: { product: true },
    }),
  ]);

  // 2. Perhitungan 5 Metrik Utama (KPI Cards)
  let totalSales = 0;
  let totalSalesCost = 0;
  let totalSalesNet = 0;
  
  salesOrders.forEach((so) => {
    totalSales += so.totalGross || 0;
    totalSalesNet += so.subtotalNet;
    so.lines.forEach((l) => {
      totalSalesCost += (l.quantity || 0) * (l.standardCost ?? l.product?.standardCost ?? 0);
    });
  });

  posOrders.forEach((po) => {
    totalSales += po.totalAmount || 0;
    totalSalesNet += po.subtotalNet;
    po.lines.forEach((l) => {
      totalSalesCost += (l.quantity || 0) * (l.standardCost ?? l.product?.standardCost ?? 0);
    });
  });

  let totalPurchases = 0;
  purchaseOrders.forEach((po) => {
    totalPurchases += po.total || 0;
  });

  // Nilai stok terkini
  let stockValuation = 0;
  const productStockMap = new Map<string, { onHand: number; name: string; unit: string }>();

  stockLevels.forEach((sl) => {
    stockValuation += sl.onHand * (sl.product?.standardCost || 0);
    const existing = productStockMap.get(sl.productSku) || {
      onHand: 0,
      name: sl.product?.name || sl.productSku,
      unit: sl.product?.unit || "unit",
    };
    existing.onHand += sl.onHand;
    productStockMap.set(sl.productSku, existing);
  });

  // Ambang batas stok minimum F&B (standar: 20 unit per SKU)
  const MIN_STOCK_THRESHOLD = 20;
  const lowStockProducts: LowStockItem[] = [];

  allProducts.forEach((p) => {
    const info = productStockMap.get(p.sku);
    const onHand = info ? info.onHand : 0;
    if (onHand < MIN_STOCK_THRESHOLD) {
      lowStockProducts.push({
        sku: p.sku,
        name: p.name,
        onHand,
        minStock: MIN_STOCK_THRESHOLD,
        unit: p.unit,
      });
    }
  });

  const lowStockCount = lowStockProducts.length;
  const estimatedGrossProfit = totalSalesNet - totalSalesCost;
  const grossProfitMarginPercent = totalSalesNet > 0 ? (estimatedGrossProfit / totalSalesNet) * 100 : 0;

  // 3. LINE CHART: Tren Pendapatan / Penjualan
  // Kumpulkan semua transaksi penjualan dengan tanggalnya
  type SalesPoint = { date: Date; amount: number };
  const allSalesPoints: SalesPoint[] = [];

  salesOrders.forEach((so) => {
    const d = new Date(so.orderDate || so.createdAt);
    allSalesPoints.push({ date: d, amount: so.totalGross || 0 });
  });

  posOrders.forEach((po) => {
    const d = new Date(po.orderDate || po.createdAt);
    allSalesPoints.push({ date: d, amount: po.totalAmount || 0 });
  });

  // Filter berdasarkan range tanggal
  const filteredSalesPoints = allSalesPoints.filter(
    (pt) => pt.date >= start && pt.date <= end
  );

  // Fungsi pembentuk kunci periode
  const getPeriodKey = (date: Date, p: "day" | "week" | "month"): string => {
    date = new Date(businessDate(date)+"T00:00:00Z");
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");

    if (p === "month") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      return `${monthNames[date.getUTCMonth()]} ${y}`;
    }
    if (p === "week") {
      // Hitung awal minggu (Senin)
      const day = date.getUTCDay();
      const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setUTCDate(diff));
      return `Mg ${monday.getUTCDate()} ${["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][monday.getUTCMonth()]}`;
    }
    // Default harian: DD MMM
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${d} ${monthNames[date.getUTCMonth()]}`;
  };

  const trendMap = new Map<string, { revenue: number; count: number }>();

  // Urutkan transaksi dari terlama ke terbaru
  filteredSalesPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

  filteredSalesPoints.forEach((pt) => {
    const key = getPeriodKey(pt.date, period);
    const existing = trendMap.get(key) || { revenue: 0, count: 0 };
    existing.revenue += pt.amount;
    existing.count += 1;
    trendMap.set(key, existing);
  });

  // Jika tidak ada data transaksi pada rentang filter
  const trendLabels: string[] = [];
  const trendRevenues: number[] = [];
  const trendCounts: number[] = [];

  trendMap.forEach((val, key) => {
    trendLabels.push(key);
    trendRevenues.push(Math.round(val.revenue));
    trendCounts.push(val.count);
  });

  // 4. BAR CHART 1: Top 10 Produk Terlaris
  const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();

  salesOrders.forEach((so) => {
    so.lines.forEach((l) => {
      const existing = productSalesMap.get(l.productSku) || {
        name: l.product?.name || l.productSku,
        qty: 0,
        revenue: 0,
      };
      existing.qty += l.quantity || 0;
      existing.revenue += l.totalAmount || (l.quantity * l.unitPrice) || 0;
      productSalesMap.set(l.productSku, existing);
    });
  });

  posOrders.forEach((po) => {
    po.lines.forEach((l) => {
      const existing = productSalesMap.get(l.productSku) || {
        name: l.product?.name || l.productSku,
        qty: 0,
        revenue: 0,
      };
      existing.qty += l.quantity || 0;
      existing.revenue += l.totalAmount || (l.quantity * l.unitPrice) || 0;
      productSalesMap.set(l.productSku, existing);
    });
  });

  const sortedProducts = Array.from(productSalesMap.entries())
    .map(([sku, data]) => ({ sku, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 15);

  const topProductLabels = sortedProducts.map((p) => `${p.name} · ${p.sku}`);
  const topProductQuantities = sortedProducts.map((p) => p.qty);
  const topProductRevenues = sortedProducts.map((p) => Math.round(p.revenue));

  // 5. BAR CHART 2: Penjualan per Kategori F&B
  const categorizeProduct = (sku: string, name: string): string => {
    const s = sku.toUpperCase();
    const n = name.toLowerCase();

    if (s.startsWith("RICE-") || n.includes("nasi") || n.includes("ayam") || n.includes("box")) {
      return "Makanan Utama (Rice Box)";
    }
    if (s.startsWith("COF-") || s.startsWith("TEA-") || n.includes("latte") || n.includes("kopi") || n.includes("tea")) {
      return "Kopi & Minuman Panas/Dingin";
    }
    if (s.startsWith("COOKIE-") || s.startsWith("BAKE-") || n.includes("cookie") || n.includes("roti")) {
      return "Pastry & Camilan";
    }
    if (s.startsWith("JUICE-") || s.startsWith("BEV-") || n.includes("jus") || n.includes("juice")) {
      return "Jus Buah Segar";
    }
    return "Menu Lainnya";
  };

  const categorySalesMap = new Map<string, number>();
  let totalCategoryAmount = 0;

  productSalesMap.forEach((data, sku) => {
    const cat = categorizeProduct(sku, data.name);
    const curr = categorySalesMap.get(cat) || 0;
    categorySalesMap.set(cat, curr + data.revenue);
    totalCategoryAmount += data.revenue;
  });

  const categoryLabels: string[] = [];
  const categoryAmounts: number[] = [];
  const categoryPercentages: number[] = [];

  categorySalesMap.forEach((amount, cat) => {
    categoryLabels.push(cat);
    categoryAmounts.push(Math.round(amount));
    const pct = totalCategoryAmount > 0 ? (amount / totalCategoryAmount) * 100 : 0;
    categoryPercentages.push(Math.round(pct * 10) / 10);
  });

  // 6. BAR CHART 3: Perbandingan Pembelian vs Penjualan Bulanan
  // Buat 6 bulan terakhir sebagai sumbu X
  const monthlyDataMap = new Map<string, { sales: number; purchases: number }>();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    monthlyDataMap.set(key, { sales: 0, purchases: 0 });
  }

  // Agregasi Penjualan Bulanan
  allSalesPoints.forEach((pt) => {
    const key = `${monthNames[pt.date.getMonth()]} ${pt.date.getFullYear()}`;
    if (monthlyDataMap.has(key)) {
      const entry = monthlyDataMap.get(key)!;
      entry.sales += pt.amount;
    }
  });

  // Agregasi Pembelian Bulanan
  purchaseOrders.forEach((po) => {
    const d = new Date(po.orderDate || po.createdAt);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    if (monthlyDataMap.has(key)) {
      const entry = monthlyDataMap.get(key)!;
      entry.purchases += po.total || 0;
    }
  });

  const monthlyLabels: string[] = [];
  const monthlySales: number[] = [];
  const monthlyPurchases: number[] = [];

  monthlyDataMap.forEach((val, key) => {
    monthlyLabels.push(key);
    monthlySales.push(Math.round(val.sales));
    monthlyPurchases.push(Math.round(val.purchases));
  });

  const hasData = allSalesPoints.length > 0 || purchaseOrders.length > 0;

  return {
    kpis: {
      totalSales: Math.round(totalSales),
      totalPurchases: Math.round(totalPurchases),
      stockValuation: Math.round(stockValuation),
      lowStockCount,
      lowStockProducts,
      estimatedGrossProfit: Math.round(estimatedGrossProfit),
      grossProfitMarginPercent: Math.round(grossProfitMarginPercent * 10) / 10,
    },
    salesTrend: {
      period,
      labels: trendLabels,
      revenues: trendRevenues,
      orderCounts: trendCounts,
    },
    topProducts: {
      labels: topProductLabels,
      quantities: topProductQuantities,
      revenues: topProductRevenues,
    },
    salesByCategory: {
      labels: categoryLabels,
      amounts: categoryAmounts,
      percentages: categoryPercentages,
    },
    purchasesVsSalesMonthly: {
      labels: monthlyLabels,
      sales: monthlySales,
      purchases: monthlyPurchases,
    },
    hasData,
  };
}
