"use client";

import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Sparkles,
  PieChart,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Info,
} from "lucide-react";
import KPICard from "./KPICard";
import LoadingState from "./ui/LoadingState";
import { DashboardChartData } from "@/lib/dashboardEngine";

// Register Chart.js plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardCharts() {
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => { const media = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReducedMotion(media.matches); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardChartData | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  // Date filters
  const [preset, setPreset] = useState<"7d" | "30d" | "month" | "year">("30d");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [seedingDemo, setSeedingDemo] = useState(false);
  const [showLowStockList, setShowLowStockList] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const fetchChartData = async (
    p = period,
    s = startDate,
    e = endDate
  ) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      q.set("period", p);
      if (s) q.set("startDate", s);
      if (e) q.set("endDate", e);

      const res = await fetch(`/api/dashboard/charts?${q.toString()}`);
      if (!res.ok) throw new Error("Data analitik tidak tersedia untuk akun ini.");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat analitik.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchChartData(period, startDate, endDate);
    }
  }, [mounted, period, startDate, endDate]);

  const handleApplyPreset = (p: "7d" | "30d" | "month" | "year") => {
    setPreset(p);
    const now = new Date();
    let s = new Date();

    if (p === "7d") {
      s.setDate(now.getDate() - 7);
      setPeriod("day");
    } else if (p === "30d") {
      s.setDate(now.getDate() - 30);
      setPeriod("day");
    } else if (p === "month") {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      setPeriod("day");
    } else if (p === "year") {
      s = new Date(now.getFullYear(), 0, 1);
      setPeriod("month");
    }

    const startStr = s.toISOString().slice(0, 10);
    const endStr = now.toISOString().slice(0, 10);
    setStartDate(startStr);
    setEndDate(endStr);
  };

  const handleLoadDemoData = async () => {
    setSeedingDemo(true);
    try {
      const res = await fetch("/api/seed/demo-charts", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchChartData(period, startDate, endDate);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSeedingDemo(false);
    }
  };

  if (!mounted) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
        Memuat antarmuka analitik...
      </div>
    );
  }

  // --- Chart Configurations ---

  // 1. Line Chart: Sales Trend
  const lineChartData = {
    labels: data?.salesTrend.labels || [],
    datasets: [
      {
        label: "Pendapatan Penjualan",
        data: data?.salesTrend.revenues || [],
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.08)",
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: "y",
      },
      {
        label: "Jumlah Transaksi",
        data: data?.salesTrend.orderCounts || [],
        borderColor: "#7c3aed",
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [5, 4],
        tension: 0.25,
        pointBackgroundColor: "#7c3aed",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 3.5,
        pointHoverRadius: 5,
        yAxisID: "y1",
      },
    ],
  };

  const lineChartOptions: any = {
    animation: reducedMotion ? false : { duration: 240 },
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 12,
          font: { family: "Inter", size: 12, weight: "normal" },
          color: "#202824",
        },
      },
      tooltip: {
        backgroundColor: "rgba(21, 26, 24, 0.92)",
        borderColor: "rgba(255, 255, 255, 0.25)",
        borderWidth: 1,
        titleFont: { size: 12, weight: "bold" },
        bodyFont: { size: 11 },
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: function (ctx: any) {
            let label = ctx.dataset.label || "";
            if (label) label += ": ";
            if (ctx.parsed.y !== null) {
              if (ctx.dataset.yAxisID === "y1") {
                label += `${ctx.parsed.y} transaksi`;
              } else {
                label += formatRupiah(ctx.parsed.y);
              }
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: {
          font: { size: 11, weight: "normal" },
          color: "#64748b",
          callback: function (val: any) {
            if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}k`;
            return `Rp ${val}`;
          },
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: {
          font: { size: 11, weight: "normal" },
          color: "#8B6920",
          stepSize: 1,
          callback: function (val: any) {
            return `${val} tx`;
          },
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11, weight: "normal" },
          color: "#64748b",
          maxRotation: 45,
        },
      },
    },
  };

  // 2. Bar Chart 1: Top 10 Products
  const topProductsData = {
    labels: data?.topProducts.labels || [],
    datasets: [
      {
        label: "Kuantitas Terjual (Unit)",
        data: data?.topProducts.quantities || [],
        backgroundColor: "rgba(37, 99, 235, 0.85)",
        hoverBackgroundColor: "#1d4ed8",
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const topProductsOptions: any = {
    indexAxis: "y",
    animation: reducedMotion ? false : { duration: 240 },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: function (ctx: any) {
            const idx = ctx.dataIndex;
            const rev = data?.topProducts.revenues[idx] || 0;
            return `Terjual: ${ctx.parsed.x} unit (Omset: ${formatRupiah(rev)})`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: { font: { size: 11, weight: "normal" }, color: "#64748b" },
      },
      y: {
        grid: { display: false },
        ticks: {
          font: { size: 11, weight: "normal" },
          color: "#64748b",
          autoSkip: false,
        },
      },
    },
  };

  // 3. Bar Chart 2: Sales by Category
  const categoryColors = [
    "#2563eb", // Royal blue
    "#7c3aed", // Vibrant violet
    "#6366f1", // Indigo
    "#0284c7", // Sky blue
    "#a855f7", // Purple
  ];

  const categoryData = {
    labels: data?.salesByCategory.labels || [],
    datasets: [
      {
        label: "Penjualan (Rp)",
        data: data?.salesByCategory.amounts || [],
        backgroundColor: categoryColors,
        borderRadius: 6,
      },
    ],
  };

  const categoryOptions: any = {
    animation: reducedMotion ? false : { duration: 240 },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 20, 0.94)",
        borderColor: "rgba(255, 255, 255, 0.25)",
        borderWidth: 1,
        titleFont: { size: 12, weight: "bold" },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: function (ctx: any) {
            const idx = ctx.dataIndex;
            const pct = data?.salesByCategory.percentages[idx] || 0;
            return `Total: ${formatRupiah(ctx.parsed.y)} (${pct}% porsi)`;
          },
        },
      },
    },
    scales: {
      y: {
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: {
          font: { size: 11, weight: "normal" },
          color: "#64748b",
          callback: function (val: any) {
            if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}k`;
            return `Rp ${val}`;
          },
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11, weight: "normal" },
          color: "#64748b",
          maxRotation: 30,
        },
      },
    },
  };

  // 4. Bar Chart 3: Purchases vs Sales Monthly
  const monthlyData = {
    labels: data?.purchasesVsSalesMonthly.labels || [],
    datasets: [
      {
        label: "Penjualan (SO + POS)",
        data: data?.purchasesVsSalesMonthly.sales || [],
        backgroundColor: "rgba(37, 99, 235, 0.90)",
        hoverBackgroundColor: "#1d4ed8",
        borderRadius: 6,
      },
      {
        label: "Pembelian Vendor (PO)",
        data: data?.purchasesVsSalesMonthly.purchases || [],
        backgroundColor: "rgba(124, 58, 237, 0.85)",
        hoverBackgroundColor: "#6d28d9",
        borderRadius: 6,
      },
    ],
  };

  const monthlyOptions: any = {
    animation: reducedMotion ? false : { duration: 240 },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 12,
          font: { size: 11, weight: "bold" },
          color: "#64748b",
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 20, 0.94)",
        borderColor: "rgba(255, 255, 255, 0.25)",
        borderWidth: 1,
        titleFont: { size: 12, weight: "bold" },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: function (ctx: any) {
            return `${ctx.dataset.label}: ${formatRupiah(ctx.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      y: {
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: {
          font: { size: 11, weight: "normal" },
          color: "#64748b",
          callback: function (val: any) {
            if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}k`;
            return `Rp ${val}`;
          },
        },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, weight: "normal" }, color: "#64748b" },
      },
    },
  };

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="bg-amber-50 text-amber-900 border border-amber-200 p-4 rounded-xl text-sm">{error}</div>}
      {loading ? <LoadingState cards={4} /> : <div className="motion-stagger grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total penjualan" value={data ? formatRupiah(data.kpis.totalSales) : "—"} subtitle="Pesanan penjualan & kasir" icon={DollarSign} />
        <KPICard title="Total pembelian" value={data ? formatRupiah(data.kpis.totalPurchases) : "—"} subtitle="Komitmen pengadaan vendor" icon={ShoppingBag} variant="gold" />
        <KPICard title="Estimasi margin pesanan" value={data ? formatRupiah(data.kpis.estimatedGrossProfit) : "—"} subtitle={data ? `Margin ${data.kpis.grossProfitMarginPercent}% · Nilai bersih tanpa PBJT − biaya standar` : "Data belum tersedia"} icon={TrendingUp} variant="sage" />
        <KPICard title="Stok perlu perhatian" value={data ? `${data.kpis.lowStockCount} SKU` : "—"} subtitle={showLowStockList ? "Tutup rincian stok" : "Lihat stok di bawah 20 unit"} icon={Package} variant={data && data.kpis.lowStockCount > 0 ? "warning" : "primary"} onClick={() => setShowLowStockList(!showLowStockList)} />
      </div>}
      {showLowStockList && data?.kpis.lowStockProducts.length === 0 && <div role="status" className="surface-card p-5 text-sm text-emerald-700">Tidak ada produk di bawah batas minimum.</div>}

      {/* Dropdown Panel: Daftar SKU Stok Kritis */}
      {showLowStockList && data && data.kpis.lowStockProducts.length > 0 && (
        <div className="glass-2 bg-amber-500/15 border border-amber-500/35 rounded-3xl p-5 shadow-glass-2 animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Daftar SKU di Bawah Ambang Batas Minimum (Perlu Reorder Pengadaan)
              </h4>
            </div>
            <span className="text-xs text-amber-800 font-bold">
              Total {data.kpis.lowStockProducts.length} Produk
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {data.kpis.lowStockProducts.map((p) => (
              <div
                key={p.sku}
                className="glass-3 rounded-xl p-3 border border-white/80 shadow-xs flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-mono text-[10px] font-bold text-[var(--glass-text-muted)] block truncate">
                    {p.sku}
                  </span>
                  <p className="text-xs font-bold text-[var(--glass-text-primary)] truncate">
                    {p.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-rose-600 block">
                    {p.onHand} {p.unit}
                  </span>
                  <span className="text-[10px] text-[var(--glass-text-muted)]">Min: {p.minStock}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar & Toggle Toolbar */}
      <div className="glass-3 rounded-2xl border border-white/80 p-4 shadow-glass-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Period Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs font-bold text-[var(--glass-text-muted)] uppercase tracking-wider mr-1">
            Periode:
          </span>
          {[
            { key: "day", label: "Harian" },
            { key: "week", label: "Mingguan" },
            { key: "month", label: "Bulanan" },
          ].map((t) => (
            <button
              key={t.key}
              aria-pressed={period === t.key}
              onClick={() => setPeriod(t.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === t.key
                  ? "bg-[#1d4ed8] text-white shadow-xs"
                  : "bg-white/60 text-[var(--glass-text-secondary)] hover:bg-white/90 border border-white/60"
              }`}
            >
              {t.label}
            </button>
          ))}

          <span className="text-black/20 mx-1 hidden sm:inline">|</span>

          {/* Quick Presets */}
          <div className="flex items-center space-x-1">
            {[
              { key: "7d", label: "7 Hari" },
              { key: "30d", label: "30 Hari" },
              { key: "month", label: "Bulan Ini" },
              { key: "year", label: "Tahun Ini" },
            ].map((p) => (
              <button
                key={p.key}
                aria-pressed={preset === p.key}
                onClick={() => handleApplyPreset(p.key as any)}
                className={`px-2.5 py-1.2 text-[11px] rounded-lg font-bold transition-all ${
                  preset === p.key
                    ? "bg-violet-50 text-violet-700 border border-violet-200"
                    : "text-[var(--glass-text-secondary)] hover:text-blue-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Inputs & Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 max-w-full text-xs text-[var(--glass-text-primary)] glass-3 border border-white/80 rounded-xl px-2.5 py-1 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[var(--glass-text-muted)] shrink-0" />
            <input
              type="date"
              aria-label="Tanggal mulai"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-[var(--glass-text-primary)] font-semibold focus:outline-none"
            />
            <span className="text-[var(--glass-text-muted)]">s/d</span>
            <input
              type="date"
              aria-label="Tanggal akhir"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-[var(--glass-text-primary)] font-semibold focus:outline-none"
            />
          </div>

          <button
            onClick={() => fetchChartData(period, startDate, endDate)}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 btn-glass-secondary rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            title="Segarkan data chart"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-700 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>


        </div>
      </div>

      {/* LINE CHART: Tren Penjualan & Transaksi */}
      <div className="glass-2 rounded-3xl border border-white/70 p-6 shadow-glass-2 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-black/5 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-bold text-[var(--glass-text-primary)] uppercase tracking-wide">
                Tren pendapatan
              </h3>
            </div>
            <p className="text-xs text-[var(--glass-text-secondary)] mt-0.5">
              Grafik fluktuasi pendapatan harian/mingguan dan jumlah order dari pesanan SO & kasir POS
            </p>
          </div>
          <span className="text-[11px] font-semibold text-[var(--glass-text-muted)] self-start sm:self-auto font-mono">
            {startDate} s/d {endDate}
          </span>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full relative">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-[var(--glass-text-muted)] space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-700" />
              <span>Memperbarui grafik penjualan...</span>
            </div>
          ) : lineChartData.labels.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 glass-3 rounded-2xl border border-dashed border-black/15">
              <div className="w-10 h-10 rounded-2xl glass-3 text-violet-700 flex items-center justify-center border border-violet-500/20">
                <Info className="w-5 h-5" />
              </div>
              <div className="max-w-md space-y-1">
                <p className="text-xs font-bold text-[var(--glass-text-primary)]">
                  Tidak Ada Transaksi Penjualan pada Rentang Tanggal Ini
                </p>
                <p className="text-[11px] text-[var(--glass-text-secondary)]">
                  Ubah rentang tanggal untuk melihat transaksi yang sudah tercatat.
                </p>
              </div>

            </div>
          ) : (
            <Line aria-label="Tren pendapatan dan jumlah transaksi" role="img" data={lineChartData} options={lineChartOptions} />
          )}
        </div>
      </div>

      {/* 3 BAR CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BAR CHART 1: Top 10 Best Sellers */}
        <div className="glass-2 rounded-3xl border border-white/70 p-5 shadow-glass-2 space-y-3 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-2.5 border-b border-black/5">
              <BarChart3 className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs font-bold text-[var(--glass-text-primary)] uppercase tracking-wide">
                Produk terlaris
              </h4>
            </div>
            <p className="text-[11px] text-[var(--glass-text-secondary)] mt-1">
              Berdasarkan kuantitas unit terjual
            </p>
          </div>

          <div className="h-64 w-full relative">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--glass-text-muted)]">
                Memuat produk terlaris...
              </div>
            ) : topProductsData.labels.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-4 text-xs text-[var(--glass-text-muted)]">
                Belum ada data produk terjual.
              </div>
            ) : (
              <Bar aria-label="Produk terlaris menurut jumlah terjual" role="img" data={topProductsData} options={topProductsOptions} />
            )}
          </div>
        </div>

        {/* BAR CHART 2: Sales by Category */}
        <div className="glass-2 rounded-3xl border border-white/70 p-5 shadow-glass-2 space-y-3 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-2.5 border-b border-black/5">
              <PieChart className="w-4 h-4 text-violet-700" />
              <h4 className="text-xs font-bold text-[var(--glass-text-primary)] uppercase tracking-wide">
                Komposisi penjualan
              </h4>
            </div>
            <p className="text-[11px] text-[var(--glass-text-secondary)] mt-1">
              Distribusi omset kategori menu restoran &amp; kafe
            </p>
          </div>

          <div className="h-64 w-full relative">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--glass-text-muted)]">
                Memuat data kategori...
              </div>
            ) : categoryData.labels.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-4 text-xs text-[var(--glass-text-muted)]">
                Belum ada data kategori.
              </div>
            ) : (
              <Doughnut data={categoryData} options={{ animation: reducedMotion ? false : { duration: 240 }, responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 16, color: "#475569" } }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatRupiah(Number(ctx.raw))}` } } } }} aria-label="Komposisi penjualan per kategori" role="img" />
            )}
          </div>
        </div>

        {/* BAR CHART 3: Purchases vs Sales Monthly */}
        <div className="glass-2 rounded-3xl border border-white/70 p-5 shadow-glass-2 space-y-3 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-2.5 border-b border-black/5">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs font-bold text-[var(--glass-text-primary)] uppercase tracking-wide">
                Penjualan & pembelian
              </h4>
            </div>
            <p className="text-[11px] text-[var(--glass-text-secondary)] mt-1">
              Perbandingan arus belanja bahan baku (PO) vs omset
            </p>
          </div>

          <div className="h-64 w-full relative">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--glass-text-muted)]">
                Memuat data bulanan...
              </div>
            ) : monthlyData.labels.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-4 text-xs text-[var(--glass-text-muted)]">
                Belum ada perbandingan bulanan.
              </div>
            ) : (
              <Bar aria-label="Perbandingan penjualan dan pembelian bulanan" role="img" data={monthlyData} options={monthlyOptions} />
            )}
          </div>
        </div>
      </div>
      {data && <details className="surface-card p-5 text-sm text-slate-600"><summary className="cursor-pointer font-medium">Lihat data grafik dalam tabel</summary><div className="mt-4 space-y-5">
        {[{title: "Pendapatan & transaksi", headers: ["Periode", "Pendapatan (Rp)", "Transaksi"], rows: data.salesTrend.labels.map((label, i) => [label, data.salesTrend.revenues[i], data.salesTrend.orderCounts[i]])},
          {title: "Produk terlaris", headers: ["Produk", "Jumlah", "Pendapatan (Rp)"], rows: data.topProducts.labels.map((label, i) => [label, data.topProducts.quantities[i], data.topProducts.revenues[i]])},
          {title: "Penjualan per kategori", headers: ["Kategori", "Penjualan (Rp)", "Persentase"], rows: data.salesByCategory.labels.map((label, i) => [label, data.salesByCategory.amounts[i], data.salesByCategory.percentages[i]])},
          {title: "Penjualan & pembelian", headers: ["Bulan", "Penjualan (Rp)", "Pembelian (Rp)"], rows: data.purchasesVsSalesMonthly.labels.map((label, i) => [label, data.purchasesVsSalesMonthly.sales[i], data.purchasesVsSalesMonthly.purchases[i]])}
        ].map(section => <div key={section.title} className="overflow-x-auto"><table><caption className="text-left font-semibold py-2">{section.title}</caption><thead><tr>{section.headers.map(h => <th key={h} scope="col" className="text-left px-3">{h}</th>)}</tr></thead><tbody>{section.rows.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className="px-3">{typeof v === "number" ? v.toLocaleString("id-ID") : v}</td>)}</tr>)}</tbody></table></div>)}
      </div></details>}
      <details hidden className="surface-card p-4 text-xs text-slate-500"><summary className="cursor-pointer font-medium">Alat demo analitik</summary><p className="my-3">Menambahkan transaksi contoh ke perusahaan aktif. Gunakan hanya untuk demonstrasi.</p>          <button
            onClick={handleLoadDemoData}
            disabled={seedingDemo}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-violet-50 to-indigo-50 hover:from-violet-100 hover:to-indigo-100 text-violet-900 border border-violet-300/60 rounded-xl text-xs font-extrabold shadow-xs transition-all disabled:opacity-50"
            title="Muat transaksi demo historis untuk visualisasi chart"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span>{seedingDemo ? "Memuat Demo..." : "Muat Data Demo"}</span>
          </button></details>
    </div>
  );
}
