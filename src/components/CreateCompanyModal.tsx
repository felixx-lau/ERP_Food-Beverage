"use client";
import DialogFrame from "./ui/DialogFrame";

import React, { useState } from "react";
import { Building2, X, Plus, Sparkles, Check, Database, AlertCircle } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export default function CreateCompanyModal({
  isOpen,
  onClose,
  currentUser,
}: CreateCompanyModalProps) {
  const { createCompany } = useCompany();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [city, setCity] = useState("Jakarta");
  const [description, setDescription] = useState("");
  const [cloneMode, setCloneMode] = useState<"clean" | "sample">("sample");
  const [adminName, setAdminName] = useState(currentUser?.name || "Pemilik Usaha");
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || "owner@perusahaanbaru.com");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama Perusahaan wajib diisi.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await createCompany({
        name: name.trim(),
        brand: brand.trim() || name.trim(),
        city: city.trim(),
        description: description.trim() || `Entitas ERP Mandiri: ${name.trim()}`,
        cloneMode,
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat perusahaan.");
      setLoading(false);
    }
  };

  return (
    <DialogFrame onClose={onClose}>
      <div className="relative w-full max-w-lg glass-modal rounded-3xl shadow-2xl border border-white/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white flex items-center justify-between border-b border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-md border border-white/40 shrink-0">
              <Building2 className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide text-white">Tambah Perusahaan Baru</h2>
              <p className="text-xs text-blue-100/90 font-medium">
                Multi-Company Workspace · Database Mandiri & Terpisah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-bold shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="createcompanymodal-field-0" className="text-xs font-bold text-slate-800 block">
              Nama Resmi Perusahaan <span className="text-rose-600">*</span>
            </label>
            <input id="createcompanymodal-field-0"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!brand) setBrand(e.target.value);
              }}
              placeholder="Contoh: PT Kopi Bahagia Nusantara"
              className="w-full px-4 py-2.5 text-xs font-semibold text-slate-900 rounded-xl bg-white/80 border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] focus:bg-white transition-all shadow-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="createcompanymodal-field-1" className="text-xs font-bold text-slate-800 block">
                Nama Merek / Brand Usaha
              </label>
              <input id="createcompanymodal-field-1"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Contoh: Kopi Bahagia"
                className="w-full px-4 py-2.5 text-xs font-semibold text-slate-900 rounded-xl bg-white/80 border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] focus:bg-white transition-all shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="createcompanymodal-field-2" className="text-xs font-bold text-slate-800 block">
                Kota Operasional
              </label>
              <input id="createcompanymodal-field-2"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Contoh: Jakarta / Bandung"
                className="w-full px-4 py-2.5 text-xs font-semibold text-slate-900 rounded-xl bg-white/80 border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8] focus:border-[#1d4ed8] focus:bg-white transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Mode Inisialisasi */}
          <div className="space-y-2 pt-2 border-t border-black/5">
            <label className="text-xs font-bold text-slate-800 block">
              Pilihan Inisialisasi Database:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setCloneMode("sample")}
                className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all shadow-xs ${
                  cloneMode === "sample"
                    ? "border-[#1d4ed8] bg-[#1d4ed8]/10 text-[#1d4ed8]"
                    : "border-slate-200 hover:border-slate-300 bg-white/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <Database className="w-4 h-4 text-[#7c3aed]" />
                    <span className="text-xs font-bold text-slate-900">Salin Data Contoh (Rekomendasi)</span>
                  </div>
                  {cloneMode === "sample" && <Check className="w-4 h-4 text-[#1d4ed8] stroke-[3]" />}
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-tight mt-1">
                  Menyalin 15 produk F&B dan data demo siap pakai agar Anda langsung bisa mendemokan POS, pesanan, dan grafik.
                </p>
              </div>

              <div
                onClick={() => setCloneMode("clean")}
                className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all shadow-xs ${
                  cloneMode === "clean"
                    ? "border-[#1d4ed8] bg-[#1d4ed8]/10 text-[#1d4ed8]"
                    : "border-slate-200 hover:border-slate-300 bg-white/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                    <span className="text-xs font-bold text-slate-900">Mulai dari Nol (Bersih)</span>
                  </div>
                  {cloneMode === "clean" && <Check className="w-4 h-4 text-[#1d4ed8] stroke-[3]" />}
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-tight mt-1">
                  Database kosong (0 Produk, 0 Mitra, 0 Order). Anda bebas mendaftarkan katalog dan produk sendiri dari awal.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-950 font-bold leading-relaxed shadow-xs">
            💡 <strong>Multi-Company Aman:</strong> Perusahaan baru memiliki database SQLite mandiri. Data perusahaan utama (<em>PT Rasa Aruna Bersama</em>) beserta seluruh tes otomatis <strong>tidak akan terganggu atau tertimpa</strong>. Anda dapat beralih antar-perusahaan kapan pun lewat tombol di atas.
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-2.5 border-t border-black/5">
            <button
              type="button"
              onClick={onClose}
            aria-label="Tutup dialog"
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-primary px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Menyiapkan Ruang Kerja...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Buat & Beralih ke Perusahaan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DialogFrame>
  );
}
