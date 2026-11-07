"use client";
import DialogFrame from "./ui/DialogFrame";

import React, { useState, useEffect } from "react";
import { Settings, X, Check, AlertCircle, Building2 } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditCompanyModal({ isOpen, onClose }: EditCompanyModalProps) {
  const { activeCompany, updateCompany } = useCompany();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (activeCompany) {
      setName(activeCompany.name || "");
      setBrand(activeCompany.brand || "");
      setCity(activeCompany.city || "");
      setDescription(activeCompany.description || "");
      setAddress(activeCompany.address || "");
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [activeCompany, isOpen]);

  if (!isOpen || !activeCompany) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama Perusahaan tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await updateCompany({
        name: name.trim(),
        brand: brand.trim() || name.trim(),
        city: city.trim(),
        description: description.trim(),
        address: address.trim(),
      });
      setSuccessMsg("Pengaturan perusahaan berhasil disimpan!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memperbarui data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogFrame onClose={onClose}>
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shadow-md">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Pengaturan Profil Perusahaan</h2>
              <p className="text-xs text-blue-100/90">
                Identitas Entitas Usaha: {activeCompany.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="editcompanymodal-field-0" className="text-xs font-semibold text-slate-700">
              Nama Resmi Perusahaan <span className="text-rose-500">*</span>
            </label>
            <input id="editcompanymodal-field-0"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="editcompanymodal-field-1" className="text-xs font-semibold text-slate-700">
                Nama Brand / Merek
              </label>
              <input id="editcompanymodal-field-1"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="editcompanymodal-field-2" className="text-xs font-semibold text-slate-700">
                Kota Operasional
              </label>
              <input id="editcompanymodal-field-2"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="editcompanymodal-field-3" className="text-xs font-semibold text-slate-700">
              Alamat Kantor / Outlet
            </label>
            <input id="editcompanymodal-field-3"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Jl. Sudirman No. 12, Jakarta Pusat"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="editcompanymodal-field-4" className="text-xs font-semibold text-slate-700">
              Deskripsi Singkat Usaha
            </label>
            <textarea id="editcompanymodal-field-4"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
            aria-label="Tutup dialog"
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e3a8a] rounded-xl shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>
          </div>
        </form>
      </div>
    </DialogFrame>
  );
}
