import { prisma } from "../src/lib/prisma";
import { getDashboardChartMetrics } from "../src/lib/dashboardEngine";
import { GET as getChartApi } from "../src/app/api/dashboard/charts/route";
import { NextRequest } from "next/server";

async function runChartTests() {
  console.log("================================================================================");
  console.log("             CHART & DASHBOARD ANALYTICS AUTOMATED TEST SUITE                   ");
  console.log("          Rasa Aruna Kitchen - F&B ERP Analytics Engine & API Verification      ");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, testName: string, detail: string) {
    if (condition) {
      console.log(`[PASS] ${testId.padEnd(8)} | ${testName.padEnd(52)} | ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testId.padEnd(8)} | ${testName.padEnd(52)} | FAILED: ${detail}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE C-01: Engine Metrics & 5 KPI Card Calculation
    // -------------------------------------------------------------------------
    console.log("--- 1. Testing getDashboardChartMetrics Base Execution & 5 KPIs ---");
    const metrics = await getDashboardChartMetrics({ period: "day" });

    assert(
      typeof metrics.kpis.totalSales === "number" && metrics.kpis.totalSales >= 0,
      "C-01.1",
      "KPI Total Penjualan valid & non-negatif",
      `totalSales = Rp ${metrics.kpis.totalSales.toLocaleString("id-ID")}`
    );

    assert(
      typeof metrics.kpis.totalPurchases === "number" && metrics.kpis.totalPurchases >= 0,
      "C-01.2",
      "KPI Total Pembelian valid & non-negatif",
      `totalPurchases = Rp ${metrics.kpis.totalPurchases.toLocaleString("id-ID")}`
    );

    assert(
      typeof metrics.kpis.stockValuation === "number" && metrics.kpis.stockValuation > 0,
      "C-01.3",
      "KPI Nilai Stok Fisik valid & positif",
      `stockValuation = Rp ${metrics.kpis.stockValuation.toLocaleString("id-ID")}`
    );

    assert(
      typeof metrics.kpis.lowStockCount === "number" && Array.isArray(metrics.kpis.lowStockProducts),
      "C-01.4",
      "KPI Stok di Bawah Minimum valid list",
      `lowStockCount = ${metrics.kpis.lowStockCount} items (threshold < 20)`
    );

    assert(
      typeof metrics.kpis.estimatedGrossProfit === "number" && typeof metrics.kpis.grossProfitMarginPercent === "number",
      "C-01.5",
      "KPI Estimasi Laba Kotor & Margin % terhitung",
      `Gross Profit = Rp ${metrics.kpis.estimatedGrossProfit.toLocaleString("id-ID")} (${metrics.kpis.grossProfitMarginPercent}%)`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE C-02: Line Chart Sales Trend & Period Granularity
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Testing Line Chart Sales Trend & Period Granularity ---");
    const dailyTrend = await getDashboardChartMetrics({ period: "day" });
    assert(
      dailyTrend.salesTrend.period === "day" &&
      dailyTrend.salesTrend.labels.length === dailyTrend.salesTrend.revenues.length &&
      dailyTrend.salesTrend.revenues.length === dailyTrend.salesTrend.orderCounts.length,
      "C-02.1",
      "Trend Harian: Labels, Revenues, dan OrderCounts sinkron",
      `Data points count: ${dailyTrend.salesTrend.labels.length}`
    );

    const weeklyTrend = await getDashboardChartMetrics({ period: "week" });
    assert(
      weeklyTrend.salesTrend.period === "week" &&
      weeklyTrend.salesTrend.labels.length === weeklyTrend.salesTrend.revenues.length,
      "C-02.2",
      "Trend Mingguan: Grouping mingguan valid",
      `Minggu terdeteksi: ${weeklyTrend.salesTrend.labels.join(", ") || "(none)"}`
    );

    const monthlyTrend = await getDashboardChartMetrics({ period: "month" });
    assert(
      monthlyTrend.salesTrend.period === "month" &&
      monthlyTrend.salesTrend.labels.length === monthlyTrend.salesTrend.revenues.length,
      "C-02.3",
      "Trend Bulanan: Grouping bulanan valid",
      `Bulan terdeteksi: ${monthlyTrend.salesTrend.labels.join(", ") || "(none)"}`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE C-03: Bar Charts (Top 10, Kategori F&B, Pembelian vs Penjualan)
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Testing Bar Charts Integrity ---");
    // Top 10
    assert(
      metrics.topProducts.labels.length <= 10 &&
      metrics.topProducts.labels.length === metrics.topProducts.quantities.length &&
      metrics.topProducts.labels.length === metrics.topProducts.revenues.length,
      "C-03.1",
      "Top 10 Produk Terlaris: Maksimal 10 item & panjang array konsisten",
      `Items returned: ${metrics.topProducts.labels.length} items (Top: ${metrics.topProducts.labels[0] || 'N/A'})`
    );

    // Categories
    assert(
      metrics.salesByCategory.labels.length === metrics.salesByCategory.amounts.length &&
      metrics.salesByCategory.amounts.length === metrics.salesByCategory.percentages.length,
      "C-03.2",
      "Kategori F&B: Array Labels, Amounts, dan Percentages konsisten",
      `Kategori: ${metrics.salesByCategory.labels.join(", ") || "(none)"}`
    );

    // Monthly Purchase vs Sales
    assert(
      metrics.purchasesVsSalesMonthly.labels.length === 6 &&
      metrics.purchasesVsSalesMonthly.sales.length === 6 &&
      metrics.purchasesVsSalesMonthly.purchases.length === 6,
      "C-03.3",
      "Perbandingan Pembelian vs Penjualan: Tepat 6 bulan historis",
      `6 Bulan: ${metrics.purchasesVsSalesMonthly.labels.join(", ")}`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE C-04: Graceful Empty State Handling
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Testing Graceful Empty State Handling ---");
    // Date filter in far future where no transactions exist
    const emptyMetrics = await getDashboardChartMetrics({
      startDate: new Date("2099-01-01"),
      endDate: new Date("2099-12-31"),
      period: "day",
    });

    assert(
      emptyMetrics.salesTrend.labels.length === 0 &&
      emptyMetrics.salesTrend.revenues.length === 0 &&
      emptyMetrics.salesTrend.orderCounts.length === 0,
      "C-04.1",
      "Empty Date Filter: Line chart mengembalikan array kosong tanpa error",
      "labels: 0, revenues: 0"
    );

    assert(
      typeof emptyMetrics.kpis.stockValuation === "number" && emptyMetrics.kpis.stockValuation > 0,
      "C-04.2",
      "Empty Date Filter: Valuasi stok tetap valid dari kondisi gudang real-time",
      `stockValuation = Rp ${emptyMetrics.kpis.stockValuation.toLocaleString("id-ID")}`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE C-05: API Route Handler Verification (/api/dashboard/charts)
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Testing Next.js Route Handler /api/dashboard/charts ---");
    const mockUrl = new URL("http://localhost:3000/api/dashboard/charts?period=week&startDate=2026-10-01&endDate=2026-10-31");
    const mockReq = new NextRequest(mockUrl);
    const apiResponse = await getChartApi(mockReq);

    assert(
      apiResponse.status === 200,
      "C-05.1",
      "API Route Handler: HTTP Status 200 OK",
      `HTTP Status: ${apiResponse.status}`
    );

    const apiJson = await apiResponse.json();
    const chartData = apiJson.data;
    assert(
      apiJson.success === true && chartData && chartData.kpis && chartData.salesTrend && chartData.topProducts && chartData.salesByCategory && chartData.purchasesVsSalesMonthly,
      "C-05.2",
      "API Route Handler: JSON response memuat semua payload chart yang dibutuhkan UI",
      `Payload keys: ${Object.keys(chartData || {}).join(", ")}`
    );

    assert(
      chartData.salesTrend.period === "week",
      "C-05.3",
      "API Route Handler: Query parameter period=week direspons dengan benar",
      `salesTrend.period: ${chartData.salesTrend.period}`
    );

    console.log("\n================================================================================");
    console.log(` HASIL TEST ANALYTICS & CHARTS: ${passed} PASSED | ${failed} FAILED `);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Fatal Error running chart tests:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runChartTests();
