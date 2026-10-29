"use client";

import React, { useState, useEffect } from "react";
import { Users2, X, Check, DollarSign, Building } from "lucide-react";

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: (newLead?: any) => void;
}

export default function CreateLeadModal({
  isOpen,
  onClose,
  onLeadCreated,
}: CreateLeadModalProps) {
  const [name, setName] = useState("");
  const [contactId, setContactId] = useState("");
  const [expectedRevenue, setExpectedRevenue] = useState<number | "">("");
  const [stage, setStage] = useState("NEW");
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch customers
      fetch("/api/contacts?type=CUSTOMER")
        .then((res) => res.json())
        .then((data) => {
          const list = data.contacts || [];
          setContacts(list);
          if (list.length > 0 && !contactId) {
            setContactId(list[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactId: contactId || undefined,
          expectedRevenue: expectedRevenue === "" ? 0 : Number(expectedRevenue),
          stage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal membuat lead.");
        return;
      }

      setSuccessMsg(`Peluang CRM "${data.lead.name}" (${data.lead.id}) berhasil dibuat!`);
      setTimeout(() => {
        onLeadCreated(data.lead);
        onClose();
        setName("");
        setExpectedRevenue("");
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
        <div className="px-6 py-4 bg-[#174A3A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Users2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Tambah Peluang Penjualan (Lead)</h2>
              <p className="text-xs text-emerald-100">
                Pencatatan prospek pelanggan Rasa Aruna
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

          <div>
            <label className="block text-xs font-semibold text-[#202824] mb-1">
              Nama Peluang / Prospek <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Katering Makan Siang Harian 40 Porsi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202824] mb-1">
              Pelanggan Terkait <span className="text-rose-500">*</span>
            </label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#202824] mb-1">
                Estimasi Nilai Prospek (Rp)
              </label>
              <div className="relative">
                <span className="text-xs font-semibold text-slate-400 absolute left-3.5 top-2.5">Rp</span>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  placeholder="Contoh: 1500000"
                  value={expectedRevenue}
                  onChange={(e) => setExpectedRevenue(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202824] mb-1">
                Tahap Penjualan (Stage)
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
              >
                <option value="NEW">New Lead (Baru)</option>
                <option value="QUALIFIED">Qualified (Terkualifikasi)</option>
                <option value="PROPOSITION">Proposition (Penawaran)</option>
                <option value="WON">Won / Deal (Berhasil)</option>
              </select>
            </div>
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
              className="px-5 py-2 text-xs font-bold bg-[#174A3A] hover:bg-[#134032] active:bg-[#0f3328] text-white rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Lead</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
