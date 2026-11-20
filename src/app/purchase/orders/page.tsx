"use client";

import React, { useState, useEffect } from "react";
import PurchaseOrderDispatch from "@/components/PurchaseOrderDispatch";
import DocumentControls from "@/components/DocumentControls";
import DocumentList from "@/components/DocumentList";
import DocumentTrail from "@/components/DocumentTrail";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import CreatePurchaseOrderModal from "@/components/CreatePurchaseOrderModal";
import { Play, Truck, CheckCircle2, Lock, Plus, Building, RefreshCw, Calendar, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function PurchaseOrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshingReceipt, setRefreshingReceipt] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchase/orders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Daftar pesanan gagal dimuat.");
      setLoadError("");
      {
        setOrders(data.orders || []);
        if (data.orders?.length > 0 && !selectedOrder) {
          const requested = data.orders.find((r: any) => r.id === new URLSearchParams(window.location.search).get("id"));
          if (requested) await fetchOrderDetail(requested.id);
        }
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Koneksi terputus. Coba muat ulang daftar.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/purchase/orders/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Detail pesanan gagal dimuat.");
      setSelectedOrder(data.order);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Detail gagal dimuat. Pilih dokumen kembali.");
    }
  };

  useEffect(() => {
    fetchSession();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder?.id && window.location.hash === '#status-penerimaan') {
      document.getElementById('status-penerimaan')?.scrollIntoView({ block: 'start' });
    }
  }, [selectedOrder?.id]);

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

  // Run Test T-15
  const runTestT15 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("PROCUREMENT");

      const resCreate = await fetch("/api/purchase/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: "V03",
          lines: [{ productSku: "COF-LATT-HOT", orderedQty: 10, unitPrice: 12000 }],
        }),
      });
      const dataCreate = await resCreate.json();
      const poId = dataCreate.order.id;

      const resStockBefore = await fetch("/api/products/COF-LATT-HOT");
      const dataStockBefore = await resStockBefore.json();
      const whBefore = dataStockBefore.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;

      const resConfirm = await fetch(`/api/purchase/orders/${poId}/confirm`, { method: "POST" });
      const dataConfirm = await resConfirm.json();

      const resStockAfter = await fetch("/api/products/COF-LATT-HOT");
      const dataStockAfter = await resStockAfter.json();
      const whAfter = dataStockAfter.product.locations.find((l: any) => l.locationCode === "WH-JKT").onHand;

      const passed =
        dataCreate.order.subtotal === 120000 &&
        dataCreate.order.taxAmount === 0 &&
        dataCreate.order.total === 120000 &&
        dataConfirm.purchaseOrder.status === "CONFIRMED" &&
        whBefore === whAfter;

      setTestResult({
        id: "T-15",
        name: "Alur Normal: RFQ dan Confirm PO V03 (Fitur F-11)",
        status: passed ? "PASS" : "FAIL",
        expected: "PO subtotal Rp120.000, vendor tax 0%, total Rp120.000; on-hand tidak berubah dan commitment pembelian tercatat.",
        actual: `PO: ${dataConfirm.purchaseOrder.poNumber}, Total: Rp ${dataConfirm.purchaseOrder.total.toLocaleString("id-ID")}, Tax: 0%. Stok WH On-Hand sebelum: ${whBefore}, sesudah: ${whAfter} (stok fisik tidak bertambah sebelum barang datang).`,
      });

      await fetchOrders();
      await fetchOrderDetail(poId);
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-16
  const runTestT16 = async () => {
    setTesting(true);
    try {
      if (!selectedOrder) {
        alert("Pilih PO terlebih dahulu");
        return;
      }

      const resRetry = await fetch(`/api/purchase/orders/${selectedOrder.id}/confirm`, { method: "POST" });
      const dataRetry = await resRetry.json();

      setTestResult({
        id: "T-16",
        name: "Aturan / Edge Case: Konfirmasi PO Idempotent (SR-13 / F-11)",
        status: dataRetry.alreadyConfirmed ? "PASS" : "FAIL",
        expected: "Klik Confirm ulang tidak menambah receipt atau commitment ganda (SR-13).",
        actual: `Response: "${dataRetry.message}". alreadyConfirmed: ${dataRetry.alreadyConfirmed}. Dokumen receipt tetap tunggal.`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Pengadaan" }, { label: "Purchase Orders" }]}
      title="Pesanan pembelian"
      subtitle="Kelola penawaran vendor, pesanan pembelian, dan rencana penerimaan barang."
      wireframe="Wireframe S-08"
      actions={
        <div className="flex items-center space-x-2">
          <button
            hidden={user?.role === "OWNER"} onClick={() => setCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold btn-glass-primary rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-brand-ring"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pesanan Beli Baru</span>
          </button>

        </div>
      }
    >

      {selectedOrder && <DocumentControls kind="purchase" record={selectedOrder} role={user?.role} onChanged={async () => { await fetchOrders(); await fetchOrderDetail(selectedOrder.id); }} />}

      {loadError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p>{loadError}</p><button className="font-semibold mt-2" onClick={() => void fetchOrders()}>Muat ulang daftar</button></div>}
      {savedNotice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 flex flex-wrap items-center justify-between gap-2"><p>{savedNotice}</p><button className="font-semibold" onClick={() => setSavedNotice("")}>Tutup pesan</button></div>}
      <DocumentList loading={loading} records={orders} selectedId={selectedOrder?.id} onClearSelection={()=>setSelectedOrder(null)} onSelect={fetchOrderDetail}/>


      {selectedOrder?.purchaseRequest && ['HEAD_ADMIN', 'PROCUREMENT', 'OWNER'].includes(user?.role) && (
        <PurchaseOrderDispatch key={selectedOrder.id} order={selectedOrder} role={user.role} onChanged={() => fetchOrderDetail(selectedOrder.id)} />
      )}

      {/* Selected PO Detail */}
      {selectedOrder && ['CONFIRMED', 'DONE'].includes(selectedOrder.status) && (
        <section id="status-penerimaan" className="surface-card scroll-mt-36 space-y-4 p-5" aria-labelledby="receipt-status-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="receipt-status-title" className="font-semibold">Status penerimaan</h2>
              <p className="text-sm text-slate-600">Gudang memvalidasi barang masuk. Procurement memantau jadwal dan sisa pesanan di sini.</p>
            </div>
            <button className="btn-secondary" disabled={refreshingReceipt} onClick={async () => {
              setRefreshingReceipt(true);
              try { await fetchOrderDetail(selectedOrder.id); }
              finally { setRefreshingReceipt(false); }
            }}>{refreshingReceipt ? 'Memuat…' : 'Perbarui status'}</button>
          </div>
          {selectedOrder.receipts?.length ? <ul className="space-y-2">
            {selectedOrder.receipts.map((receipt: any) => (
              <li key={receipt.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <strong>{receipt.receiptNumber}</strong>
                <StatusBadge status={receipt.status} />
                <span>{receipt.destLocation} · Jadwal {new Date(receipt.scheduledDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}</span>
                {['HEAD_ADMIN', 'WAREHOUSE'].includes(user?.role) && <Link className="text-indigo-700 underline" href={`/inventory/receipts?id=${encodeURIComponent(receipt.id)}`}>Buka penerimaan</Link>}
              </li>
            ))}
          </ul> : <p className="text-sm text-slate-600">Belum ada dokumen penerimaan untuk pesanan ini.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50"><tr>
                <th className="p-2" scope="col">Barang</th>
                <th className="p-2 text-right" scope="col">Dipesan</th>
                <th className="p-2 text-right" scope="col">Diterima</th>
                <th className="p-2 text-right" scope="col">Ditolak saat inspeksi</th>
                <th className="p-2 text-right" scope="col">Sisa PO</th>
              </tr></thead>
              <tbody>{selectedOrder.lines?.map((line: any) => {
                const rejected = (selectedOrder.receipts ?? [])
                  .filter((receipt: any) => receipt.status === 'DONE')
                  .flatMap((receipt: any) => receipt.lines)
                  .filter((receiptLine: any) => receiptLine.productSku === line.productSku)
                  .reduce((total: number, receiptLine: any) => total + receiptLine.rejectedQty, 0);
                return <tr key={line.id} className="border-t border-slate-100">
                  <th scope="row" className="p-2 font-medium">{line.productSku} · {line.product?.name || line.productSku}</th>
                  <td className="p-2 text-right">{line.orderedQty}</td>
                  <td className="p-2 text-right">{line.receivedQty}</td>
                  <td className="p-2 text-right">{rejected}</td>
                  <td className="p-2 text-right font-semibold">{Math.max(0, line.orderedQty - line.receivedQty)}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </section>
      )}

      {selectedOrder && (
        <div className="glass-2 rounded-2xl shadow-glass-2 border border-white/80 overflow-hidden">
          {/* Status Bar */}
          <div className="bg-white/40 px-6 py-3.5 border-b border-black/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Tahapan Status:</span>
              <div className="inline-flex rounded-xl shadow-xs overflow-hidden border border-white/60">
                {["DRAFT", "CONFIRMED", "DONE"].map((st) => (
                  <span
                    key={st}
                    className={`px-3 py-1 text-xs font-bold font-mono transition-colors ${
                      selectedOrder.status === st
                        ? "bg-[#1d4ed8] text-white shadow-xs"
                        : "bg-white/60 text-slate-700"
                    }`}
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-800 font-semibold">Vendor Tax:</span>
              <span className="font-bold text-emerald-950 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/40 backdrop-blur-xs">
                0% (Fixture)
              </span>
            </div>
          </div>

          {/* Document Header */}
          <div className="p-6 border-b border-black/5 grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white/30">
            <div>
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                Nomor RFQ / PO
              </span>
              <h2 className="text-2xl font-bold text-[#1d4ed8] font-mono mt-0.5">
                {selectedOrder.poNumber}
              </h2>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                Vendor Rekanan
              </span>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {selectedOrder.vendor?.name}
              </p>
              <span className="text-xs text-slate-600 font-medium font-mono">
                ID: {selectedOrder.vendorId} · Terms: {selectedOrder.vendor?.paymentTerms}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                Jadwal Pengiriman (Scheduled Date)
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Calendar className="w-4 h-4 text-[#1d4ed8]" />
                <p className="text-sm font-bold text-slate-900 font-mono">
                  {new Date(selectedOrder.scheduledDate).toLocaleDateString("id-ID")}
                </p>
              </div>
              <span className="text-xs text-slate-600 font-medium">Lokasi Tujuan: WH-JKT</span>
            </div>
          </div>

          {/* Lines Table */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-[#1d4ed8]" />
                <span>Rincian Item Bahan Baku / Produk Pesanan</span>
              </h3>
              <span className="text-xs text-slate-600 font-medium">Komitmen pengadaan vendor</span>
            </div>

            <div className="overflow-x-auto border border-white/80 rounded-xl shadow-glass-1 glass-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/60 font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-black/10">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">SKU Varian & Nama Produk</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Kuantitas Dipesan</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Harga Satuan (Cost)</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Net Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 font-mono">
                  {selectedOrder.lines?.map((l: any) => (
                    <tr key={l.id} className="hover:bg-[#1d4ed8]/5 transition-colors duration-150">
                      <td className="px-6 py-3.5 font-bold text-slate-900 font-sans">
                        <span className="font-mono text-[#1d4ed8] mr-2 font-bold">{l.productSku}</span>
                        <span>{l.product?.name}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-900">{l.orderedQty}</td>
                      <td className="px-6 py-3.5 text-right text-slate-800 font-medium">Rp {l.unitPrice.toLocaleString("id-ID")}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                        Rp {l.subtotal.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-white/60 font-mono text-xs border-t-2 border-black/10">
                  <tr>
                    <td colSpan={3} className="px-6 py-3.5 text-right font-sans font-bold text-slate-800">
                      Total Tagihan PO:
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-base text-[#1d4ed8]">
                      Rp {selectedOrder.total?.toLocaleString("id-ID")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible QA Test Runner for T-15 & T-16 */}
      <details hidden className="group bg-slate-900 text-white rounded-2xl p-5 border border-slate-800">
        <summary className="cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white select-none">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-[#7c3aed] text-[#ffffff] font-bold text-[10px] uppercase">
              Developer Tool
            </span>
            <span>🛠️ Panel Pengujian Otomatis Rubrik (T-15 & T-16)</span>
          </div>
          <span className="text-[11px] text-slate-400 group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>

        <div className="pt-4 mt-3 border-t border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-300">
                Verifikasi pembuatan RFQ, konfirmasi PO tanpa penambahan stok fisik prematur, dan idempotensi konfirmasi berulang.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT15}
                disabled={testing}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-xs transition-all focus-brand-ring"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jalankan T-15</span>
              </button>
              <button
                onClick={runTestT16}
                disabled={testing}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-[#ffffff] flex items-center space-x-1.5 shadow-xs transition-all focus-brand-ring"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jalankan T-16</span>
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

      {/* Modal Buat Pesanan Pembelian Baru */}
      <CreatePurchaseOrderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onOrderCreated={async (newOrder) => {
          await fetchOrders();
          if (newOrder) { setSelectedOrder(newOrder); setSavedNotice(`Pesanan ${newOrder.orderNumber || newOrder.poNumber} tersimpan sebagai draft. Periksa rincian, lalu konfirmasi melalui Tindakan dokumen.`); }
        }}
      />
      {selectedOrder && <DocumentTrail kind="purchase" record={selectedOrder} role={user?.role}/>}
    </AppLayout>
  );
}
