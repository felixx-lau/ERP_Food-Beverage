"use client";

import React, { useState } from "react";
import { UserPlus, X, Check, Building2, User, CreditCard, MapPin } from "lucide-react";

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactCreated: (newContact?: any) => void;
  defaultType?: "CUSTOMER" | "VENDOR";
}

export default function CreateContactModal({
  isOpen,
  onClose,
  onContactCreated,
  defaultType = "CUSTOMER",
}: CreateContactModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"CUSTOMER" | "VENDOR">(defaultType);
  const [customerType, setCustomerType] = useState<"COMPANY" | "INDIVIDUAL">("COMPANY");
  const [city, setCity] = useState("Jakarta");
  const [creditLimit, setCreditLimit] = useState<number | "">("");
  const [paymentTerms, setPaymentTerms] = useState<string>("IMMEDIATE");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          customerType: type === "CUSTOMER" ? customerType : undefined,
          city,
          creditLimit: creditLimit === "" ? 0 : Number(creditLimit),
          paymentTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || data.error === "Unauthorized") {
          setErrorMsg("Sesi login Anda tidak aktif atau telah berakhir. Silakan login kembali.");
        } else {
          setErrorMsg(data.error || "Gagal membuat kontak.");
        }
        return;
      }

      setSuccessMsg(`Kontak "${data.contact.name}" (${data.contact.id}) berhasil ditambahkan!`);
      setTimeout(() => {
        onContactCreated(data.contact);
        onClose();
        // Reset form
        setName("");
        setCreditLimit("");
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
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E9E4] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Tambah {type === "CUSTOMER" ? "Pelanggan" : "Vendor / Pemasok"}
              </h2>
              <p className="text-xs text-blue-100">
                Pendaftaran data mitra bisnis PT Rasa Aruna Bersama
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

          {/* Tipe Kontak */}
          <div>
            <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Jenis Mitra</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("CUSTOMER")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                  type === "CUSTOMER"
                    ? "border-[#1d4ed8] bg-[#1d4ed8]/10 text-[#1d4ed8] shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Pelanggan (Customer)</span>
              </button>
              <button
                type="button"
                onClick={() => setType("VENDOR")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                  type === "VENDOR"
                    ? "border-[#1d4ed8] bg-[#1d4ed8]/10 text-[#1d4ed8] shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Pemasok (Vendor)</span>
              </button>
            </div>
          </div>

          {/* Nama */}
          <div>
            <label className="block text-xs font-semibold text-[#0f172a] mb-1">
              Nama {type === "CUSTOMER" ? "Pelanggan / Usaha" : "Vendor / Supplier"} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={type === "CUSTOMER" ? "Contoh: PT Katering Sukses / Budi Santoso" : "Contoh: CV Bahan Pangan Segar"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
            />
          </div>

          {type === "CUSTOMER" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Kategori Pelanggan</label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value as any)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
                >
                  <option value="COMPANY">Badan Usaha / Perusahaan</option>
                  <option value="INDIVIDUAL">Individu / Perorangan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">Syarat Pembayaran</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
                >
                  <option value="IMMEDIATE">Langsung / Tunai (Immediate)</option>
                  <option value="NET7">Tempo 7 Hari (NET 7)</option>
                  <option value="NET14">Tempo 14 Hari (NET 14)</option>
                  <option value="NET30">Tempo 30 Hari (NET 30)</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0f172a] mb-1">Kota / Domisili</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Jakarta Selatan"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
                />
              </div>
            </div>

            {type === "CUSTOMER" && (
              <div>
                <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                  Limit Kredit Piutang (Rp)
                </label>
                <div className="relative">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    placeholder="0 (Tanpa Kredit)"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full text-xs pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-[#1d4ed8] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
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
              className="px-5 py-2 text-xs font-bold bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan {type === "CUSTOMER" ? "Pelanggan" : "Vendor"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
