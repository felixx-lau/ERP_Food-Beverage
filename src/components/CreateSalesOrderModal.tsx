"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ShoppingCart, Plus, Trash2, X, Check, AlertCircle, Sparkles } from "lucide-react";

interface OrderLineItem {
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

interface CreateSalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (newOrder?: any) => void;
}

export default function CreateSalesOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
}: CreateSalesOrderModalProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [lines, setLines] = useState<OrderLineItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/contacts?type=CUSTOMER").then((r) => r.json()),
        fetch("/api/products").then((r) => r.json()),
      ])
        .then(([cData, pData]) => {
          const cList = cData.contacts || [];
          const pList = pData.products || [];
          setContacts(cList);
          setProducts(pList);

          if (cList.length > 0 && !selectedContactId) {
            setSelectedContactId(cList[0].id);
          }

          // Initial 1 line item if empty
          if (lines.length === 0) {
            const firstP = pList[0];
            setLines([
              {
                productSku: firstP ? firstP.sku : "RICE-CHICK-S",
                productName: firstP ? firstP.name : "Nasi Ayam Bakar Sambal Matah",
                quantity: 2,
                unitPrice: firstP ? firstP.salesPrice : 48000,
                discountPercent: 0,
              },
            ]);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Realtime calculation
  const calculations = useMemo(() => {
    let subtotalNet = 0;
    let pbjtTax = 0;
    let totalGross = 0;
    let hasHighDiscount = false;

    lines.forEach((item) => {
      const netLine = Math.round(item.quantity * item.unitPrice * (1 - item.discountPercent / 100));
      const lineTax = Math.round(netLine * 0.1);
      subtotalNet += netLine;
      pbjtTax += lineTax;
      totalGross += netLine + lineTax;

      if (item.discountPercent > 10) {
        hasHighDiscount = true;
      }
    });

    return { subtotalNet, pbjtTax, totalGross, hasHighDiscount };
  }, [lines]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        productSku: "",
        productName: "",
        quantity: 1,
        unitPrice: 25000,
        discountPercent: 0,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProductInput = (index: number, typedText: string) => {
    setLines((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index] };
      cur.productName = typedText;

      // Check if typed text matches an existing SKU or product Name
      const match = products.find(
        (p) =>
          p.sku.toLowerCase() === typedText.toLowerCase().trim() ||
          p.name.toLowerCase() === typedText.toLowerCase().trim()
      );

      if (match) {
        cur.productSku = match.sku;
        cur.productName = match.name;
        cur.unitPrice = match.salesPrice;
      } else {
        cur.productSku = typedText;
      }

      updated[index] = cur;
      return updated;
    });
  };

  const handleLineChange = (index: number, field: keyof OrderLineItem, val: any) => {
    setLines((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index] };

      if (field === "quantity") {
        cur.quantity = Math.max(1, Number(val) || 1);
      } else if (field === "unitPrice") {
        cur.unitPrice = Math.max(0, Number(val) || 0);
      } else if (field === "discountPercent") {
        cur.discountPercent = Math.min(20, Math.max(0, Number(val) || 0));
      }

      updated[index] = cur;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedContactId) {
      setErrorMsg("Pilih pelanggan terlebih dahulu.");
      return;
    }

    if (lines.length === 0) {
      setErrorMsg("Tambahkan minimal 1 item pesanan.");
      return;
    }

    for (const l of lines) {
      if (!l.productName && !l.productSku) {
        setErrorMsg("Nama produk wajib diisi pada setiap baris.");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContactId,
          lines: lines.map((l) => ({
            productSku: l.productSku || l.productName,
            productName: l.productName || l.productSku,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            discountPercent: Number(l.discountPercent) || 0,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal membuat Sales Order.");
        return;
      }

      setSuccessMsg(
        `Pesanan ${data.order.orderNumber} berhasil dibuat dengan status ${data.order.status}!`
      );

      setTimeout(() => {
        onOrderCreated(data.order);
        onClose();
        setSuccessMsg(null);
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-modal w-full max-w-2xl rounded-3xl shadow-glass-modal border border-white/80 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-white/40 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#174A3A]">
              <ShoppingCart className="w-5 h-5 text-[#174A3A]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Buat Pesanan Penjualan (Sales Order)</h2>
              <p className="text-xs text-slate-700 font-semibold">
                Ketik nama menu, kuantitas, dan harga sesuai pesanan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/80 text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-900 font-bold">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-950 font-bold flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-700" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-1">
              Pelanggan / Pemesan <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 input-glass rounded-xl font-bold text-slate-900"
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-[#202824]">Item Menu & Pesanan</label>
                <p className="text-[10px] text-slate-400">
                  Ketik nama produk sendiri (atau pilih dari saran), atur kuantitas, dan harga satuan
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-bold text-[#174A3A] hover:text-[#11382C] flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Baris</span>
              </button>
            </div>

            {/* Datalist for Product Autocomplete Suggestions */}
            <datalist id="sales-product-suggestions">
              {products.map((p) => (
                <option key={p.sku} value={p.name}>
                  {p.sku} — Rp {p.salesPrice?.toLocaleString("id-ID")}
                </option>
              ))}
            </datalist>

            <div className="space-y-2.5">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#F7F8F5] border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Nama Produk / Menu <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="sales-product-suggestions"
                      placeholder="Ketik produk (misal: Nasi Padang, Es Kopi)"
                      value={line.productName}
                      onChange={(e) => handleProductInput(idx, e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-[#174A3A]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Kuantitas
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => handleLineChange(idx, "quantity", e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono focus:ring-1 focus:ring-[#174A3A]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Harga Satuan (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={line.unitPrice}
                      onChange={(e) => handleLineChange(idx, "unitPrice", e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono focus:ring-1 focus:ring-[#174A3A]"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Diskon %
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={line.discountPercent}
                      onChange={(e) => handleLineChange(idx, "discountPercent", e.target.value)}
                      className="w-full text-xs px-1.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-center"
                      title="Maksimal 20%"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={lines.length <= 1}
                      onClick={() => handleRemoveLine(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                      title="Hapus baris"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Approval Alert if discount > 10% */}
          {calculations.hasHighDiscount && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Info Diskon:</strong> Ada item dengan diskon &gt; 10%. Pesanan akan memerlukan persetujuan Owner.
              </span>
            </div>
          )}

          {/* Summary Box */}
          <div className="p-4 rounded-2xl glass-3 border border-white/80 space-y-2 text-xs shadow-xs">
            <div className="flex justify-between text-slate-700 font-semibold">
              <span>Subtotal Net</span>
              <span className="font-mono font-black text-slate-900">Rp {calculations.subtotalNet.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-semibold">
              <span>Pajak Restoran PBJT (10%)</span>
              <span className="font-mono font-black text-slate-900">Rp {calculations.pbjtTax.toLocaleString("id-ID")}</span>
            </div>
            <div className="border-t border-black/10 pt-2 flex justify-between font-black text-sm text-slate-900">
              <span>Total Tagihan Pesanan</span>
              <span className="font-mono text-[#174A3A] font-black text-base">Rp {calculations.totalGross.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end space-x-2 border-t border-black/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black btn-glass-secondary rounded-xl hover:-translate-y-0.5 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-black btn-glass-primary rounded-xl shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex items-center space-x-1.5"
            >
              {loading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Pesanan Penjualan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
