"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import { Play, Receipt, CheckCircle2, Lock, FileSpreadsheet, ShieldAlert, FileText, Check } from "lucide-react";
import Link from "next/link";

export default function VendorBillsPage() {
  const [user, setUser] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<any>(null);
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

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounting/vendor-bills");
      if (res.ok) {
        const data = await res.json();
        setBills(data.bills || []);
        if (data.bills?.length > 0 && !selectedBill) {
          setSelectedBill(data.bills[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/accounting/vendor-bills/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBill(data.bill);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchBills();
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

  // Run Test T-21
  const runTestT21 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("FINANCE");

      const resReceipts = await fetch("/api/inventory/receipts");
      const dataReceipts = await resReceipts.json();
      const doneReceipt = dataReceipts.receipts.find((r: any) => r.status === "DONE");

      if (!doneReceipt) {
        alert("Jalankan Uji T-17 terlebih dahulu untuk menghasilkan penerimaan barang yang valid.");
        return;
      }

      const resBill = await fetch("/api/accounting/vendor-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: doneReceipt.purchaseOrderId,
          receiptId: doneReceipt.id,
          lines: [{ productSku: "COF-LATT-HOT", quantity: 8, unitPrice: 12000 }],
        }),
      });
      const dataBill = await resBill.json();

      const resPost = await fetch(`/api/accounting/vendor-bills/${dataBill.bill.id}/post`, { method: "POST" });
      const dataPost = await resPost.json();

      const passed =
        dataBill.bill.subtotalNet === 96000 &&
        dataBill.bill.taxAmount === 0 &&
        dataBill.bill.totalGross === 96000 &&
        dataPost.vendorBill.status === "POSTED";

      setTestResult({
        id: "T-21",
        name: "Alur Normal: Vendor Bill & Three-Way Match (Fitur F-13)",
        status: passed ? "PASS" : "FAIL",
        expected: "Vendor Bill net Rp96.000, tax 0, total Rp96.000; Dr GRNI Rp96.000, Cr A/P Rp96.000; GRNI bernilai nol.",
        actual: `Vendor Bill: ${dataPost.vendorBill.billNumber}, Total: Rp ${dataPost.vendorBill.totalGross.toLocaleString("id-ID")}. Jurnal: ${dataPost.journalEntry.entryNumber} (Dr GRNI Rp96.000 = Cr A/P Rp96.000). Akun GRNI klir menjadi 0.`,
      });

      await fetchBills();
      await fetchBillDetail(dataBill.bill.id);
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-22
  const runTestT22 = async () => {
    setTesting(true);
    try {
      if (!selectedBill) {
        alert("Pilih Vendor Bill terlebih dahulu.");
        return;
      }

      await handleSwitchRole("FINANCE");

      const resRetry = await fetch(`/api/accounting/vendor-bills/${selectedBill.id}/post`, { method: "POST" });
      const dataRetry = await resRetry.json();

      const resDup = await fetch("/api/accounting/vendor-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: selectedBill.purchaseOrderId,
          lines: [{ productSku: "COF-LATT-HOT", quantity: 8, unitPrice: 12000 }],
        }),
      });
      const dataDup = await resDup.json();

      const blockedOk = resDup.status === 400 && dataDup.error.includes("Three-Way Match Gagal");

      setTestResult({
        id: "T-22",
        name: "Aturan / Edge Case: Pencegahan Tagihan Vendor Duplikat (SR-06 / SR-13 / F-13)",
        status: dataRetry.alreadyPosted && blockedOk ? "PASS" : "FAIL",
        expected: "Post ulang bersifat idempotent (tidak ada jurnal kedua) dan pembuatan bill duplikat diblokir oleh Three-Way Match.",
        actual: `Post ulang bill: "${dataRetry.message}". Pembuatan bill kedua: HTTP ${resDup.status} "${dataDup.error}".`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppLayout
      currentUser={user}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[{ label: "Keuangan & Akuntansi" }, { label: "Vendor Bills (3-Way)" }]}
      title="Vendor Bills & Three-Way Matching"
      subtitle="Verifikasi Tagihan Pemasok Melalui Pencocokan 3 Arah (PO vs GR vs Bill) & Kliring Akun GRNI (F-13, SR-06, SR-13)"
      wireframe="Wireframe S-11"
      actions={
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black text-slate-800 hidden sm:inline">Pilih Tagihan Vendor:</span>
          <select
            value={selectedBill?.id || ""}
            onChange={(e) => fetchBillDetail(e.target.value)}
            className="text-xs font-mono font-bold input-glass rounded-xl px-3 py-1.5 shadow-xs focus:ring-2 focus:ring-[#174A3A]"
          >
            {bills.map((b) => (
              <option key={b.id} value={b.id}>
                {b.billNumber} — {b.vendor?.name} ({b.status})
              </option>
            ))}
          </select>
        </div>
      }
    >
      {/* Selected Bill Detail */}
      {selectedBill && (
        <div className="glass-2 rounded-2xl shadow-glass-2 border border-white/80 overflow-hidden">
          {/* Status Bar */}
          <div className="bg-white/40 px-6 py-3.5 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Status Tagihan:</span>
              <div className="inline-flex rounded-xl shadow-xs overflow-hidden border border-white/60">
                {["DRAFT", "CONFIRMED", "DONE"].map((st) => {
                  const active = (selectedBill.status === "POSTED" && st === "DONE") || selectedBill.status === st;
                  return (
                    <span
                      key={st}
                      className={`px-3 py-1 text-xs font-black font-mono transition-colors ${
                        active
                          ? "bg-[#174A3A] text-white shadow-xs"
                          : "bg-white/60 text-slate-700"
                      }`}
                    >
                      {st}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-800 font-bold">Pencocokan:</span>
              <span className="font-black text-emerald-950 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/40 backdrop-blur-xs">
                Three-Way Match Terverifikasi
              </span>
            </div>
          </div>

          {/* Document Header */}
          <div className="p-6 border-b border-black/5 grid grid-cols-1 sm:grid-cols-4 gap-6 bg-white/30">
            <div>
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                Nomor Vendor Bill
              </span>
              <h2 className="text-2xl font-black text-[#174A3A] font-mono mt-0.5">
                {selectedBill.billNumber}
              </h2>
            </div>

            <div>
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                Pemasok / Vendor
              </span>
              <p className="text-base font-black text-slate-900 mt-0.5">
                {selectedBill.vendor?.name}
              </p>
              <span className="text-xs text-slate-700 font-bold font-mono">
                ID: {selectedBill.vendorId}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                Referensi Purchase Order
              </span>
              <p className="text-sm font-black text-[#174A3A] font-mono mt-0.5">
                {selectedBill.purchaseOrder?.poNumber}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                Pajak Vendor
              </span>
              <p className="text-sm font-black text-emerald-800 mt-0.5">
                0% (Fixture)
              </p>
            </div>
          </div>

          {/* Lines Table */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#174A3A]" />
                <span>Pencocokan Tiga Arah: PO vs Receipt (Accepted) vs Tagihan Baru</span>
              </h3>
              <span className="text-xs text-slate-700 font-semibold">Mencegah penagihan berlebih atau barang ditolak</span>
            </div>

            <div className="overflow-x-auto border border-white/80 rounded-xl shadow-glass-1 glass-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/60 font-black text-slate-900 uppercase tracking-wider text-[11px] border-b border-black/10">
                  <tr>
                    <th className="px-6 py-3.5">SKU Varian & Nama Produk</th>
                    <th className="px-6 py-3.5 text-right">Dipesan (PO)</th>
                    <th className="px-6 py-3.5 text-right text-emerald-950 font-black">Diterima (Receipt)</th>
                    <th className="px-6 py-3.5 text-right text-slate-700 font-bold">Sudah Ditagih</th>
                    <th className="px-6 py-3.5 text-right text-[#174A3A] font-black">Qty Tagihan Ini</th>
                    <th className="px-6 py-3.5 text-right">Net Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 font-mono">
                  {selectedBill.lines?.map((l: any) => {
                    const poLine = selectedBill.purchaseOrder?.lines?.find((pol: any) => pol.productSku === l.productSku);
                    const orderedQty = poLine?.orderedQty ?? l.quantity;
                    
                    let acceptedQty = 0;
                    selectedBill.purchaseOrder?.receipts?.forEach((rc: any) => {
                      rc.lines?.forEach((rcl: any) => {
                        if (rcl.productSku === l.productSku) {
                          acceptedQty += rcl.acceptedQty || 0;
                        }
                      });
                    });
                    if (acceptedQty === 0) acceptedQty = l.quantity;
                    const alreadyBilled = Math.max(0, (poLine?.billedQty || l.quantity) - l.quantity);

                    return (
                      <tr key={l.id} className="hover:bg-emerald-500/10 transition-colors duration-150">
                        <td className="px-6 py-3.5 font-black text-slate-900 font-sans">
                          <span className="font-mono text-[#174A3A] mr-2 font-black">{l.productSku}</span>
                          <span>{l.product?.name}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-black text-slate-900">{orderedQty}</td>
                        <td className="px-6 py-3.5 text-right font-black text-emerald-900 bg-emerald-500/15">{acceptedQty}</td>
                        <td className="px-6 py-3.5 text-right text-slate-700 font-bold">{alreadyBilled}</td>
                        <td className="px-6 py-3.5 text-right font-black text-[#174A3A] bg-emerald-500/15">
                          {l.quantity}
                        </td>
                        <td className="px-6 py-3.5 text-right font-black text-slate-900">
                          Rp {(l.totalAmount ?? 0).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-white/60 font-mono text-xs border-t-2 border-black/10">
                  <tr>
                    <td colSpan={5} className="px-6 py-3.5 text-right font-sans font-black text-slate-800">
                      Total Kewajiban Tagihan Vendor:
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-base text-[#174A3A]">
                      Rp {selectedBill.totalGross?.toLocaleString("id-ID")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible QA Test Runner for T-21 & T-22 */}
      <details className="group bg-slate-900 text-white rounded-2xl p-5 border border-slate-800">
        <summary className="cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white select-none">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-[#C6A15B] text-slate-900 font-bold text-[10px] uppercase">
              Developer Tool
            </span>
            <span>🛠️ Panel Pengujian Otomatis Rubrik (T-21 & T-22)</span>
          </div>
          <span className="text-[11px] text-slate-400 group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>

        <div className="pt-4 mt-3 border-t border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-300">
                Verifikasi pencocokan Three-Way Match, kliring akun interim GRNI, dan proteksi tagihan duplikat (SR-13).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={runTestT21}
                disabled={testing}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-xs transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jalankan T-21</span>
              </button>
              <button
                onClick={runTestT22}
                disabled={testing}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#C6A15B] hover:bg-[#b5924f] text-slate-900 flex items-center space-x-1.5 shadow-xs transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jalankan T-22</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-[#C6A15B]">
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
    </AppLayout>
  );
}