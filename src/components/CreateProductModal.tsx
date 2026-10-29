"use client";

import React, { useState, useEffect } from "react";
import { Package, X, Check, Building, Plus } from "lucide-react";

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
}

export default function CreateProductModal({
  isOpen,
  onClose,
  onProductCreated,
}: CreateProductModalProps) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [skuTouched, setSkuTouched] = useState(false);
  const [size, setSize] = useState("Regular");
  const [color, setColor] = useState("Original");
  const [unit, setUnit] = useState("porsi");
  const [salesPrice, setSalesPrice] = useState<number | "">("");
  const [standardCost, setStandardCost] = useState<number | "">("");
  const [initialWhStock, setInitialWhStock] = useState<number>(10);
  const [initialCafeStock, setInitialCafeStock] = useState<number>(5);
  const [defaultVendorId, setDefaultVendorId] = useState("V01");
  const [vendors, setVendors] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!skuTouched) {
      const generated = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 18);
      setSku(generated);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetch("/api/contacts?type=VENDOR")
        .then((r) => r.json())
        .then((d) => {
          if (d.contacts && d.contacts.length > 0) {
            setVendors(d.contacts);
            setDefaultVendorId(d.contacts[0].id);
          } else {
            setVendors([
              { id: "V01", name: "PT Segar Pangan Nusantara" },
              { id: "V02", name: "CV Beras Makmur" },
              { id: "V03", name: "PT Unggas Jaya Abadi" },
            ]);
          }
        })
        .catch(() => {
          setVendors([
            { id: "V01", name: "PT Segar Pangan Nusantara" },
            { id: "V02", name: "CV Beras Makmur" },
            { id: "V03", name: "PT Unggas Jaya Abadi" },
          ]);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          name,
          size,
          color,
          unit,
          salesPrice: Number(salesPrice),
          standardCost: Number(standardCost),
          initialWhStock: Number(initialWhStock),
          initialCafeStock: Number(initialCafeStock),
          defaultVendorId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal membuat produk.");
        return;
      }

      setSuccessMsg(`Produk ${sku} (${name}) berhasil ditambahkan!`);
      setTimeout(() => {
        onProductCreated();
        onClose();
        // Reset state
        setSku("");
        setName("");
        setSkuTouched(false);
        setSalesPrice("");
        setStandardCost("");
        setSuccessMsg(null);
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-[#E5E9E4] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#174A3A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              <Package className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Tambah Produk / Menu Baru</h2>
              <p className="text-xs text-emerald-100">
                Katalog master barang Rasa Aruna Kitchen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#202824] mb-1">
                Nama Produk / Menu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Matcha Latte Hangat"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">Ketik nama produk yang ingin dijual</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#202824]">
                  Kode SKU <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                  {skuTouched ? "Kustom" : "Otomatis dari Nama"}
                </span>
              </div>
              <input
                type="text"
                required
                placeholder="Contoh: MATCHA-LATTE"
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value.toUpperCase());
                  setSkuTouched(true);
                }}
                className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl uppercase focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">Terisi otomatis, atau Anda dapat menggantinya</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#202824] mb-1">Ukuran / Porsi</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Regular, Large"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202824] mb-1">Varian Rasa / Tipe</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Original, Hot, Ice"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202824] mb-1">Satuan</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="porsi, cup, pcs"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-[#202824] mb-1">
                Harga Jual Konsumen (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                placeholder="Contoh: 28000"
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">Harga sebelum pajak resto PBJT 10%</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202824] mb-1">
                Harga Pokok / HPP (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                placeholder="Contoh: 15000"
                value={standardCost}
                onChange={(e) => setStandardCost(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">Nilai modal barang untuk valuasi persediaan</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#F7F8F5] rounded-xl border border-[#E5E9E4] space-y-2">
            <span className="text-xs font-semibold text-[#202824]">Stok Awal Alokasi:</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#758078] mb-0.5">
                  WH-JKT (Gudang Pusat)
                </label>
                <input
                  type="number"
                  min={0}
                  value={initialWhStock}
                  onChange={(e) => setInitialWhStock(parseInt(e.target.value) || 0)}
                  className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#758078] mb-0.5">
                  CAFE-JKT (Gerai Kasir)
                </label>
                <input
                  type="number"
                  min={0}
                  value={initialCafeStock}
                  onChange={(e) => setInitialCafeStock(parseInt(e.target.value) || 0)}
                  className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202824] mb-1">
              Vendor Pemasok Utama
            </label>
            <select
              value={defaultVendorId}
              onChange={(e) => setDefaultVendorId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-[#174A3A] hover:bg-[#134032] active:bg-[#0f3328] text-white rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Simpan Produk</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
