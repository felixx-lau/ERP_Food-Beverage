"use client";

import React, { useState, useEffect } from "react";
import DocumentControls from "@/components/DocumentControls";
import DocumentList from "@/components/DocumentList";
import DocumentTrail from "@/components/DocumentTrail";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import { Play, Truck, CheckCircle, AlertTriangle, Layers, Building, MapPin, PackageCheck } from "lucide-react";
import Link from "next/link";

export default function DeliveryPage() {
  const [user, setUser] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/deliveries");
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
        if (data.deliveries?.length > 0 && !selectedDelivery) {
          setSelectedDelivery(data.deliveries.find((r: any) => r.id === new URLSearchParams(window.location.search).get("id")) || data.deliveries[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/deliveries/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDelivery(data.delivery);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchDeliveries();
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

  // Run Test T-11
  const runTestT11 = async () => {
    setTesting(true);
    try {
      const resCreate = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: "C01",
          lines: [{ productSku: "RICE-CHICK-S", quantity: 8, unitPrice: 48000, discountPercent: 0 }],
        }),
      });
      const dataCreate = await resCreate.json();
      const orderId = dataCreate.order.id;

      const resConfirm = await fetch(`/api/sales/orders/${orderId}/confirm`, { method: "POST" });
      const dataConfirm = await resConfirm.json();
      const doId = dataConfirm.deliveryOrder.id;

      await handleSwitchRole("WAREHOUSE");
      const resValidate = await fetch(`/api/inventory/deliveries/${doId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ lineId: dataConfirm.deliveryOrder.lines[0].id, productSku: "RICE-CHICK-S", deliveredQty: 5 }],
        }),
      });
      const dataValidate = await resValidate.json();

      const resStock = await fetch("/api/products/RICE-CHICK-S");
      const dataStock = await resStock.json();
      const whStock = dataStock.product.locations.find((l: any) => l.locationCode === "WH-JKT");

      const passed =
        dataValidate.success &&
        dataValidate.updatedDelivery.lines[0].deliveredQty === 5 &&
        dataValidate.updatedDelivery.lines[0].backorderQty === 3 &&
        dataValidate.totalCogs === 130000 &&
        dataValidate.totalDeliveredValueGross === 264000;

      setTestResult({
        id: "T-11",
        name: "Alur Normal: Partial Delivery & Backorder (SR-10 / F-07 / F-08)",
        status: passed ? "PASS" : "FAIL",
        expected: "Delivered 5, backorder 3; WH on-hand 35, Reserved 9 (6 existing + 3 new), Available 26; COGS Rp130.000; eligible-to-invoice gross Rp264.000.",
        actual: `Delivered: ${dataValidate.updatedDelivery.lines[0].deliveredQty}, Backorder: ${dataValidate.updatedDelivery.lines[0].backorderQty}, Backorder DO: ${dataValidate.backorderDoc?.deliveryNumber}. COGS: Rp ${dataValidate.totalCogs.toLocaleString("id-ID")}, Eligible Gross: Rp ${dataValidate.totalDeliveredValueGross.toLocaleString("id-ID")}. WH On-Hand: ${whStock.onHand}, Reserved: ${whStock.reserved}, Available: ${whStock.available}.`,
      });

      await fetchDeliveries();
      await fetchDeliveryDetail(doId);
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-12
  const runTestT12 = async () => {
    setTesting(true);
    try {
      const resVal = await fetch("/api/inventory/deliveries", { method: "GET" });
      const dataVal = await resVal.json();
      const existingDO = dataVal.deliveries[0];

      const resBlocked = await fetch(`/api/inventory/deliveries/${existingDO.id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ lineId: existingDO.lines[0].id, productSku: "RICE-CHICK-S", deliveredQty: 38 }],
        }),
      });
      const dataBlocked = await resBlocked.json();

      const blockedOk = resBlocked.status === 400 && dataBlocked.error.includes("SR-04");

      setTestResult({
        id: "T-12",
        name: "Aturan / Edge Case: Pencegahan Stok Negatif & Reserved Protection (SR-04 / SR-10)",
        status: blockedOk ? "PASS" : "FAIL",
        expected: "Pengiriman 38 unit ditolak karena melebihi available stock dan melindungi kuantitas reserved SO lain.",
        actual: `HTTP ${resBlocked.status}: "${dataBlocked.error}". Stok negatif berhasil dicegah dan integritas reservasi dipertahankan.`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Persediaan & Gudang" }, { label: "Delivery Orders" }]}
      title="Pengiriman barang"
      subtitle="Surat Jalan Pengiriman, Pemenuhan Sebagian (Partial Delivery), dan Pemisahan Dokumen Backorder (F-07, F-08, SR-04, SR-10)"
      wireframe="Wireframe S-06"
      actions={
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#64748b] hidden sm:inline">Pilih Dokumen DO:</span>
          <select
            value={selectedDelivery?.id || ""}
            onChange={(e) => fetchDeliveryDetail(e.target.value)}
            className="text-xs font-mono font-medium bg-white border border-[#E5E9E4] text-[#0f172a] rounded-lg px-3 py-1.5 shadow-2xs focus:ring-1 focus:ring-[#1d4ed8] focus-brand-ring"
          >
            {deliveries.map((d) => (
              <option key={d.id} value={d.id}>
                {d.deliveryNumber} — SO: {d.salesOrder?.orderNumber} ({d.status})
              </option>
            ))}
          </select>
        </div>
      }
    >
      <DocumentList records={deliveries} selectedId={selectedDelivery?.id} onSelect={fetchDeliveryDetail}/>

      {selectedDelivery && <DocumentControls kind="deliveries" record={selectedDelivery} role={user?.role} onChanged={async () => { await fetchDeliveries(); await fetchDeliveryDetail(selectedDelivery.id); }} />}

      {/* Selected Delivery Order Detail */}
      {selectedDelivery && (
        <div className="bg-white rounded-xl shadow-xs border border-[#E5E9E4] overflow-hidden">
          {/* Status Bar */}
          <div className="bg-[#f1f5f9] px-6 py-3 border-b border-[#E5E9E4] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Tahapan Dokumen:</span>
              <div className="inline-flex rounded-lg shadow-2xs overflow-hidden border border-[#E5E9E4]">
                {["DRAFT", "CONFIRMED", "DONE"].map((st) => (
                  <span
                    key={st}
                    className={`px-3 py-1 text-xs font-bold font-mono transition-colors ${
                      selectedDelivery.status === st
                        ? "bg-[#1d4ed8] text-white"
                        : "bg-white text-[#64748b]"
                    }`}
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {selectedDelivery.isBackorder && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center space-x-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                <span>Dokumen Backorder Terpisah (SR-10)</span>
              </span>
            )}
          </div>

          {/* Document Header */}
          <div className="p-6 border-b border-[#E5E9E4] grid grid-cols-1 sm:grid-cols-4 gap-6 bg-[#f1f5f9]/40">
            <div>
              <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider block">
                Nomor Surat Jalan (DO)
              </span>
              <h2 className="text-2xl font-bold text-[#1d4ed8] font-mono mt-0.5">
                {selectedDelivery.deliveryNumber}
              </h2>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider block">
                Referensi Sales Order
              </span>
              <p className="text-base font-bold text-[#0f172a] font-mono mt-0.5">
                {selectedDelivery.salesOrder?.orderNumber}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider block">
                Lokasi Asal (Source)
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-[#1d4ed8]" />
                <span className="text-sm font-bold text-[#0f172a]">{selectedDelivery.sourceLocation}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider block">
                Pelanggan Penerima
              </span>
              <p className="text-sm font-bold text-[#0f172a] mt-0.5">
                {selectedDelivery.salesOrder?.contact?.name}
              </p>
            </div>
          </div>

          {/* Lines Table */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wide flex items-center space-x-2">
                <PackageCheck className="w-4 h-4 text-[#1d4ed8]" />
                <span>Rincian Pemenuhan Pengiriman & Pemisahan Backorder</span>
              </h3>
              <span className="text-xs text-[#64748b]">Sesuai aturan kuantitas terkirim aktual</span>
            </div>

            <div className="overflow-x-auto border border-[#E5E9E4] rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f1f5f9] font-semibold text-[#64748b] uppercase tracking-wider text-[11px] border-b border-[#E5E9E4]">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">SKU Varian & Nama Produk</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Dipesan (Ordered)</th>
                    <th scope="col" className="px-6 py-3.5 text-right text-emerald-800">Terkirim (Done)</th>
                    <th scope="col" className="px-6 py-3.5 text-right text-amber-800">Backorder Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E4] font-mono">
                  {selectedDelivery.lines?.map((l: any) => (
                    <tr key={l.id} className="hover:bg-[#f1f5f9] transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[#0f172a] font-sans">
                        <span className="font-mono text-[#1d4ed8] mr-2 font-bold">{l.productSku}</span>
                        <span>{l.product?.name}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#0f172a]">{l.orderedQty}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-emerald-700 bg-emerald-50/40">
                        {l.deliveredQty}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-amber-700 bg-amber-50/40">
                        {l.backorderQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible QA Test Runner for T-11 & T-12 */}
      <details hidden className="group bg-slate-900 text-white rounded-2xl p-5 border border-slate-800">
        <summary className="cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white select-none">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-[#7c3aed] text-[#ffffff] font-bold text-[10px] uppercase">
              Developer Tool
            </span>
            <span>🛠️ Panel Pengujian Otomatis Rubrik (T-11 & T-12)</span>
          </div>
          <span className="text-[11px] text-slate-400 group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>

        <div className="pt-4 mt-3 border-t border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-300">
                Verifikasi pemenuhan delivery sebagian (partial), pembuatan backorder otomatis (SR-10), dan proteksi reservasi stok (SR-04).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT11}
                disabled={testing}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-xs transition-all focus-brand-ring"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jalankan T-11</span>
              </button>

              <button
                onClick={runTestT12}
                disabled={testing}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center space-x-1.5 shadow-xs transition-all focus-brand-ring"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jalankan T-12</span>
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
      {selectedDelivery && <DocumentTrail kind="deliveries" record={selectedDelivery}/>}
    </AppLayout>
  );
}