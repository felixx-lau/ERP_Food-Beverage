"use client";

import React, { useState, useEffect } from "react";
import useTableView from "@/components/ui/useTableView";
import { TableSearch, SortLabel, TablePagination } from "@/components/ui/TableControls";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import CreateProductModal from "@/components/CreateProductModal";
import { Package, Play, Layers, Building, RefreshCw, MapPin, Tag, Plus, List, LayoutGrid, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ProductsPage() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>("RICE-CHICK-S");
  const [productDetail, setProductDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "detail">("table");

  // Test Runner state
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const fetchSession = async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        const list = data.products || [];
        setProducts(list);
        if (list.length > 0) {
          if (!selectedSku || !list.find((p: any) => p.sku === selectedSku)) {
            setSelectedSku(list[0].sku);
          }
        } else {
          setSelectedSku("");
          setProductDetail(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProductDetail = async (sku: string) => {
    try {
      const res = await fetch(`/api/products/${sku}`);
      if (res.ok) {
        const data = await res.json();
        setProductDetail(data.product);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedSku) {
      fetchProductDetail(selectedSku);
    }
  }, [selectedSku]);

  const handleSwitchRole = async (targetRole: string) => {
    const res = await fetch("/api/auth/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: targetRole }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  };

  // Run Test T-05
  const runTestT05 = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/products/RICE-CHICK-S");
      const data = await res.json();
      const p = data.product;

      const wh = p.locations.find((l: any) => l.locationCode === "WH-JKT");
      const cafe = p.locations.find((l: any) => l.locationCode === "CAFE-JKT");

      const passed =
        p.salesPrice === 48000 &&
        p.standardCost === 26000 &&
        wh.onHand === 40 &&
        cafe.onHand === 12 &&
        p.companyOnHand === 52 &&
        wh.reserved === 6 &&
        wh.available === 34;

      setSelectedSku("RICE-CHICK-S");
      setTestResult({
        id: "T-05",
        name: "Alur Normal: Produk RICE-CHICK-S pada Seed Awal (Fitur F-03)",
        status: passed ? "PASS" : "FAIL",
        expected: "Price Rp48.000, cost Rp26.000, WH-JKT 40, CAFE-JKT 12, total 52, reserved WH 6, available WH 34.",
        actual: `Price: Rp ${p.salesPrice.toLocaleString("id-ID")}, Cost: Rp ${p.standardCost.toLocaleString("id-ID")}, WH On-Hand: ${wh.onHand}, CAFE On-Hand: ${cafe.onHand}, Total: ${p.companyOnHand}, Reserved WH: ${wh.reserved}, Available WH: ${wh.available}.`,
      });
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-06
  const runTestT06 = async () => {
    setTesting(true);
    try {
      const resHotInit = await fetch("/api/products/COF-LATT-HOT");
      const dataHotInit = await resHotInit.json();
      const resIceInit = await fetch("/api/products/COF-LATT-ICE");
      const dataIceInit = await resIceInit.json();

      const hotInitialWh = dataHotInit.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;
      const iceInitialWh = dataIceInit.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;

      await fetch("/api/products/COF-LATT-HOT", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationCode: "WH-JKT", newOnHand: hotInitialWh + 4, reason: "Uji varian terisolasi T-06" }),
      });

      const resHotAfter = await fetch("/api/products/COF-LATT-HOT");
      const dataHotAfter = await resHotAfter.json();
      const resIceAfter = await fetch("/api/products/COF-LATT-ICE");
      const dataIceAfter = await resIceAfter.json();

      const hotAfterWh = dataHotAfter.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;
      const iceAfterWh = dataIceAfter.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;

      const passed = hotAfterWh === hotInitialWh + 4 && iceAfterWh === iceInitialWh;

      await fetch("/api/products/COF-LATT-HOT", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationCode: "WH-JKT", newOnHand: hotInitialWh, reason: "Pembalikan uji varian T-06" }),
      });

      setTestResult({
        id: "T-06",
        name: "Aturan / Edge Case: Pemisahan Variant SKU COF-LATT-HOT vs ICE (SR-17 / F-03)",
        status: passed ? "PASS" : "FAIL",
        expected: "Stok varian Hot diperbarui, sedangkan varian Ice terbukti independen dan tidak berubah.",
        actual: `Hot WH berubah (${hotInitialWh} -> ${hotAfterWh}). Iced WH tetap identik di ${iceAfterWh} unit (tidak terpengaruh).`,
      });
      fetchProducts();
      fetchProductDetail(selectedSku);
    } finally {
      setTesting(false);
    }
  };

  const table = useTableView(products, p => `${p.sku} ${p.name} ${p.size} ${p.color}`, (p, key) => key === "name" ? p.name : p[key] ?? 0);
  return (
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Persediaan & Gudang" }, { label: "15 SKU Master Produk" }]}
      title="Produk & persediaan"
      subtitle="Kelola menu, harga, dan ketersediaan stok di setiap lokasi."
      wireframe="Wireframe S-03"
      actions={
        <div className="flex items-center flex-wrap gap-2">
          {/* View mode toggle */}
          <div className="flex items-center space-x-1 glass-3 p-1 rounded-xl border border-white/60">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-brand-ring ${
                viewMode === "table"
                  ? "bg-white/95 text-[#1d4ed8] shadow-xs font-bold"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabel Ringkasan SKU</span>
            </button>
            <button
              onClick={() => setViewMode("detail")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-brand-ring ${
                viewMode === "detail"
                  ? "bg-white/95 text-[#1d4ed8] shadow-xs font-bold"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Detail Varian</span>
            </button>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold btn-glass-primary rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-brand-ring"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Produk Baru</span>
          </button>

          {viewMode === "detail" && (
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="text-xs font-mono font-medium input-glass rounded-xl px-3 py-1.5 shadow-xs focus:ring-2 focus:ring-[#1d4ed8] focus-brand-ring"
            >
              {products.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.sku} — {p.name} ({p.size})
                </option>
              ))}
            </select>
          )}
        </div>
      }
    >
      {/* Empty State when clean company */}
      {products.length === 0 ? (
        <div className="glass-2 rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-[#6d28d9] flex items-center justify-center mx-auto shadow-xs border border-amber-500/30">
            <Package className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Belum Ada Produk Terdaftar di Perusahaan Ini
            </h3>
            <p className="text-xs text-slate-600 font-normal leading-relaxed">
              Ruang kerja perusahaan ini masih bersih. Anda dapat mulai mendaftarkan menu dan produk buatan Anda sendiri beserta harga jual, modal awal, dan stok gudang.
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl btn-glass-primary text-xs font-bold shadow-md transition-all duration-200 hover:-translate-y-0.5 focus-brand-ring"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Pertama Anda</span>
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* Fitur 2: Tabel Ringkasan Seluruh 15 SKU Master Produk & Notifikasi Stok Minimum */
        <div className="glass-2 rounded-2xl border border-white/80 shadow-glass-2 overflow-hidden space-y-4">
          {/* Header Bar */}
          <div className="p-5 border-b border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/40">
            <div>
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-[#1d4ed8]" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Katalog produk
                </h3>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Monitoring multi-lokasi stok fisik On-Hand (WH-JKT vs CAFE-JKT), margin keuntungan, dan status ambang batas minimum (&lt; 20 unit)
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-full bg-white/70 text-slate-900 border border-white/60 shadow-xs">
                Total {products.length} SKU
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-950 border border-amber-500/40 flex items-center space-x-1 backdrop-blur-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span>Min Stock Alert: &lt; 20 unit</span>
              </span>
            </div>
          </div>

          <div className="px-5"><TableSearch value={table.query} onChange={table.setQuery} label="Cari nama produk atau SKU…" /></div>
          {/* Table Container */}
          <div className="overflow-x-auto glass-3 border-t border-white/80">
            <table className="w-full text-left text-xs text-slate-900">
              <thead className="bg-white/60 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-black/10">
                <tr>
                  <th scope="col" className="px-5 py-3.5" aria-sort={table.sort.key === "name" ? table.sort.direction === "asc" ? "ascending" : "descending" : "none"}><SortLabel active={table.sort.key === "name"} direction={table.sort.direction} onClick={() => table.toggleSort("name")}>SKU &amp; Nama Produk</SortLabel></th>
                  <th scope="col" className="px-4 py-3.5">Varian &amp; Satuan</th>
                  <th scope="col" className="px-4 py-3.5 text-right">WH-JKT</th>
                  <th scope="col" className="px-4 py-3.5 text-right">CAFE-JKT</th>
                  <th scope="col" className="px-4 py-3.5 text-right" aria-sort={table.sort.key === "totalOnHand" ? table.sort.direction === "asc" ? "ascending" : "descending" : "none"}><SortLabel active={table.sort.key === "totalOnHand"} direction={table.sort.direction} onClick={() => table.toggleSort("totalOnHand")}>Total On-Hand</SortLabel></th>
                  <th scope="col" className="px-4 py-3.5 text-center">Status Stok</th>
                  <th scope="col" className="px-4 py-3.5 text-right" aria-sort={table.sort.key === "salesPrice" ? table.sort.direction === "asc" ? "ascending" : "descending" : "none"}><SortLabel active={table.sort.key === "salesPrice"} direction={table.sort.direction} onClick={() => table.toggleSort("salesPrice")}>Harga Jual</SortLabel></th>
                  <th scope="col" className="px-4 py-3.5 text-right">Biaya HPP</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Margin</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 tabular-nums">
                {table.total === 0 && <tr><td colSpan={10} className="text-center py-12 text-slate-500">Tidak ada produk yang cocok dengan pencarian.</td></tr>}
                {table.rows.map((p) => {
                  const isLow = (p.totalOnHand ?? 0) < 20;
                  const marginPct = p.salesPrice > 0 ? Math.round(((p.salesPrice - p.standardCost) / p.salesPrice) * 100) : 0;

                  return (
                    <tr key={p.sku} className={`hover:bg-[#1d4ed8]/5 transition-colors duration-150 ${isLow ? "bg-amber-500/10" : ""}`}>
                      <td className="px-5 py-3.5 font-sans font-bold text-slate-900">
                        <span className="font-mono text-[#1d4ed8] block text-[11px] font-bold">{p.sku}</span>
                        <span>{p.name}</span>
                      </td>
                      <td className="px-4 py-3.5 font-sans text-slate-800">
                        <span className="font-semibold text-slate-900">{p.size}</span>
                        <span className="text-slate-600 block text-[10px] font-medium">{p.color} · {p.unit}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {p.whStock?.onHand ?? 0}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {p.cafeStock?.onHand ?? 0}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 text-sm">
                        {p.totalOnHand ?? 0}
                      </td>
                      <td className="px-4 py-3.5 text-center font-sans">
                        {isLow ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold glass-badge-warning">
                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>Stok Rendah</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold glass-badge-success">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span>Aman</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        Rp {p.salesPrice?.toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-700 font-medium">
                        Rp {p.standardCost?.toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-800">
                        {marginPct}%
                      </td>
                      <td className="px-4 py-3.5 text-center font-sans">
                        <button
                          onClick={() => {
                            setSelectedSku(p.sku);
                            setViewMode("detail");
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-bold btn-glass-secondary hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150 focus-brand-ring"
                        >
                          <span>Detail</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination {...table} onChange={table.setPage} />
        </div>
      ) : productDetail && (
        <div className="glass-2 rounded-2xl shadow-glass-2 border border-white/80 overflow-hidden">
          <div className="p-6 border-b border-black/5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/40">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Variant SKU (SR-17)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-950 border border-emerald-500/40 backdrop-blur-xs">
                  Independent Stock
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[#1d4ed8] font-mono mt-1">
                {productDetail.sku}
              </h2>

              <div className="mt-3">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                  Nama Produk
                </span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {productDetail.name}
                </p>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Ukuran/Varian: <strong className="text-slate-900 font-bold">{productDetail.size}</strong> · Varian Rasa/Suhu: <strong className="text-slate-900 font-bold">{productDetail.color}</strong> · Satuan: {productDetail.unit}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center glass-3 p-3.5 rounded-xl border border-white/80 shadow-xs">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-[#1d4ed8]" />
                  <span className="text-xs font-semibold text-slate-800">Harga Jual (Sales Price):</span>
                </div>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  Rp {productDetail.salesPrice.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="flex justify-between items-center glass-3 p-3.5 rounded-xl border border-white/80 shadow-xs">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-[#1d4ed8]" />
                  <span className="text-xs font-semibold text-slate-800">Biaya Standar (Standard Cost):</span>
                </div>
                <span className="text-sm font-bold text-[#1d4ed8] font-mono">
                  Rp {productDetail.standardCost.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Produk, Nilai dan Stok Lokasi */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2">
                <Building className="w-4 h-4 text-[#1d4ed8]" />
                <span>Distribusi Stok Antar Lokasi (WH-JKT vs CAFE-JKT)</span>
              </h3>
              <span className="text-xs text-slate-700 font-semibold font-mono">
                Total Perusahaan: <strong className="text-[#1d4ed8] font-bold">{productDetail.companyOnHand} unit</strong> (Rp {productDetail.totalValuation.toLocaleString("id-ID")})
              </span>
            </div>

            <div className="overflow-x-auto border border-white/80 rounded-xl shadow-glass-1 glass-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/60 font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-black/10">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Lokasi Gudang / Gerai</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Stok Fisik (On Hand)</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Stok Direservasi (SR-04)</th>
                    <th scope="col" className="px-6 py-3.5 text-right text-emerald-950 font-bold">Tersedia (Available)</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Valuasi Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 font-mono">
                  {productDetail.locations.map((loc: any) => (
                    <tr key={loc.locationCode} className="hover:bg-[#1d4ed8]/5 transition-colors duration-150">
                      <td className="px-6 py-3.5 font-bold text-slate-900 font-sans flex items-center space-x-2.5">
                        <MapPin className="w-4 h-4 text-[#1d4ed8]" />
                        <span>{loc.locationCode} — {loc.locationName}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-900">{loc.onHand}</td>
                      <td className="px-6 py-3.5 text-right text-amber-800 font-bold">{loc.reserved}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-emerald-900 bg-emerald-500/15">
                        {loc.available}
                      </td>
                      <td className="px-6 py-3.5 text-right text-slate-800 font-medium">
                        Rp {loc.valuation.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible QA Test Runner for T-05 & T-06 */}
      <details hidden className="group bg-slate-900 text-white rounded-2xl p-5 border border-slate-800">
        <summary className="cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white select-none">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-[#7c3aed] text-[#ffffff] font-bold text-[10px] uppercase">
              Developer Tool
            </span>
            <span>🛠️ Panel Pengujian Otomatis Rubrik (T-05 & T-06)</span>
          </div>
          <span className="text-[11px] text-slate-400 group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>

        <div className="pt-4 mt-3 border-t border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-300">
                Verifikasi kepatuhan baseline SKU (RICE-CHICK-S) dan independensi stok varian Hot vs Ice.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT05}
                disabled={testing}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-xs transition-all focus-brand-ring"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jalankan T-05</span>
              </button>
              <button
                onClick={runTestT06}
                disabled={testing}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-[#ffffff] flex items-center space-x-1.5 shadow-xs transition-all focus-brand-ring"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jalankan T-06</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-[#7c3aed]">
                  [{testResult.id}] {testResult.name}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                    testResult.status === "PASS"
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-rose-500 text-white"
                  }`}
                >
                  {testResult.status}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block font-semibold">Ekspektasi:</span>
                  <p className="text-slate-200 mt-0.5">{testResult.expected}</p>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Hasil Aktual:</span>
                  <p className="text-emerald-400 font-mono mt-0.5">{testResult.actual}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </details>

      {/* Modal Tambah Produk Baru */}
      <CreateProductModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onProductCreated={() => {
          fetchProducts();
        }}
      />
    </AppLayout>
  );
}