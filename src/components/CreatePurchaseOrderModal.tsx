"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ShoppingBag, Plus, Trash2, X, Check, Building } from "lucide-react";

interface POLineItem {
  productSku: string;
  productName: string;
  orderedQty: number;
  unitPrice: number;
}

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (newOrder?: any) => void;
}

export default function CreatePurchaseOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
}: CreatePurchaseOrderModalProps) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [lines, setLines] = useState<POLineItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/contacts?type=VENDOR").then((r) => r.json()),
        fetch("/api/products").then((r) => r.json()),
      ])
        .then(([vData, pData]) => {
          const vList = vData.contacts || [];
          const pList = pData.products || [];
          setVendors(vList);
          setProducts(pList);

          if (vList.length > 0 && !selectedVendorId) {
            setSelectedVendorId(vList[0].id);
          }

          if (lines.length === 0) {
            const firstP = pList[0];
            setLines([
              {
                productSku: firstP ? firstP.sku : "COF-LATT-HOT",
                productName: firstP ? firstP.name : "Latte Panas (Bahan)",
                orderedQty: 10,
                unitPrice: firstP ? firstP.standardCost : 12000,
              },
            ]);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const totalAmount = useMemo(() => {
    return lines.reduce((sum, item) => sum + item.orderedQty * item.unitPrice, 0);
  }, [lines]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        productSku: "",
        productName: "",
        orderedQty: 10,
        unitPrice: 15000,
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

      const match = products.find(
        (p) =>
          p.sku.toLowerCase() === typedText.toLowerCase().trim() ||
          p.name.toLowerCase() === typedText.toLowerCase().trim()
      );

      if (match) {
        cur.productSku = match.sku;
        cur.productName = match.name;
        cur.unitPrice = match.standardCost;
      } else {
        cur.productSku = typedText;
      }

      updated[index] = cur;
      return updated;
    });
  };

  const handleLineChange = (index: number, field: keyof POLineItem, val: any) => {
    setLines((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index] };

      if (field === "orderedQty") {
        cur.orderedQty = Math.max(1, Number(val) || 1);
      } else if (field === "unitPrice") {
        cur.unitPrice = Math.max(0, Number(val) || 0);
      }

      updated[index] = cur;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedVendorId) {
      setErrorMsg("Pilih vendor terlebih dahulu.");
      return;
    }

    if (lines.length === 0) {
      setErrorMsg("Tambahkan minimal 1 item pesanan.");
      return;
    }

    for (const l of lines) {
      if (!l.productName && !l.productSku) {
        setErrorMsg("Nama barang / bahan pengadaan wajib diisi pada setiap baris.");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch("/api/purchase/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: selectedVendorId,
          lines: lines.map((l) => ({
            productSku: l.productSku || l.productName,
            productName: l.productName || l.productSku,
            orderedQty: Number(l.orderedQty),
            unitPrice: Number(l.unitPrice),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal membuat Purchase Order.");
        return;
      }

      setSuccessMsg(
        `Pesanan Pembelian ${data.order.poNumber} berhasil dibuat dengan status ${data.order.status}!`
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
              <ShoppingBag className="w-5 h-5 text-[#174A3A]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Buat Pesanan Pembelian (Purchase Order)</h2>
              <p className="text-xs text-slate-700 font-semibold">
                Ketik nama bahan/barang pengadaan, kuantitas, dan harga beli ke vendor
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

          {/* Vendor Selection */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-1">
              Vendor / Pemasok <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 input-glass rounded-xl font-bold text-slate-900"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {v.name} ({v.city})
                </option>
              ))}
            </select>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-[#202824]">Item Pengadaan Bahan / Barang</label>
                <p className="text-[10px] text-slate-400">
                  Ketik nama barang sendiri (atau pilih dari saran), atur kuantitas, dan harga beli
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

            {/* Datalist for suggestions */}
            <datalist id="po-product-suggestions">
              {products.map((p) => (
                <option key={p.sku} value={p.name}>
                  {p.sku} — HPP Rp {p.standardCost?.toLocaleString("id-ID")}
                </option>
              ))}
            </datalist>

            <div className="space-y-2.5">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#F7F8F5] border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Nama Barang / Bahan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="po-product-suggestions"
                      placeholder="Ketik nama bahan (misal: Biji Kopi Arabika, Beras)"
                      value={line.productName}
                      onChange={(e) => handleProductInput(idx, e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-[#174A3A]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Kuantitas</label>
                    <input
                      type="number"
                      min={1}
                      value={line.orderedQty}
                      onChange={(e) => handleLineChange(idx, "orderedQty", e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono focus:ring-1 focus:ring-[#174A3A]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Harga Beli / Satuan (Rp)</label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={line.unitPrice}
                      onChange={(e) => handleLineChange(idx, "unitPrice", e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono focus:ring-1 focus:ring-[#174A3A]"
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

          {/* Summary Box */}
          <div className="p-4 rounded-2xl glass-3 border border-white/80 space-y-2 text-xs shadow-xs">
            <div className="flex justify-between font-black text-sm text-slate-900">
              <span>Total Estimasi Pengadaan (PO)</span>
              <span className="font-mono text-[#174A3A] font-black text-base">Rp {totalAmount.toLocaleString("id-ID")}</span>
            </div>
            <p className="text-[11px] text-slate-700 font-semibold">
              Setelah disimpan, pesanan akan berstatus DRAFT dan dapat dikonfirmasi untuk membuat komitmen pengadaan serta dokumen Penerimaan Barang.
            </p>
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
                  <span>Simpan Pesanan Pembelian</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
