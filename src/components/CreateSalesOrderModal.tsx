"use client";
import ActionButton from "./ui/ActionButton";
import DialogFrame from "./ui/DialogFrame";
import {publishDataRefresh} from "./ui/useDataRefresh";
import { productChoiceLabel, resolveProductChoice } from "@/lib/productChoice";

import React, { useState, useEffect, useMemo, useRef, useId } from "react";
import { ShoppingCart, Plus, X, Check, AlertCircle, Sparkles } from "lucide-react";

interface OrderLineItem {
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

interface CreateSalesOrderModalProps {
  isOpen: boolean;
  leadId?: string;
  initialCustomerId?: string;
  onClose: () => void;
  onOrderCreated: (newOrder?: any) => void;
}

export default function CreateSalesOrderModal({
  isOpen,
  leadId,
  initialCustomerId,
  onClose,
  onOrderCreated,
}: CreateSalesOrderModalProps) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [lines, setLines] = useState<OrderLineItem[]>([]);

  const formId = useId();
  const [catalogLoading, setCatalogLoading] = useState(false);
  const pending = useRef(false);
  const requestKey = useRef("");
  const [dirty, setDirty] = useState(false);
  const close = () => { if (!pending.current && (!dirty || window.confirm("Abaikan perubahan yang belum disimpan?"))) { setDirty(false); onClose(); } };
  useEffect(() => { if (!isOpen) return; const warn = (e: BeforeUnloadEvent) => { if(dirty){e.preventDefault();e.returnValue="";} }; window.addEventListener("beforeunload",warn); return ()=>window.removeEventListener("beforeunload",warn); },[isOpen,dirty]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setCatalogLoading(true); setErrorMsg(null); setSuccessMsg(null); setDirty(false); requestKey.current = "";
    setSelectedContactId(initialCustomerId || ""); setLines([{ productSku: "", productName: "", quantity: 1, unitPrice: 0, discountPercent: 0 }]);
    Promise.all(["/api/contacts?type=CUSTOMER", "/api/products"].map(async url => {
      const response = await fetch(url); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pilihan belum dapat dimuat.");
      return data;
    })).then(results => {
      if (!active) return;
      setContacts(results[0].contacts || []); setProducts(results[1].products || []);
    }).catch(error => { if (active) setErrorMsg(error instanceof Error ? error.message : "Pilihan belum dapat dimuat."); })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [isOpen, initialCustomerId]);

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
    setDirty(true); requestKey.current = "";
    setLines((prev) => [
      ...prev,
      {
        productSku: "",
        productName: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setDirty(true); requestKey.current = "";
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProductInput = (index: number, typedText: string) => {
    setLines((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index] };
      cur.productName = typedText;

      // Check if typed text matches an existing SKU or product Name
      const match = resolveProductChoice(products, typedText);
      if (match) {
        cur.productSku = match.sku;
        cur.productName = productChoiceLabel(match);
        cur.unitPrice = match.salesPrice;
      } else {
        cur.productSku = "";
        cur.unitPrice = 0;
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
    if (pending.current) return;
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
      if (!l.productSku) {
        setErrorMsg("Pilih produk dan varian dari saran pada setiap baris.");
        return;
      }
    }

    pending.current = true;
    requestKey.current ||= crypto.randomUUID();
    setLoading(true);

    try {
      const res = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey.current },
        body: JSON.stringify({
          contactId: selectedContactId,
          leadId,
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
        if (res.status < 500 && res.status !== 409) requestKey.current = "";
        setErrorMsg(data.error || "Gagal membuat Sales Order.");
        return;
      }

      setSuccessMsg(
        `Pesanan ${data.order.orderNumber} berhasil dibuat dengan status ${data.order.status}!`
      );

      setDirty(false); requestKey.current = "";
      publishDataRefresh();
      onOrderCreated(data.order);
      onClose();
      setLines([]);
      setSuccessMsg(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || "Terjadi kesalahan.");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return (
    <DialogFrame onClose={close}>
      <div className="glass-modal w-full max-w-2xl rounded-3xl shadow-glass-modal border border-white/80 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-white/40 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Buat Pesanan Penjualan (Sales Order)</h2>
              <p className="text-xs text-slate-600 font-medium">
                Pilih SKU menu, kuantitas, dan harga sesuai pesanan
              </p>
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Tutup dialog"
            className="p-1.5 rounded-full hover:bg-white/80 text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onChange={()=>{setDirty(true);requestKey.current="";}} onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <fieldset disabled={loading} className="contents">
          {catalogLoading && <p role="status" className="text-sm text-slate-600">Memuat pelanggan/vendor dan produk…</p>}
          {errorMsg && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-900 font-bold">
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
            <label htmlFor={`${formId}-party`} className="block text-xs font-bold text-slate-800 mb-1">
              Pelanggan / Pemesan <span className="text-rose-500">*</span>
            </label>
            <select id={`${formId}-party`}
              required disabled={catalogLoading}
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 input-glass rounded-xl font-semibold text-slate-900"
            >
              <option value="">Pilih pelanggan…</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <label className="text-xs font-semibold text-[#0f172a]">Item Menu & Pesanan</label>
                <p className="text-xs text-slate-600">
                  Cari nama atau SKU, lalu pilih varian yang sesuai dari saran.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-sm font-semibold text-blue-700 flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Baris</span>
              </button>
            </div>

            {/* Datalist for Product Autocomplete Suggestions */}
            <datalist id={`${formId}-products`}>
              {products.map((p) => (
                <option key={p.sku} value={productChoiceLabel(p)}>
                  {p.sku} — Rp {p.salesPrice?.toLocaleString("id-ID")}
                </option>
              ))}
            </datalist>

            <div className="space-y-2.5">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#f1f5f9] border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
                  <div className="sm:col-span-4">
                    <label htmlFor={`${formId}-product-${idx}`} className="block text-xs font-semibold text-slate-600 mb-0.5">
                      Nama Produk / Menu <span className="text-rose-500">*</span>
                    </label>
                    <input id={`${formId}-product-${idx}`}
                      type="text"
                      required
                      list={`${formId}-products`}
                      placeholder="Cari nama, SKU, atau pilih varian…"
                      value={line.productName}
                      onChange={(e) => handleProductInput(idx, e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-[#1d4ed8]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor={`${formId}-quantity-${idx}`} className="block text-xs font-semibold text-slate-600 mb-0.5">
                      Kuantitas
                    </label>
                    <input id={`${formId}-quantity-${idx}`}
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => handleLineChange(idx, "quantity", e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono focus:ring-1 focus:ring-[#1d4ed8]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor={`${formId}-price-${idx}`} className="block text-xs font-semibold text-slate-600 mb-0.5">
                      Harga Satuan (Rp)
                    </label>
                    <input id={`${formId}-price-${idx}`}
                      type="number"
                      min={0}
                      step={1}
                      value={line.unitPrice}
                      onChange={(e) => handleLineChange(idx, "unitPrice", e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono focus:ring-1 focus:ring-[#1d4ed8]"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label htmlFor={`${formId}-discount-${idx}`} className="block text-xs font-semibold text-slate-600 mb-0.5">
                      Diskon %
                    </label>
                    <input id={`${formId}-discount-${idx}`}
                      type="number"
                      min={0}
                      max={20}
                      value={line.discountPercent}
                      onChange={(e) => handleLineChange(idx, "discountPercent", e.target.value)}
                      className="w-full text-xs px-1.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono text-center"
                      title="Maksimal 20%"
                    />
                  </div>

                  <div className="sm:col-span-2 flex justify-end">
                    <ActionButton action="delete" disabled={lines.length <= 1} onClick={() => handleRemoveLine(idx)}>Hapus</ActionButton>
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
              <span className="font-mono font-bold text-slate-900">Rp {calculations.subtotalNet.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-semibold">
              <span>Pajak Restoran PBJT (10%)</span>
              <span className="font-mono font-bold text-slate-900">Rp {calculations.pbjtTax.toLocaleString("id-ID")}</span>
            </div>
            <div className="border-t border-black/10 pt-2 flex justify-between font-bold text-sm text-slate-900">
              <span>Total Tagihan Pesanan</span>
              <span className="font-mono text-[#1d4ed8] font-bold text-base">Rp {calculations.totalGross.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end space-x-2 border-t border-black/5">
            <button
              type="button"
              onClick={close}
            aria-label="Tutup dialog"
              className="px-4 py-2 text-xs font-bold btn-glass-secondary rounded-xl hover:-translate-y-0.5 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || catalogLoading || !selectedContactId || lines.some(line => !line.productSku)}
              className="px-5 py-2.5 text-xs font-bold btn-glass-primary rounded-xl shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex items-center space-x-1.5"
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
          </fieldset>
        </form>
      </div>
    </DialogFrame>
  );
}
