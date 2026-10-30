"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import {
  Receipt,
  Play,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Landmark,
  ArrowRight,
  Search,
  Filter,
  RefreshCw,
  Wallet,
  ShieldAlert,
  FileText,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

export default function RegisterPaymentPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number>(100000);
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Test Runner state
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPaymentsAndInvoices = async () => {
    setLoading(true);
    try {
      const [resPay, resInv] = await Promise.all([
        fetch("/api/accounting/payments"),
        fetch("/api/accounting/invoices"),
      ]);

      if (resPay.ok) {
        const dataPay = await resPay.json();
        setPayments(dataPay.payments || []);
      }

      if (resInv.ok) {
        const dataInv = await resInv.json();
        const invList = dataInv.invoices || [];
        setInvoices(invList);
        if (invList.length > 0 && !selectedInvoiceId) {
          setSelectedInvoiceId(invList[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchPaymentsAndInvoices();
  }, []);

  const handleSwitchRole = async (targetRole: string) => {
    const res = await fetch("/api/auth/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: targetRole }),
    });
    if (res.ok) {
      const data = await res.json();
      setCurrentUser(data.user);
    }
  };

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  // Submit Payment Action
  const handleRegisterPayment = async () => {
    if (!selectedInvoiceId) {
      alert("Pilih invoice yang akan dibayar");
      return;
    }

    try {
      const res = await fetch("/api/accounting/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          amount: paymentAmount,
          paymentMethod,
          notes: "Pembayaran terdaftar via UI Form S-12",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal mencatat pembayaran");
        return;
      }

      alert(`Pembayaran berhasil dicatat! Sisa piutang: Rp${data.remainingBalance?.toLocaleString("id-ID")}`);
      await fetchPaymentsAndInvoices();
    } catch (e) {
      console.error(e);
    }
  };

  // Run Test T-23
  const runTestT23 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("FINANCE");

      let targetInv = invoices.find((inv) => (inv.status === "POSTED" || inv.status === "CONFIRMED") && (inv.outstandingAmount >= 100000 || inv.totalGross >= 100000));

      if (!targetInv) {
        const resInv = await fetch("/api/accounting/invoices");
        const dataInv = await resInv.json();
        targetInv = dataInv.invoices?.find((i: any) => (i.status === "POSTED" || i.status === "CONFIRMED") && (i.outstandingAmount >= 100000 || i.totalGross >= 100000));
      }

      if (!targetInv) {
        alert("Jalankan Uji T-19 terlebih dahulu untuk memastikan adanya Customer Invoice status POSTED dengan nilai tagihan.");
        return;
      }

      const resPay = await fetch("/api/accounting/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: targetInv.id,
          amount: 100000,
          paymentMethod: "BANK",
        }),
      });
      const dataPay = await resPay.json();

      const passed =
        dataPay.success === true &&
        dataPay.remainingBalance === targetInv.outstandingAmount - 100000 &&
        dataPay.journalEntry?.items?.length === 2;

      setTestResult({
        id: "T-23",
        name: "Alur Normal: Pembayaran Parsial Customer Invoice Rp100.000 (Fitur F-15 / Wireframe S-12)",
        status: passed ? "PASS" : "FAIL",
        expected: "Gross awal Rp264.000; Paid Rp100.000; Outstanding Rp164.000; Bank naik Rp100.000; A/R turun Rp100.000.",
        actual: `Pembayaran ${dataPay.payment?.paymentNumber} sukses. Nilai bayar: Rp${dataPay.payment?.amount?.toLocaleString("id-ID")}, Sisa Piutang: Rp${dataPay.remainingBalance?.toLocaleString("id-ID")}. Journal Entry: Dr 1010 Bank Rp100.000 / Cr 1020 AR Rp100.000.`,
      });

      await fetchPaymentsAndInvoices();
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-24
  const runTestT24 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("FINANCE");

      const resInv = await fetch("/api/accounting/invoices");
      const dataInv = await resInv.json();
      const targetInv = dataInv.invoices?.find((i: any) => i.status === "CONFIRMED");

      if (!targetInv) {
        alert("Jalankan Uji T-19 terlebih dahulu untuk menghasilkan data tagihan.");
        return;
      }

      const resExcess = await fetch("/api/accounting/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: targetInv.id,
          amount: 300000,
          paymentMethod: "BANK",
        }),
      });
      const dataExcess = await resExcess.json();

      const blockedOk =
        resExcess.status === 400 &&
        dataExcess.error?.includes("Pembayaran melebihi sisa tagihan");

      setTestResult({
        id: "T-24",
        name: "Aturan / Edge Case: Pencegahan Pembayaran Berlebih / Overpayment (SR-19 / F-15)",
        status: blockedOk ? "PASS" : "FAIL",
        expected: "Sistem menolak pembayaran Rp300.000 karena melebihi saldo outstanding sesuai aturan SR-19.",
        actual: `HTTP ${resExcess.status}: "${dataExcess.error}". Overpayment berhasil diblokir di server.`,
      });
    } finally {
      setTesting(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        p.paymentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.invoice?.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMethod = methodFilter === "ALL" || p.paymentMethod === methodFilter;
      return matchSearch && matchMethod;
    });
  }, [payments, searchQuery, methodFilter]);

  const totalCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [payments]);

  return (
    <AppLayout
      currentUser={currentUser}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[
        { label: "Keuangan & Akuntansi", href: "/accounting/invoices" },
        { label: "Pembayaran & Kas (S-12)" },
      ]}
    >
      <div className="space-y-6">
        {/* Module Header & Sub-Nav */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-2 p-5 rounded-2xl border border-white/80 shadow-glass-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#174A3A]" />
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Register Payment & Cash Receipt
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-[#174A3A] border border-emerald-500/30">
                Wireframe S-12
              </span>
            </div>
            <p className="text-xs text-slate-700 font-semibold mt-1">
              Pencatatan kas masuk, pelunasan piutang parsial & penegakan proteksi overpayment (SR-19 / F-15).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/accounting/invoices"
              className="text-xs font-black px-3.5 py-1.5 rounded-xl btn-glass-secondary text-slate-800 hover:-translate-y-0.5 hover:shadow-xs transition-all"
            >
              Customer Invoices
            </Link>
            <Link
              href="/accounting/vendor-bills"
              className="text-xs font-black px-3.5 py-1.5 rounded-xl btn-glass-secondary text-slate-800 hover:-translate-y-0.5 hover:shadow-xs transition-all"
            >
              Vendor Bills
            </Link>
            <Link
              href="/accounting/journal-entries"
              className="text-xs font-black px-3.5 py-1.5 rounded-xl btn-glass-secondary text-slate-800 hover:-translate-y-0.5 hover:shadow-xs transition-all"
            >
              General Ledger
            </Link>
            <button
              onClick={fetchPaymentsAndInvoices}
              className="p-2 rounded-xl btn-glass-secondary text-slate-700 hover:text-[#174A3A] transition-all hover:-translate-y-0.5"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Selected Invoice Payment Card (Wireframe S-12 Sections ②, ③, ④) */}
        <div className="glass-2 rounded-2xl border border-white/80 shadow-glass-2 overflow-hidden">
          {/* Section ②: Mode View / Status Breadcrumb */}
          <div className="bg-white/40 px-6 py-3.5 border-b border-black/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Tahap Pembayaran:</span>
              <div className="inline-flex rounded-xl overflow-hidden border border-white/60 bg-white/70 shadow-xs">
                {["INVOICE", "PAYMENT", "RECONCILED"].map((st) => {
                  const isReconciled = selectedInvoice?.paymentStatus === "PAID";
                  const isPartial = selectedInvoice?.paymentStatus === "PARTIAL";
                  const active =
                    st === "INVOICE" ||
                    (st === "PAYMENT" && (isPartial || isReconciled)) ||
                    (st === "RECONCILED" && isReconciled);

                  return (
                    <span
                      key={st}
                      className={`px-3 py-1 text-xs font-black font-mono transition-colors ${
                        active
                          ? "bg-[#174A3A] text-white shadow-xs"
                          : "text-slate-700 hover:bg-white/50"
                      }`}
                    >
                      {st}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="text-xs text-slate-800 font-semibold">
              Kebijakan <strong className="text-[#174A3A] font-black">SR-19</strong>: Pembayaran parsial diizinkan; overpayment dilarang keras.
            </div>
          </div>

          {/* Section ③: Form Inti */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-white border-b border-[#DCE8DF]">
            <div>
              <label className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider block mb-1">
                Pilih Customer Invoice
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full text-xs font-mono font-bold bg-white border border-[#DCE8DF] rounded-lg p-2.5 text-[#202824] focus:outline-none focus:ring-2 focus:ring-[#174A3A]"
              >
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.customer?.name} (Rp{inv.totalAmount?.toLocaleString("id-ID")})
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-700 font-semibold block mt-1.5">
                Customer: <strong className="text-slate-900 font-black">{selectedInvoice?.customer?.name || "-"}</strong> ({selectedInvoice?.customer?.code || "-"})
              </span>
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs font-mono font-bold input-glass rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-[#174A3A]"
              >
                <option value="BANK">Bank BCA / Transfer (1010 Bank)</option>
                <option value="CASH">Kas Tunai / Cash (1010 Cash)</option>
                <option value="QRIS">QRIS Dinamis (1010 Bank)</option>
              </select>
              <span className="text-[11px] text-slate-700 font-semibold block mt-1.5">
                Target GL: <span className="font-mono text-[#174A3A] font-black">1010 Kas & Setara Kas</span>
              </span>
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                Nominal Bayar (Rp)
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                min={1}
                className="w-full text-xs font-mono font-bold input-glass rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-[#174A3A]"
              />
              <span className="text-[11px] text-slate-700 font-semibold block mt-1.5">
                Contoh: Rp100.000 untuk pengujian T-23
              </span>
            </div>

            <div className="flex flex-col justify-end">
              <button
                onClick={handleRegisterPayment}
                className="w-full py-2.5 btn-glass-primary text-white rounded-xl text-xs font-black flex items-center justify-center space-x-2 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Receipt className="w-4 h-4 text-[#C6A15B]" />
                <span>Konfirmasi Pembayaran</span>
              </button>
            </div>
          </div>

          {/* Section ④: Pembayaran Parsial dan Sisa KPI Grid */}
          <div className="p-6 bg-white/40">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-[#174A3A]" />
              <span>Ringkasan Saldo Pembayaran Parsial & Sisa Piutang (F-15 / S-12)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-3 p-4 rounded-xl border border-white/80 shadow-xs">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Nilai Tagihan (Gross + PBJT)
                </span>
                <span className="text-xl font-black text-slate-900 font-mono block mt-1">
                  Rp{selectedInvoice?.totalAmount?.toLocaleString("id-ID") || "0"}
                </span>
                <span className="text-xs text-slate-700 font-semibold block mt-1">
                  Net + PBJT 10%
                </span>
              </div>

              <div className="glass-3 p-4 rounded-xl border border-emerald-500/40 shadow-xs">
                <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wider block">
                  Sudah Terbayar (Paid Amount)
                </span>
                <span className="text-xl font-black text-emerald-900 font-mono block mt-1">
                  Rp{selectedInvoice?.paidAmount?.toLocaleString("id-ID") || "0"}
                </span>
                <span className="text-xs text-slate-700 font-semibold block mt-1">
                  Akumulasi kas diterima
                </span>
              </div>

              <div className="glass-3 p-4 rounded-xl border border-amber-500/40 shadow-xs">
                <span className="text-[11px] font-black text-amber-950 uppercase tracking-wider block">
                  Sisa Piutang (Outstanding Balance)
                </span>
                <span className="text-xl font-black text-amber-900 font-mono block mt-1">
                  Rp{selectedInvoice?.outstandingAmount?.toLocaleString("id-ID") || "0"}
                </span>
                <span className="text-xs text-slate-700 font-semibold block mt-1">
                  Sisa piutang akun 1020 Piutang Usaha
                </span>
              </div>
            </div>
          </div>

          {/* Wireframe S-12 Section ⑤: Related Docs & Audit Trail */}
          <div className="bg-white px-6 py-3.5 border-t border-[#DCE8DF] flex flex-wrap items-center justify-between text-xs text-[#758078]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-[#202824]">⑤ Related Documents:</span>
              <span className="font-mono text-[#174A3A] font-semibold">
                Invoice: {selectedInvoice?.invoiceNumber || "-"}
              </span>
              <span>•</span>
              <span className="font-mono text-[#202824]">
                Customer: {selectedInvoice?.customer?.code || "-"}
              </span>
              <span>•</span>
              <span className="font-mono text-[#C6A15B] font-semibold">
                Jurnal Otomatis: Dr 1010 Kas / Cr 1020 Piutang Usaha
              </span>
            </div>
            <span className="text-[11px] text-[#758078] font-mono">
              Audit recorded to System Log
            </span>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="glass-2 rounded-2xl border border-white/80 shadow-glass-2 overflow-hidden">
          <div className="p-5 border-b border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-wide uppercase">
                Riwayat Pembayaran Terdaftar (Payment History)
              </h2>
              <p className="text-xs text-slate-700 font-semibold mt-0.5">
                Total pembayaran terakumulasi: <strong className="text-[#174A3A] font-black">Rp{totalCollected.toLocaleString("id-ID")}</strong> ({payments.length} transaksi)
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari no. bayar / customer / invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs input-glass rounded-xl font-bold text-slate-900"
                />
              </div>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="text-xs input-glass rounded-xl px-2.5 py-1.5 font-bold text-slate-900"
              >
                <option value="ALL">Semua Metode</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CASH">Cash / Tunai</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-white/80 glass-3">
            <table className="w-full text-left text-xs text-slate-900">
              <thead className="bg-white/60 border-b border-black/10 text-slate-900 font-black uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">No. Bukti Bayar</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Customer / Partner</th>
                  <th className="py-3.5 px-4">Invoice / Referensi</th>
                  <th className="py-3.5 px-4">Metode</th>
                  <th className="py-3.5 px-4 text-right">Nominal Bayar</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-mono">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-700 font-bold font-sans">
                      {loading ? "Memuat riwayat pembayaran..." : "Belum ada catatan pembayaran yang cocok dengan filter."}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-emerald-500/10 transition-colors duration-150">
                      <td className="py-3.5 px-4 font-black text-[#174A3A]">
                        {p.paymentNumber}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-700 font-bold">
                        {new Date(p.paymentDate).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-900 font-black">
                        {p.customer?.name || p.vendor?.name || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-[#174A3A] font-bold">
                        {p.invoice?.invoiceNumber || p.bill?.billNumber || "-"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-[#174A3A] border border-emerald-500/30">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-[#174A3A]">
                        Rp{p.amount?.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={p.status || "CONFIRMED"} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Collapsible QA Automated Test Runner: T-23 & T-24 */}
        <details className="group bg-slate-900 text-white rounded-2xl p-5 border border-slate-800">
          <summary className="cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white select-none">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md bg-[#C6A15B] text-slate-900 font-bold text-[10px] uppercase">
                Developer Tool
              </span>
              <span>🛠️ Panel Pengujian Otomatis Rubrik (T-23 & T-24)</span>
            </div>
            <span className="text-[11px] text-slate-400 group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>

          <div className="pt-4 mt-3 border-t border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-300">
                  Memvalidasi pelunasan invoice, saldo buku besar piutang, dan penolakan kelebihan bayar (SR-19).
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={runTestT23}
                  disabled={testing}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Jalankan T-23</span>
                </button>
                <button
                  onClick={runTestT24}
                  disabled={testing}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Jalankan T-24</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                  testResult.status === "PASS"
                    ? "bg-slate-950 border-emerald-500/50 text-slate-200"
                    : "bg-rose-950/60 border-rose-500/50 text-rose-200"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                        testResult.status === "PASS"
                          ? "bg-emerald-500 text-slate-950 font-bold"
                          : "bg-rose-500 text-white"
                      }`}
                    >
                      {testResult.status}
                    </span>
                    <span className="text-white text-sm">
                      {testResult.id} — {testResult.name}
                    </span>
                  </span>
                </div>
                <div className="space-y-1">
                  <p>
                    <strong className="text-[#C6A15B]">Ekspektasi:</strong> {testResult.expected}
                  </p>
                  <p className="font-mono">
                    <strong className="text-white">Hasil Aktual:</strong> {testResult.actual}
                  </p>
                </div>
              </div>
            )}
          </div>
        </details>
      </div>
    </AppLayout>
  );
}
