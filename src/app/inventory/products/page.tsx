"use client";

import React, { useState, useEffect, useRef } from "react";
import useTableView from "@/components/ui/useTableView";
import { TableSearch, SortLabel, TablePagination } from "@/components/ui/TableControls";
import ActionButton from "@/components/ui/ActionButton";
import AppLayout from "@/components/AppLayout";
import CreateProductModal from "@/components/CreateProductModal";
import { Package, Play, Building, MapPin, Tag, Plus, List, LayoutGrid, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import useDataRefresh from "@/components/ui/useDataRefresh";
import { STOCK_POLICY, availableStock } from "@/lib/stockPolicy";

const stockViews = [
  { kind: "all", label: "Semua stok" },
  { kind: "MATERIAL", label: "Bahan baku" },
  { kind: "MENU", label: "Produk siap jual" },
] as const;
type StockView = typeof stockViews[number]["kind"];
const stockLabel = (kind: string) => kind === "MATERIAL" ? "Bahan baku" : "Produk siap jual";

function StockStatus({ available, unit }: { available: number; unit: string }) {
  const shortage = STOCK_POLICY.minimum - available;
  return shortage > 0
    ? <span className="font-semibold text-amber-900">Tambah {shortage} {unit} agar mencapai minimum</span>
    : <span className="inline-flex items-center gap-1 font-semibold text-emerald-800"><CheckCircle2 className="w-3 h-3" />Memenuhi minimum ({STOCK_POLICY.minimum} {unit})</span>;
}

export default function ProductsPage() {
  const [user, setUser] = useState<any>(null);
  const [locations, setLocations] = useState<Array<{code:string;name:string}>>([]);
  const [location, setLocation] = useState("ALL");
  const [stockView, setStockView] = useState<StockView>("all");
  const [onlyLow, setOnlyLow] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loadError, setLoadError] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSku, setSelectedSku] = useState("");
  const [productDetail, setProductDetail] = useState<any>(null);
  const detailRequest = useRef(0);
  const [detailError, setDetailError] = useState("");
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
    try {
      const res = await fetch("/api/products", {cache: "no-store"});
      if (!res.ok) throw new Error("Persediaan belum dapat dimuat. Segarkan untuk mencoba lagi.");
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []); setUpdatedAt(data.asOf || new Date().toISOString()); setLoadError("");
        setProducts(data.products || []);
      }
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Persediaan gagal dimuat."); } finally {
      setLoading(false);
    }
  };

  const fetchProductDetail = async (sku: string) => {
    const request = ++detailRequest.current;
    setDetailError("");
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(sku)}`, {cache: "no-store"});
      if (!res.ok) throw new Error("Detail stok belum dapat dimuat.");
      const data = await res.json();
      if (request === detailRequest.current) setProductDetail(data.product);
    } catch {
      if (request === detailRequest.current) setDetailError("Detail stok belum dapat dimuat.");
    }
  };

  useEffect(() => {
    fetchSession();
    fetchProducts();
  }, []);

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

  const selectedLocation = locations.find(item => item.code === location);
  const visibleLocations = selectedLocation ? [selectedLocation] : locations;
  const locationName = selectedLocation?.name ?? "Semua lokasi";
  const locationOptions = [{ code: "ALL", name: "Semua lokasi" }, ...locations];
  const detailAtLocation = selectedLocation && productDetail?.locations?.find((item: {locationCode: string}) => item.locationCode === selectedLocation.code);
  const detailOnHand = selectedLocation ? detailAtLocation?.onHand ?? 0 : productDetail?.companyOnHand ?? 0;
  const detailValuation = selectedLocation ? detailAtLocation?.valuation ?? 0 : productDetail?.totalValuation ?? 0;
  const stockAt = (product: any, code: string): { onHand: number; reserved: number } =>
    product.stockLevels?.find((stock: { locationCode: string }) => stock.locationCode === code) ?? { onHand: 0, reserved: 0 };
  const shortages = (product: any) => visibleLocations.map(item => ({
    ...item,
    available: availableStock(stockAt(product, item.code)),
  })).filter(item => item.available < STOCK_POLICY.minimum);
  const materialCount = products.filter(p => p.kind === "MATERIAL").length;
  const counts = { all: products.length, MATERIAL: materialCount, MENU: products.length - materialCount };
  const productsInView = stockView === "all" ? products : products.filter(p => p.kind === stockView);
  const detailSku = productsInView.find(p => p.sku === selectedSku)?.sku ?? productsInView[0]?.sku ?? "";
  const isMaterialDetail = productDetail?.kind === "MATERIAL";
  const showSellingColumns = stockView !== "MATERIAL";

  const table = useTableView(onlyLow ? productsInView.filter(p => shortages(p).length) : productsInView,
    p => `${p.sku} ${p.name} ${p.size} ${p.color}`,
    (p, key) => key === "totalAvailable" ? (selectedLocation ? availableStock(stockAt(p, selectedLocation.code)) : p.totalAvailable) : p[key] ?? 0);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const kind = stockViews.find(view => view.kind === query.get("kind"));
    if (kind) setStockView(kind.kind);
    const code = query.get("location");
    if (code) setLocation(code);
    const sku = query.get("sku");
    if (sku) {
      table.setQuery(sku);
      setSelectedSku(sku);
    }
    if (query.get("lowStock") === "1") setOnlyLow(true);
  }, []);
  useEffect(() => {
    if (viewMode === "detail" && detailSku) void fetchProductDetail(detailSku);
  }, [viewMode, detailSku]);
  useDataRefresh(async () => {
    await fetchProducts();
    if (viewMode === "detail" && detailSku) await fetchProductDetail(detailSku);
  });

  function changeStockLocation(code: string) {
    setLocation(code);
    table.setPage(1);
    const url = new URL(window.location.href);
    if (code === "ALL") url.searchParams.delete("location");
    else url.searchParams.set("location", code);
    window.history.replaceState(null, "", url);
  }

  function changeStockView(kind: StockView) {
    setStockView(kind);
    table.setPage(1);
    if (kind === "MATERIAL" && table.sort.key === "salesPrice") table.toggleSort("name");
    const url = new URL(window.location.href);
    if (kind === "all") url.searchParams.delete("kind");
    else url.searchParams.set("kind", kind);
    window.history.replaceState(null, "", url);
  }

  const canAdjust = ["HEAD_ADMIN", "WAREHOUSE"].includes(user?.role);
  const createLabel = stockView === "MATERIAL" ? "Tambah bahan baku" : "Tambah produk";
  return (
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Persediaan & Gudang" }, { label: "Produk & lokasi" }]}
      title="Stok & ketersediaan"
      subtitle="Pantau persediaan bahan baku dan produk siap jual per gudang atau gerai."
      wireframe="Wireframe S-03"
      actions={
        <div className="flex items-center flex-wrap gap-2">
          {canAdjust && <Link className="btn-secondary" href="/inventory/movements">Koreksi stok</Link>}
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
            hidden={!["HEAD_ADMIN", "WAREHOUSE"].includes(user?.role)}
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold btn-glass-primary rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-brand-ring"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{createLabel}</span>
          </button>

          {viewMode === "detail" && productsInView.length > 0 && (
            <select
              aria-label="Pilih SKU untuk detail stok"
              value={detailSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="text-xs font-mono font-medium input-glass rounded-xl px-3 py-1.5 shadow-xs focus:ring-2 focus:ring-[#1d4ed8] focus-brand-ring"
            >
              {productsInView.map((p) => (
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
      {loadError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">{loadError}</p>}
      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Jenis persediaan" className="flex flex-wrap gap-2">
          {stockViews.map(view => (
            <button key={view.kind} type="button" aria-pressed={stockView === view.kind}
              className={stockView === view.kind ? "btn-primary" : "btn-secondary"}
              onClick={() => changeStockView(view.kind)}>
              {view.label} <span className="ml-1 tabular-nums">{counts[view.kind]}</span>
            </button>
          ))}
        </div>
        {canAdjust && <Link href="/master/products" className="text-sm font-semibold text-indigo-700 underline">Kelola jenis SKU</Link>}
        {["HEAD_ADMIN", "OWNER", "WAREHOUSE", "PROCUREMENT"].includes(user?.role) &&
          <Link href="/operations/purchase" className="text-sm font-semibold text-indigo-700 underline">Aturan pengadaan per lokasi</Link>}
      </div>
      {locations.length > 0 && (
        <section className="surface-card p-4 space-y-2" aria-labelledby="stock-location-heading">
          <h2 id="stock-location-heading" className="text-sm font-semibold">Cek stok di lokasi</h2>
          <div role="group" aria-labelledby="stock-location-heading" className="flex flex-wrap gap-2">
            {locationOptions.map(option => {
              const active = (selectedLocation?.code ?? "ALL") === option.code;
              return <button key={option.code} type="button" aria-pressed={active}
                className={active ? "btn-primary" : "btn-secondary"}
                onClick={() => changeStockLocation(option.code)}>
                {option.name}{option.code !== "ALL" && <span className="ml-1.5 text-xs">({option.code})</span>}
              </button>;
            })}
          </div>
        </section>
      )}
      {loading && !products.length ? <p role="status" className="surface-card p-6 text-slate-600">Memuat persediaan…</p> : !loadError && productsInView.length === 0 ? (
        <div className="glass-2 rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-[#6d28d9] flex items-center justify-center mx-auto shadow-xs border border-amber-500/30">
            <Package className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              {stockView === "all" ? "Belum ada SKU terdaftar" : `Belum ada ${stockLabel(stockView).toLowerCase()}`}
            </h3>
            <p className="text-xs text-slate-600 font-normal leading-relaxed">
              Daftarkan SKU untuk mulai mencatat stok per lokasi.
            </p>
          </div>
          <button
            hidden={!["HEAD_ADMIN", "WAREHOUSE"].includes(user?.role)}
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl btn-glass-primary text-xs font-bold shadow-md transition-all duration-200 hover:-translate-y-0.5 focus-brand-ring"
          >
            <Plus className="w-4 h-4" />
            <span>{createLabel}</span>
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
                  {stockView === "all" ? "Ringkasan stok" : stockLabel(stockView)} · {locationName}
                </h3>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Stok tersedia adalah stok fisik dikurangi cadangan pesanan.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-full bg-white/70 text-slate-900 border border-white/60 shadow-xs">
                {productsInView.length} SKU
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-950 border border-amber-500/40 flex items-center space-x-1 backdrop-blur-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span>Patokan minimum {STOCK_POLICY.minimum} per SKU / lokasi</span>
              </span>
            </div>
          </div>

          <div className="px-5 flex flex-wrap items-end gap-3">
            <TableSearch value={table.query} onChange={table.setQuery} label="Cari nama atau SKU…" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyLow} onChange={e => { setOnlyLow(e.target.checked); table.setPage(1); }} />
              Perlu tambah stok
            </label>
            {updatedAt && <p className="text-xs text-slate-600 ml-auto">Diperiksa {new Date(updatedAt).toLocaleTimeString('id-ID')} · diperbarui tiap 15 detik</p>}
          </div>
          {/* Table Container */}
          <div className="overflow-x-auto glass-3 border-t border-white/80">
            <table className="w-full text-left text-xs text-slate-900">
              <thead className="bg-white/60 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-black/10">
                <tr>
                  <th scope="col" className="px-5 py-3.5" aria-sort={table.sort.key === "name" ? table.sort.direction === "asc" ? "ascending" : "descending" : "none"}><SortLabel active={table.sort.key === "name"} direction={table.sort.direction} onClick={() => table.toggleSort("name")}>SKU &amp; Nama</SortLabel></th>
                  <th scope="col" className="px-4 py-3.5">Varian &amp; Satuan</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Fisik</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Dicadangkan</th>
                  <th scope="col" className="px-4 py-3.5 text-right" aria-sort={table.sort.key === "totalAvailable" ? table.sort.direction === "asc" ? "ascending" : "descending" : "none"}><SortLabel active={table.sort.key === "totalAvailable"} direction={table.sort.direction} onClick={() => table.toggleSort("totalAvailable")}>Tersedia</SortLabel></th>
                  <th scope="col" className="px-4 py-3.5 text-center">Status Stok</th>
                  {showSellingColumns && <th scope="col" className="px-4 py-3.5 text-right" aria-sort={table.sort.key === "salesPrice" ? table.sort.direction === "asc" ? "ascending" : "descending" : "none"}><SortLabel active={table.sort.key === "salesPrice"} direction={table.sort.direction} onClick={() => table.toggleSort("salesPrice")}>Harga jual</SortLabel></th>}
                  <th scope="col" className="px-4 py-3.5 text-right">Biaya standar</th>
                  {showSellingColumns && <th scope="col" className="px-4 py-3.5 text-right">Margin</th>}
                  <th scope="col" className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 tabular-nums">
                {table.total === 0 && <tr><td colSpan={showSellingColumns ? 10 : 8} className="text-center py-12 text-slate-500">{onlyLow ? "Tidak ada stok di bawah minimum pada filter ini." : "Tidak ada SKU yang cocok dengan pencarian."}</td></tr>}
                {table.rows.map((p) => {
                  const current = selectedLocation ? stockAt(p, selectedLocation.code) : { onHand: p.totalOnHand ?? 0, reserved: p.totalReserved ?? 0 };
                  const available = current.onHand-current.reserved;
                  const low = shortages(p);
                  const isLow = low.length > 0;
                  const isMaterial = p.kind === "MATERIAL";
                  const marginPct = p.salesPrice > 0 ? Math.round(((p.salesPrice - p.standardCost) / p.salesPrice) * 100) : 0;

                  return (
                    <tr key={p.sku} className={`hover:bg-[#1d4ed8]/5 transition-colors duration-150 ${isLow ? "bg-amber-500/10" : ""}`}>
                      <td className="px-5 py-3.5 font-sans font-bold text-slate-900">
                        <span className="font-mono text-[#1d4ed8] block text-[11px] font-bold">{p.sku}</span>
                        <span>{p.name}</span>
                        {stockView === "all" && <span className={`block text-[11px] font-medium mt-0.5 ${isMaterial ? "text-amber-900" : "text-indigo-800"}`}>{stockLabel(p.kind)}</span>}
                      </td>
                      <td className="px-4 py-3.5 font-sans text-slate-800">
                        <span className="font-semibold text-slate-900">{p.size}</span>
                        <span className="text-slate-600 block text-[10px] font-medium">{p.color} · {p.unit}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-bold text-slate-900">
                        {current.onHand.toLocaleString("id-ID")} {p.unit}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-bold text-slate-900">
                        {current.reserved.toLocaleString("id-ID")} {p.unit}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-bold text-slate-900 text-sm">
                        {available.toLocaleString("id-ID")} {p.unit}
                      </td>
                      <td className="px-4 py-3.5 min-w-56 font-sans">
                        {isLow ? (
                          <ul className="space-y-2">
                            {low.map(item => (
                              <li key={item.code}>
                                <strong className="block">{item.name} ({item.code})</strong>
                                <span className="block">Tersedia {item.available} {p.unit} · Minimum {STOCK_POLICY.minimum}</span>
                                <StockStatus available={item.available} unit={p.unit} />
                              </li>
                            ))}
                          </ul>
                        ) : visibleLocations.length > 0 ? (
                          <StockStatus available={STOCK_POLICY.minimum} unit={p.unit} />
                        ) : "—"}
                      </td>
                      {showSellingColumns && <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {isMaterial ? "—" : `Rp ${p.salesPrice?.toLocaleString("id-ID")}`}
                      </td>}
                      <td className="px-4 py-3.5 text-right text-slate-700 font-medium">
                        Rp {p.standardCost?.toLocaleString("id-ID")}
                      </td>
                      {showSellingColumns && <td className="px-4 py-3.5 text-right font-bold text-emerald-800">
                        {isMaterial ? "—" : `${marginPct}%`}
                      </td>}
                      <td className="px-4 py-3.5 text-center font-sans">
                        <ActionButton action="detail" aria-label={`Detail stok ${p.name}`} onClick={() => {
                          setSelectedSku(p.sku);
                          setViewMode("detail");
                        }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination {...table} onChange={table.setPage} />
        </div>
      ) : productDetail?.sku === detailSku ? (
        <div className="glass-2 rounded-2xl shadow-glass-2 border border-white/80 overflow-hidden">
          <div className="p-6 border-b border-black/5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/40">
            <div>
              <span className={`text-xs font-semibold ${isMaterialDetail ? "text-amber-900" : "text-indigo-800"}`}>
                {stockLabel(productDetail.kind)}
              </span>
              <h2 className="text-2xl font-bold text-[#1d4ed8] font-mono mt-1">
                {productDetail.sku}
              </h2>

              <div className="mt-3">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                  {isMaterialDetail ? "Nama bahan" : "Nama produk"}
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
              {!isMaterialDetail && <div className="flex justify-between items-center glass-3 p-3.5 rounded-xl border border-white/80 shadow-xs">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-[#1d4ed8]" />
                  <span className="text-xs font-semibold text-slate-800">Harga jual</span>
                </div>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  Rp {productDetail.salesPrice.toLocaleString("id-ID")}
                </span>
              </div>}

              <div className="flex justify-between items-center glass-3 p-3.5 rounded-xl border border-white/80 shadow-xs">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-[#1d4ed8]" />
                  <span className="text-xs font-semibold text-slate-800">Biaya standar</span>
                </div>
                <span className="text-sm font-bold text-[#1d4ed8] font-mono">
                  Rp {productDetail.standardCost.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Produk, Nilai dan Stok Lokasi */}
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2">
                <Building className="w-4 h-4 text-[#1d4ed8]" />
                <span>Distribusi stok per lokasi</span>
              </h3>
              <span className="text-xs text-slate-700 font-semibold font-mono">
                {selectedLocation ? locationName : "Total perusahaan"} <strong className="text-[#1d4ed8] font-bold">{detailOnHand.toLocaleString("id-ID")} {productDetail.unit}</strong> (Rp {detailValuation.toLocaleString("id-ID")})
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
                    <th scope="col" className="px-6 py-3.5">Status stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 font-mono">
                  {visibleLocations.map(item => {
                    const loc = productDetail.locations.find((entry: any) => entry.locationCode === item.code)
                      ?? { locationCode: item.code, locationName: item.name, onHand: 0, reserved: 0, available: 0, valuation: 0 };
                    return (
                    <tr key={loc.locationCode} className="hover:bg-[#1d4ed8]/5 transition-colors duration-150">
                      <td className="px-6 py-3.5 font-bold text-slate-900 font-sans flex items-center space-x-2.5">
                        <MapPin className="w-4 h-4 text-[#1d4ed8]" />
                        <span>{loc.locationCode} — {loc.locationName}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-900">{loc.onHand.toLocaleString("id-ID")} {productDetail.unit}</td>
                      <td className="px-6 py-3.5 text-right text-amber-800 font-bold">{loc.reserved.toLocaleString("id-ID")} {productDetail.unit}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-emerald-900 bg-emerald-500/15">
                        {loc.available.toLocaleString("id-ID")} {productDetail.unit}
                      </td>
                      <td className="px-6 py-3.5 text-right text-slate-800 font-medium">
                        Rp {loc.valuation.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-3.5 font-sans">
                        <StockStatus available={loc.available} unit={productDetail.unit} />
                        {canAdjust && <Link className="mt-1 block text-indigo-700 underline" href={`/inventory/movements?${new URLSearchParams({ sku: productDetail.sku, location: loc.locationCode })}`}>Koreksi stok</Link>}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : detailSku && (detailError ? <div role="alert" className="surface-card p-6 space-y-2 text-sm">
        <p>{detailError}</p>
        <button type="button" className="btn-secondary" onClick={() => void fetchProductDetail(detailSku)}>Muat ulang detail</button>
      </div> : <p role="status" className="surface-card p-6 text-slate-600">Memuat detail stok…</p>)}

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
        initialKind={stockView === "MATERIAL" ? "MATERIAL" : "MENU"}
        onClose={() => setCreateModalOpen(false)}
        onProductCreated={() => {
          fetchProducts();
        }}
      />
    </AppLayout>
  );
}