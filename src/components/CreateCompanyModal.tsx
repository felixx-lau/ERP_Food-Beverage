"use client";

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
  const [cloneMode, setCloneMode] = useState<"clean" | "sample">("clean");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-[#174A3A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#C6A15B] flex items-center justify-center text-slate-900 shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Tambah Perusahaan Baru</h2>
              <p className="text-xs text-[#DCE8DF]">
                Multi-Company Workspace · Database Mandiri & Terpisah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Nama Resmi Perusahaan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!brand) setBrand(e.target.value);
              }}
              placeholder="Contoh: PT Kopi Bahagia Nusantara"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#174A3A]/20 focus:border-[#174A3A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Nama Merek / Brand Usaha
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Contoh: Kopi Bahagia"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#174A3A]/20 focus:border-[#174A3A]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Kota Operasional
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Contoh: Jakarta / Bandung"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#174A3A]/20 focus:border-[#174A3A]"
              />
            </div>
          </div>

          {/* Mode Inisialisasi */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700 block">
              Pilihan Inisialisasi Database:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setCloneMode("clean")}
                className={`cursor-pointer p-3 rounded-xl border-2 transition-all ${
                  cloneMode === "clean"
                    ? "border-[#174A3A] bg-[#E1EDE6]/30 text-[#174A3A]"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-[#C6A15B]" />
                    <span className="text-xs font-bold">Mulai dari Nol</span>
                  </div>
                  {cloneMode === "clean" && <Check className="w-4 h-4 text-[#174A3A]" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Database bersih (0 Produk, 0 Mitra, 0 Order). Anda bebas input katalog sendiri dari awal.
                </p>
              </div>

              <div
                onClick={() => setCloneMode("sample")}
                className={`cursor-pointer p-3 rounded-xl border-2 transition-all ${
                  cloneMode === "sample"
                    ? "border-[#174A3A] bg-[#E1EDE6]/30 text-[#174A3A]"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <Database className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold">Salin Data Contoh</span>
                  </div>
                  {cloneMode === "sample" && <Check className="w-4 h-4 text-[#174A3A]" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Menyalin data produk dan transaksi demo agar Anda punya contoh referensi.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
            💡 <strong>Database Asli Tetap Aman:</strong> Perusahaan baru akan memiliki file database SQLite terpisah. Data perusahaan default (<em>PT Rasa Aruna Bersama</em>) beserta seluruh pengujian rubriknya <strong>tidak akan terhapus atau tertimpa</strong>. Anda dapat beralih antar-perusahaan kapan pun.
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-[#174A3A] hover:bg-[#11382C] rounded-xl shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Menyiapkan Ruang Kerja...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Buat & Beralih ke Perusahaan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
