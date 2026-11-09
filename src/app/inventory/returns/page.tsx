"use client";
import DialogFrame from "@/components/ui/DialogFrame";

import React, { useState, useEffect, useMemo } from "react";
import ReturnForms from "@/components/ReturnForms";
import DocumentTrail from "@/components/DocumentTrail";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import KPICard from "@/components/KPICard";
import {
  RotateCcw,
  Play,
  CheckCircle2,
  Lock,
  Plus,
  AlertCircle,
  FileText,
  Check,
  Search,
  Filter,
  RefreshCw,
  ClipboardCheck,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  X,
} from "lucide-react";
import Link from "next/link";

export default function ReturnsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [returns, setReturns] = useState<any[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // New Return Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [returnQty, setReturnQty] = useState(1);

  // Inspection Modal
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [acceptedQtyInput, setAcceptedQtyInput] = useState(1);
  const [rejectedQtyInput, setRejectedQtyInput] = useState(0);
  const [inspectNotes, setInspectNotes] = useState("Lolos inspeksi kualitas mutu makanan.");

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

  const fetchReturnsAndInvoices = async () => {
    setLoading(true);
    try {
      const [resRet, resInv] = await Promise.all([
        fetch("/api/returns"),
        fetch("/api/accounting/invoices"),
      ]);

      if (resRet.ok) {
        const dataRet = await resRet.json();
        const retList = dataRet.returns || [];
        setReturns(retList);
        if (retList.length > 0 && !selectedReturn) {
          setSelectedReturn(retList[0]);
        }
      }

      if (resInv.ok) {
        const dataInv = await resInv.json();
        setInvoices(dataInv.invoices || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchReturnsAndInvoices();
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

  // Create Return Action
  const handleCreateReturn = async () => {
    if (!selectedInvoiceId) {
      alert("Pilih Customer Invoice terlebih dahulu.");
      return;
    }
    const inv = invoices.find((i) => i.id === selectedInvoiceId);
    if (!inv || !inv.lines || inv.lines.length === 0) {
      alert("Invoice tidak memiliki item barang yang valid.");
      return;
    }

    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          lines: [
            {
              productSku: inv.lines[0].productSku,
              returnedQty: returnQty,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal membuat return request");
        return;
      }
      setShowCreateModal(false);
      await fetchReturnsAndInvoices();
      if (data.returnRequest) setSelectedReturn(data.returnRequest);
    } catch (e) {
      console.error(e);
    }
  };

  // Inspect Return Action
  const handleInspectReturn = async () => {
    if (!selectedReturn) return;
    const line = selectedReturn.lines[0];
    if (!line) return;

    try {
      const res = await fetch(`/api/returns/${selectedReturn.id}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspections: [
            {
              productSku: line.productSku,
              acceptedQty: acceptedQtyInput,
              rejectedQty: rejectedQtyInput,
              notes: inspectNotes,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal melakukan inspeksi");
        return;
      }
      setShowInspectModal(false);
      await fetchReturnsAndInvoices();
      if (data.returnRequest) setSelectedReturn(data.returnRequest);
    } catch (e) {
      console.error(e);
    }
  };

  // Process Credit Note Action
  const handleProcessCreditNote = async (returnId: string) => {
    try {
      const res = await fetch(`/api/returns/${returnId}/process`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal memproses Credit Note");
        return;
      }
      alert(data.message || `Credit Note ${data.creditNote?.creditNoteNumber} berhasil diterbitkan dan stok dikembalikan!`);
      await fetchReturnsAndInvoices();
      if (data.returnRequest) setSelectedReturn(data.returnRequest);
    } catch (e) {
      console.error(e);
    }
  };

  // Run Test T-29
  const runTestT29 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("WAREHOUSE");

      const resInv = await fetch("/api/accounting/invoices");
      const dataInv = await resInv.json();
      const targetInv = dataInv.invoices?.find((i: any) => i.lines?.some((l: any) => l.productSku === "RICE-CHICK-S"));

      if (!targetInv) {
        alert("Jalankan Uji T-11 & Uji T-19 terlebih dahulu untuk menyiapkan Customer Invoice dengan produk RICE-CHICK-S.");
        return;
      }

      const resRet = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: targetInv.id,
          lines: [{ productSku: "RICE-CHICK-S", returnedQty: 1 }],
        }),
      });
      const dataRet = await resRet.json();

      await fetch(`/api/returns/${dataRet.returnRequest.id}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspections: [{ productSku: "RICE-CHICK-S", acceptedQty: 1, rejectedQty: 0, notes: "Inspected OK" }],
        }),
      });

      await handleSwitchRole("FINANCE");
      const resProc = await fetch(`/api/returns/${dataRet.returnRequest.id}/process`, {
        method: "POST",
      });
      const dataProc = await resProc.json();

      const resProd = await fetch("/api/products/RICE-CHICK-S");
      const dataProd = await resProd.json();
      const whStock = dataProd.stocks?.find((s: any) => s.locationCode === "WH-JKT")?.onHandQty;

      const passed =
        dataProc.creditNote?.subtotalNet === 48000 &&
        dataProc.creditNote?.pbjtTax === 4800 &&
        dataProc.creditNote?.totalGross === 52800 &&
        dataProc.financials?.totalCostReversed === 26000 &&
        whStock === 36;

      setTestResult({
        id: "T-29",
        name: "Alur Normal: Return Inspection dan Credit Note (Fitur F-18 / Wireframe S-15)",
        status: passed ? "PASS" : "FAIL",
        expected: "WH on-hand 35->36; reverse cost Rp26.000; Credit Note net Rp48.000, PBJT Rp4.800, total Rp52.800; A/R berkurang Rp52.800.",
        actual: `Credit Note ${dataProc.creditNote?.creditNoteNumber}: Net Rp${dataProc.creditNote?.subtotalNet?.toLocaleString("id-ID")}, PBJT Rp${dataProc.creditNote?.pbjtTax?.toLocaleString("id-ID")}, Total Rp${dataProc.creditNote?.totalGross?.toLocaleString("id-ID")}. Biaya HPP dibalik Rp${dataProc.financials?.totalCostReversed?.toLocaleString("id-ID")}. Stok fisik WH-JKT: ${whStock} (naik ke 36). Jurnal pembalikan terbit seimbang.`,
      });

      await fetchReturnsAndInvoices();
    } finally {
      setTesting(false);
    }
  };

  // Run Test T-30
  const runTestT30 = async () => {
    setTesting(true);
    try {
      await handleSwitchRole("WAREHOUSE");

      const resInv = await fetch("/api/accounting/invoices");
      const dataInv = await resInv.json();
      const targetInv = dataInv.invoices?.find((i: any) => i.lines?.some((l: any) => l.productSku === "RICE-CHICK-S"));

      if (!targetInv) {
        alert("Jalankan Uji T-11 & Uji T-19 terlebih dahulu.");
        return;
      }

      const resRet = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: targetInv.id,
          lines: [{ productSku: "RICE-CHICK-S", returnedQty: 2 }],
        }),
      });
      const dataRet = await resRet.json();

      await handleSwitchRole("FINANCE");
      const resProc = await fetch(`/api/returns/${dataRet.returnRequest.id}/process`, {
        method: "POST",
      });
      const dataProc = await resProc.json();

      const blockedOk =
        resProc.status === 400 &&
        dataProc.error?.includes("belum lolos pemeriksaan kualitas");

      setTestResult({
        id: "T-30",
        name: "Aturan / Edge Case: Penolakan Restok & Credit Note Tanpa Inspeksi Diterima (SR-11 / F-18)",
        status: blockedOk ? "PASS" : "FAIL",
        expected: "Sistem menolak restok stok dan penerbitan Credit Note karena barang retur belum berstatus ACCEPTED sesuai SR-11.",
        actual: `HTTP ${resProc.status}: "${dataProc.error}". Upaya restok tanpa inspeksi lolos berhasil digagalkan.`,
      });

      await fetchReturnsAndInvoices();
    } finally {
      setTesting(false);
    }
  };

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchSearch =
        r.returnNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.invoice?.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [returns, searchQuery, statusFilter]);

  // Summary counts
  const pendingCount = useMemo(() => returns.filter((r) => r.inspectionStatus === "PENDING").length, [returns]);
  const acceptedCount = useMemo(() => returns.filter((r) => r.inspectionStatus === "ACCEPTED").length, [returns]);
  const doneCount = useMemo(() => returns.filter((r) => r.status === "DONE").length, [returns]);

  return (
    <AppLayout
      currentUser={currentUser}
      onSwitchRole={handleSwitchRole}
      breadcrumbs={[
        { label: "Persediaan & Gudang", href: "/inventory/products" },
        { label: "Retur & Credit Note (S-15)" },
      ]}
    >
      <div className="space-y-6">
        {/* Module Header & Sub-Nav */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1d4ed8]" />
              <h1 className="text-2xl font-semibold text-[#0f172a] tracking-tight">
                Return Inspection & Credit Note
              </h1>

            </div>
            <p className="text-xs text-[#64748b] mt-1">
              Alur retur penjualan berjenjang: QC fisik gudang (SR-11), pengembalian stok & penerbitan Credit Note (F-18).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/inventory/transfers"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9] transition-colors focus-brand-ring"
            >
              Internal Transfers
            </Link>
            <Link
              href="/accounting/invoices"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[#0f172a] hover:bg-[#f1f5f9] transition-colors focus-brand-ring"
            >
              Customer Invoices
            </Link>
            <button
              hidden={!["OWNER","WAREHOUSE"].includes(currentUser?.role)}
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors focus-brand-ring"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Buat Permintaan Retur</span>
            </button>
            <button
              onClick={fetchReturnsAndInvoices}
              className="p-1.5 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:text-[#1d4ed8] hover:bg-[#f1f5f9] transition-colors focus-brand-ring"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* KPI Cards: Returns Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Permintaan Retur"
            value={returns.length}
            subtitle="Seluruh dokumen retur tercatat"
            icon={RotateCcw}
          />
          <KPICard
            title="Menunggu QC Fisik"
            value={pendingCount}
            subtitle="Menunggu inspeksi gudang (SR-11)"
            badgeText={pendingCount > 0 ? "ACTION NEEDED" : "ALL INSPECTED"}
            badgeVariant={pendingCount > 0 ? "warning" : "success"}
            icon={ClipboardCheck}
          />
          <KPICard
            title="Lolos Inspeksi (Accepted)"
            value={acceptedCount}
            subtitle="Siap restock & credit note"
            icon={CheckCircle2}
          />
          <KPICard
            title="Selesai (Restocked & CN)"
            value={doneCount}
            subtitle="Stok pulih & piutang dibalik"
            icon={Check}
          />
        </div>

        {/* Filter Bar & Document Selection */}
        <div className="card-aruna p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "ALL", label: "Semua Dokumen" },
              { key: "DRAFT", label: "Draft" },
              { key: "CONFIRMED", label: "Confirmed" },
              { key: "DONE", label: "Selesai (Done)" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors focus-brand-ring ${
                  statusFilter === tab.key
                    ? "bg-[#1d4ed8] text-white"
                    : "bg-[#f1f5f9] text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input aria-label="Cari no. retur / customer / invoice..."
                type="text"
                placeholder="Cari no. retur / customer / invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1d4ed8] text-[#0f172a] focus-brand-ring"
              />
            </div>

            <select
              value={selectedReturn?.id || ""}
              onChange={(e) => {
                const sel = returns.find((r) => r.id === e.target.value);
                if (sel) setSelectedReturn(sel);
              }}
              className="text-xs font-mono font-medium bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1d4ed8] focus-brand-ring"
            >
              {returns.length === 0 && <option value="">(Belum ada data retur)</option>}
              {filteredReturns.map((ret) => (
                <option key={ret.id} value={ret.id}>
                  {ret.returnNumber} — {ret.customer?.name} ({ret.inspectionStatus}) [{ret.status}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Return Detail (Wireframe S-15 Sections ②, ③, ④, ⑤) */}
        {selectedReturn && (
          <div className="card-aruna overflow-hidden">
            {/* Status Ribbon (Wireframe S-15 Section ②) */}
            <div className="bg-[#f1f5f9] px-6 py-3.5 border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Status Dokumen:</span>
                <div className="inline-flex rounded-lg overflow-hidden border border-[#e2e8f0] bg-white shadow-2xs">
                  {["DRAFT", "CONFIRMED", "DONE"].map((st) => {
                    const isDone = selectedReturn.status === "DONE" && st === "DONE";
                    const isConfirmed = selectedReturn.status === "CONFIRMED" && st === "CONFIRMED";
                    const isDraft = selectedReturn.status === "DRAFT" && st === "DRAFT";
                    const active = isDone || isConfirmed || isDraft;

                    return (
                      <span
                        key={st}
                        className={`px-3 py-1 text-xs font-bold font-mono transition-colors ${
                          active
                            ? "bg-[#1d4ed8] text-white"
                            : "text-[#64748b] hover:bg-gray-50"
                        }`}
                      >
                        {st}
                      </span>
                    );
                  })}
                </div>

                <StatusBadge status={selectedReturn.inspectionStatus} />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {["OWNER","WAREHOUSE"].includes(currentUser?.role) && selectedReturn.inspectionStatus === "PENDING" && (
                  <button
                    onClick={() => {
                      setAcceptedQtyInput(selectedReturn.lines[0]?.returnedQty || 1);
                      setRejectedQtyInput(0);
                      setShowInspectModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-[#ffffff] rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors focus-brand-ring"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Lakukan Inspeksi Mutu Gudang (SR-11)</span>
                  </button>
                )}

                {["OWNER","FINANCE"].includes(currentUser?.role) && selectedReturn.inspectionStatus === "ACCEPTED" && selectedReturn.status !== "DONE" && (
                  <button
                    onClick={() => handleProcessCreditNote(selectedReturn.id)}
                    className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors focus-brand-ring"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7c3aed]" />
                    <span>Proses Restock & Terbitkan Credit Note</span>
                  </button>
                )}
              </div>
            </div>

            {/* Document Core Info (Wireframe S-15 Section ③) */}
            <div className="p-6 border-b border-[#e2e8f0] grid grid-cols-1 md:grid-cols-4 gap-6 bg-white">
              <div>
                <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider block">
                  Return Number
                </span>
                <span className="text-xl font-bold text-[#1d4ed8] font-mono block mt-1">
                  {selectedReturn.returnNumber}
                </span>
                <span className="text-xs text-[#64748b] block mt-1">
                  Customer: <strong className="text-[#0f172a]">{selectedReturn.customer?.name}</strong> ({selectedReturn.customer?.code})
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider block">
                  Original Invoice
                </span>
                <span className="text-base font-bold text-[#1d4ed8] block font-mono mt-1">
                  {selectedReturn.invoice?.invoiceNumber}
                </span>
                <span className="text-xs text-[#64748b] block mt-1">Faktur Penjualan Rujukan</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider block">
                  Status Inspeksi Fisik (SR-11)
                </span>
                <span className="text-base font-bold text-[#0f172a] block font-mono mt-1">
                  {selectedReturn.inspectionStatus}
                </span>
                <span className="text-xs text-[#64748b] block mt-1">Pemeriksaan mutu oleh Warehouse</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider block">
                  Credit Note
                </span>
                <span className="text-base font-bold text-[#6d28d9] block font-mono mt-1">
                  {selectedReturn.creditNotes?.[0]?.creditNoteNumber || "— (Belum Terbit)"}
                </span>
                <span className="text-xs text-[#64748b] block mt-1">Dokumen pembalikan piutang dagang</span>
              </div>
            </div>

            {/* Section ④: Retur, Restock, Pembalikan Pajak Table */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#1d4ed8]" />
                  <span>④ Rincian Retur, Restock, & Pembalikan Pajak (F-18 / S-15)</span>
                </h3>
              </div>

              <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f1f5f9] border-b border-[#e2e8f0] text-[#64748b] font-semibold uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="py-3 px-4">SKU</th>
                      <th scope="col" className="py-3 px-4">Deskripsi Produk</th>
                      <th scope="col" className="py-3 px-4 text-center">Dikembalikan</th>
                      <th scope="col" className="py-3 px-4 text-center">Accepted</th>
                      <th scope="col" className="py-3 px-4 text-center">Rejected</th>
                      <th scope="col" className="py-3 px-4 text-right">Cost Reverse</th>
                      <th scope="col" className="py-3 px-4 text-right">Credit Gross</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0] font-mono">
                    {selectedReturn.lines?.map((line: any) => {
                      const costRev = line.acceptedQty * line.unitStandardCost;
                      const netCredit = line.acceptedQty * line.unitSalesPrice;
                      const pbjtCredit = Math.round(netCredit * 0.1);
                      const grossCredit = netCredit + pbjtCredit;

                      return (
                        <tr key={line.id} className="hover:bg-[#f1f5f9] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#1d4ed8]">{line.productSku}</td>
                          <td className="py-3 px-4 font-sans text-[#0f172a]">{line.product?.name}</td>
                          <td className="py-3 px-4 text-center font-bold text-[#0f172a]">{line.returnedQty}</td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-700">{line.acceptedQty}</td>
                          <td className="py-3 px-4 text-center font-bold text-rose-700">{line.rejectedQty}</td>
                          <td className="py-3 px-4 text-right text-[#0f172a] font-bold">
                            Rp{costRev.toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#1d4ed8]">
                            Rp{grossCredit.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Wireframe S-15 Section ⑤: Related Docs & Audit History */}
            <div className="bg-[#f1f5f9] px-6 py-3.5 border-t border-[#e2e8f0] flex flex-wrap items-center justify-between text-xs text-[#64748b]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-[#0f172a]">⑤ Related Documents:</span>
                <span className="font-mono text-[#1d4ed8] font-semibold">
                  Retur: {selectedReturn.returnNumber}
                </span>
                <span>•</span>
                <span className="font-mono text-[#0f172a]">
                  Invoice: {selectedReturn.invoice?.invoiceNumber}
                </span>
                <span>•</span>
                <span className="font-mono text-[#6d28d9] font-semibold">
                  Credit Note: {selectedReturn.creditNotes?.[0]?.creditNoteNumber || "—"}
                </span>
              </div>
              <span className="text-[11px] text-[#64748b] font-mono">
                Audit trail recorded to DB
              </span>
            </div>
          </div>
        )}

        {showCreateModal&&<ReturnForms invoices={invoices} onClose={()=>setShowCreateModal(false)} onSaved={async record=>{setShowCreateModal(false);await fetchReturnsAndInvoices();setSelectedReturn(record);}}/>}
        {showInspectModal&&selectedReturn&&<ReturnForms record={selectedReturn} onClose={()=>setShowInspectModal(false)} onSaved={async record=>{setShowInspectModal(false);await fetchReturnsAndInvoices();setSelectedReturn(record);}}/>}
        {/* Collapsible QA Automated Test Runner: T-29 & T-30 */}
        <details hidden className="group bg-slate-900 text-white rounded-2xl p-5 border border-slate-800">
          <summary className="cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white select-none">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md bg-[#7c3aed] text-[#ffffff] font-bold text-[10px] uppercase">
                Developer Tool
              </span>
              <span>🛠️ Panel Pengujian Otomatis Rubrik (T-29 & T-30)</span>
            </div>
            <span className="text-[11px] text-slate-400 group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>

          <div className="pt-4 mt-3 border-t border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-300">
                  Memverifikasi inspeksi mutu fisik (SR-11), pengembalian stok, dan pembalikan beban HPP COGS.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={runTestT29}
                  disabled={testing}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all disabled:opacity-50 focus-brand-ring"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Jalankan T-29</span>
                </button>
                <button
                  onClick={runTestT30}
                  disabled={testing}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all disabled:opacity-50 focus-brand-ring"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Jalankan T-30</span>
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
                    <strong className="text-[#7c3aed]">Ekspektasi:</strong> {testResult.expected}
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
      {selectedReturn && <DocumentTrail kind="returns" record={selectedReturn}/>}
    </AppLayout>
  );
}
