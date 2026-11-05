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
import { Line, Bar } from "react-chartjs-2";
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
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
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
    try {
      const q = new URLSearchParams();
      q.set("period", p);
      if (s) q.set("startDate", s);
      if (e) q.set("endDate", e);

      const res = await fetch(`/api/dashboard/charts?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to load chart metrics:", err);
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
          font: { family: "sans-serif", size: 11, weight: "bold" },
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
          font: { size: 10, weight: "bold" },
          color: "#0A110E",
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
          font: { size: 10, weight: "bold" },
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
          font: { size: 10, weight: "bold" },
          color: "#0A110E",
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
        ticks: { font: { size: 10, weight: "bold" }, color: "#0A110E" },
      },
      y: {
        grid: { display: false },
        ticks: {
          font: { size: 10, weight: "bold" },
          color: "#0A110E",
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
          font: { size: 10, weight: "bold" },
          color: "#0A110E",
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
          font: { size: 10, weight: "bold" },
          color: "#0A110E",
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
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 12,
          font: { size: 11, weight: "bold" },
          color: "#0A110E",
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
          font: { size: 10, weight: "bold" },
          color: "#0A110E",
          callback: function (val: any) {
            if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}k`;
            return `Rp ${val}`;
          },
        },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: "bold" }, color: "#0A110E" },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* 5 Executive KPI Cards (Fase 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Penjualan */}
        <div className="glass-2 glass-2-interactive rounded-2xl border border-white/70 p-5 shadow-glass-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--glass-text-secondary)] uppercase tracking-wider">
              Total Penjualan
            </span>
            <div className="w-9 h-9 rounded-xl glass-3 text-blue-700 border border-blue-500/25 flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[var(--glass-text-primary)] tracking-tight">
              {formatRupiah(data?.kpis.totalSales || 0)}
            </div>
            <p className="text-[11px] text-blue-800 font-semibold mt-1 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Gabungan SO Korporat & POS Kasir</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Total Pembelian */}
        <div className="glass-2 glass-2-interactive rounded-2xl border border-white/70 p-5 shadow-glass-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--glass-text-secondary)] uppercase tracking-wider">
              Total Pembelian
            </span>
            <div className="w-9 h-9 rounded-xl glass-3 text-violet-700 border border-violet-500/25 flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[var(--glass-text-primary)] tracking-tight">
              {formatRupiah(data?.kpis.totalPurchases || 0)}
            </div>
            <p className="text-[11px] text-[var(--glass-text-muted)] font-medium mt-1">
              Komitmen Pengadaan PO ke Vendor
            </p>
          </div>
        </div>

        {/* KPI 3: Nilai Stok */}
        <div className="glass-2 glass-2-interactive rounded-2xl border border-white/70 p-5 shadow-glass-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--glass-text-secondary)] uppercase tracking-wider">
              Nilai Stok Terkini
            </span>
            <div className="w-9 h-9 rounded-xl glass-3 text-blue-700 border border-blue-500/25 flex items-center justify-center shadow-xs">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[var(--glass-text-primary)] tracking-tight">
              {formatRupiah(data?.kpis.stockValuation || 0)}
            </div>
            <p className="text-[11px] text-[var(--glass-text-muted)] font-medium mt-1">
              Valuasi On-Hand Gudang & Kafe
            </p>
          </div>
        </div>

        {/* KPI 4: Stok di Bawah Minimum */}
        <div
          onClick={() => setShowLowStockList(!showLowStockList)}
          className={`glass-2 glass-2-interactive rounded-2xl border p-5 shadow-glass-2 flex flex-col justify-between cursor-pointer ${
            (data?.kpis.lowStockCount || 0) > 0
              ? "border-amber-500/50 bg-amber-500/10"
              : "border-white/70"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--glass-text-secondary)] uppercase tracking-wider">
              Stok &lt; Batas Minimum
            </span>
            <div
              className={`w-9 h-9 rounded-xl glass-3 flex items-center justify-center border shadow-xs ${
                (data?.kpis.lowStockCount || 0) > 0
                  ? "text-amber-800 border-amber-500/30"
                  : "text-emerald-700 border-emerald-500/30"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-[var(--glass-text-primary)] tracking-tight">
                {data?.kpis.lowStockCount || 0}
              </span>
              <span className="text-xs font-semibold text-[var(--glass-text-muted)]">SKU Kritis</span>
            </div>
            <p className="text-[11px] text-amber-800 font-semibold mt-1 flex items-center justify-between">
              <span>Ambang: &lt; 20 unit</span>
              <span className="underline text-[10px]">
                {showLowStockList ? "Tutup detail ▲" : "Lihat daftar ▼"}
              </span>
            </p>
          </div>
        </div>

        {/* KPI 5: Estimasi Laba Kotor */}
        <div className="glass-2 glass-2-interactive rounded-2xl border border-white/70 p-5 shadow-glass-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--glass-text-secondary)] uppercase tracking-wider">
              Estimasi Laba Kotor
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-700 text-violet-200 shadow-xs">
              Margin {data?.kpis.grossProfitMarginPercent || 0}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-700 tracking-tight">
              {formatRupiah(data?.kpis.estimatedGrossProfit || 0)}
            </div>
            <p className="text-[11px] text-[var(--glass-text-muted)] font-medium mt-1">
              Pendapatan dikurangi HPP (COGS)
            </p>
          </div>
        </div>
      </div>

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
          <div className="flex items-center space-x-1.5 text-xs text-[var(--glass-text-primary)] glass-3 border border-white/80 rounded-xl px-2.5 py-1 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[var(--glass-text-muted)] shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-[var(--glass-text-primary)] font-semibold focus:outline-none"
            />
            <span className="text-[var(--glass-text-muted)]">s/d</span>
            <input
              type="date"
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

          <button
            onClick={handleLoadDemoData}
            disabled={seedingDemo}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-violet-50 to-indigo-50 hover:from-violet-100 hover:to-indigo-100 text-violet-900 border border-violet-300/60 rounded-xl text-xs font-extrabold shadow-xs transition-all disabled:opacity-50"
            title="Muat transaksi demo historis untuk visualisasi chart"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span>{seedingDemo ? "Memuat Demo..." : "Muat Data Demo"}</span>
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
                Tren Pendapatan & Volume Transaksi (Line Chart)
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
                  Silakan ubah filter tanggal atau klik tombol <strong>"Muat Data Demo"</strong> di atas untuk memunculkan simulasi grafik secara langsung.
                </p>
              </div>
              <button
                onClick={handleLoadDemoData}
                disabled={seedingDemo}
                className="btn-glass-primary px-4 py-2 text-xs font-bold rounded-xl shadow-xs"
              >
                + Muat Data Demo Sekarang
              </button>
            </div>
          ) : (
            <Line data={lineChartData} options={lineChartOptions} />
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
                Top 10 Produk Terlaris
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
              <Bar data={topProductsData} options={topProductsOptions} />
            )}
          </div>
        </div>

        {/* BAR CHART 2: Sales by Category */}
        <div className="glass-2 rounded-3xl border border-white/70 p-5 shadow-glass-2 space-y-3 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-2.5 border-b border-black/5">
              <PieChart className="w-4 h-4 text-violet-700" />
              <h4 className="text-xs font-bold text-[var(--glass-text-primary)] uppercase tracking-wide">
                Penjualan per Kategori F&amp;B
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
              <Bar data={categoryData} options={categoryOptions} />
            )}
          </div>
        </div>

        {/* BAR CHART 3: Purchases vs Sales Monthly */}
        <div className="glass-2 rounded-3xl border border-white/70 p-5 shadow-glass-2 space-y-3 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-2.5 border-b border-black/5">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs font-bold text-[var(--glass-text-primary)] uppercase tracking-wide">
                Beli vs Jual (6 Bulan)
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
              <Bar data={monthlyData} options={monthlyOptions} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
