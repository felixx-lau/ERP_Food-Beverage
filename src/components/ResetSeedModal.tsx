"use client";
import DialogFrame from "./ui/DialogFrame";

import React, { useState } from "react";
import { AlertTriangle, RotateCcw, X, CheckCircle, ShieldAlert } from "lucide-react";

interface ResetSeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: string;
  userRole?: string;
  onSuccess: () => void;
}

export default function ResetSeedModal({
  isOpen,
  onClose,
  currentUserRole,
  userRole,
  onSuccess,
}: ResetSeedModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const role = currentUserRole || userRole;
  const isOwner = role === "OWNER";

  const handleConfirmReset = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/seed/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmReset: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mereset seed database.");
        return;
      }

      setSuccessMsg(data.message || "Baseline Seed berhasil dipulihkan.");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogFrame onClose={onClose}>
      <div className="glass-modal w-full max-w-lg rounded-3xl shadow-glass-modal overflow-hidden border border-white/80 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-rose-500/15 border-b border-rose-500/25 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0" />
            <h3 className="font-black text-base">Konfirmasi Reset Baseline Seed</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-1 rounded-full text-slate-600 hover:text-slate-900 hover:bg-white/80 transition-colors shadow-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {!isOwner && (
            <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-950 flex items-start space-x-2.5 backdrop-blur-xs">
              <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-black">Peringatan Akses Otoritas (SR-15):</span>
                <p className="mt-0.5 font-semibold">
                  Role aktif Anda adalah <strong>{currentUserRole}</strong>. Hanya role <strong>OWNER (Maya Prasetyo)</strong> yang diizinkan mereset database. Percobaan reset dari akun ini akan ditolak dan dicatat di Audit Log.
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-slate-800 font-semibold leading-relaxed">
            Tindakan ini akan mengembalikan seluruh database ke kondisi <strong className="text-slate-900 font-black">Baseline Seed awal</strong> sesuai spesifikasi tugas PDF:
          </p>

          <div className="glass-3 border border-white/80 rounded-2xl p-4 text-xs space-y-2 font-mono text-slate-900 shadow-xs">
            <div className="flex justify-between">
              <span className="text-slate-700 font-semibold">• Total Persediaan:</span>
              <span className="font-bold text-[#1d4ed8]">616 Unit (WH: 410, CAFE: 206)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-semibold">• Valuasi Persediaan:</span>
              <span className="font-bold text-[#1d4ed8]">Rp 12.214.000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-semibold">• Saldo Bank Awal:</span>
              <span className="font-bold">Rp 20.000.000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-semibold">• Jurnal Pembuka Seimbang:</span>
              <span className="font-bold text-emerald-800">Dr = Cr = Rp 33.714.000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-semibold">• Dokumen Bawaan:</span>
              <span className="font-bold">LD0003, S00006 (Res 6), P00006</span>
            </div>
          </div>

          <p className="text-xs text-rose-700 font-bold">
            ⚠️ Seluruh transaksi uji coba yang telah dibuat akan dihapus dan tidak dapat dikembalikan.
          </p>

          {error && (
            <div className="bg-rose-500/15 border border-rose-500/30 text-rose-900 text-xs p-3 rounded-xl font-bold">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 text-xs p-3 rounded-xl font-bold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-700" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="bg-white/40 px-6 py-4 border-t border-black/5 flex justify-end space-x-3">
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            disabled={loading}
            className="px-4 py-2 text-xs font-black btn-glass-secondary rounded-xl hover:-translate-y-0.5 transition-all"
          >
            Batal
          </button>
          <button
            onClick={handleConfirmReset}
            disabled={loading || !isOwner}
            className={`px-4 py-2 text-xs font-black text-white rounded-xl flex items-center space-x-1.5 shadow-md transition-all duration-200 ${
              isOwner
                ? "bg-rose-600 hover:bg-rose-700 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                : "bg-slate-400 cursor-not-allowed opacity-50"
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Memproses Reset..." : "Konfirmasi Reset Database"}</span>
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}
