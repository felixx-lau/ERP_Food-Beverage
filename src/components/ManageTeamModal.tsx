"use client";
import DialogFrame from "./ui/DialogFrame";

import React, { useState, useEffect } from "react";
import { Users2, UserPlus, X, Check, Shield, Building2, Sparkles, RefreshCw } from "lucide-react";

interface ManageTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onUserChanged?: () => void;
}

const AVAILABLE_ROLES = [
  { role: "OWNER", label: "Owner (Pemilik - Full Access)", color: "bg-purple-100 text-purple-800" },
  { role: "SALES", label: "Sales (Penjualan & CRM)", color: "bg-blue-100 text-blue-800" },
  { role: "WAREHOUSE", label: "Warehouse (Gudang & Stok)", color: "bg-amber-100 text-amber-800" },
  { role: "PROCUREMENT", label: "Procurement (Pengadaan PO)", color: "bg-orange-100 text-orange-800" },
  { role: "FINANCE", label: "Finance (Keuangan & Akuntansi)", color: "bg-emerald-100 text-emerald-800" },
  { role: "CASHIER", label: "Cashier (Kasir POS Gerai)", color: "bg-cyan-100 text-cyan-800" },
];

export default function ManageTeamModal({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
}: ManageTeamModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("SALES");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch(editing ? `/api/users/${editing.id}` : "/api/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password, active, sessionVersion: editing?.sessionVersion }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal menambahkan anggota.");
        return;
      }

      setSuccessMsg(`Akun ${name} berhasil disimpan.`);
      setEditing(null);
      setName("");
      setEmail("");
      setPassword("");
      fetchUsers();
      if (onUserChanged) onUserChanged();
      setTimeout(() => setActiveTab("list"), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogFrame onClose={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#E5E9E4] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold shadow-xs">
              <Users2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide">Kelola Tim & Anggota Kelompok</h2>
              <p className="text-xs text-blue-100/90">
                PT Rasa Aruna Bersama · Skenario ERP F&B Group 03
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-1.5 rounded-lg text-blue-100/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader / Tabs */}
        <div className="px-6 pt-3 border-b border-[#E5E9E4] bg-[#f1f5f9] flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("list")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "list"
                  ? "border-[#1d4ed8] text-[#1d4ed8]"
                  : "border-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              Daftar Anggota ({users.length})
            </button>
            <button
              onClick={() => {setEditing(null);setName("");setEmail("");setPassword("");setActive(true);setRole("SALES");setActiveTab("create");}}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center space-x-1.5 transition-all ${
                activeTab === "create"
                  ? "border-[#1d4ed8] text-[#1d4ed8]"
                  : "border-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Tambah Anggota</span>
            </button>
          </div>
          <button
            onClick={fetchUsers}
            className="text-xs text-[#64748b] hover:text-[#1d4ed8] flex items-center space-x-1 mb-2"
            title="Refresh data anggota"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === "list" ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#f1f5f9] rounded-xl border border-[#E5E9E4] text-xs text-[#64748b] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#0f172a]">Perusahaan:</span> Perusahaan aktif
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {users.filter(u=>u.active).length} Akun Aktif
                </div>
              </div>

              <div className="divide-y divide-[#E5E9E4] border border-[#E5E9E4] rounded-xl overflow-hidden">
                {users.map((u) => {
                  const roleObj = AVAILABLE_ROLES.find((r) => r.role === u.role);
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 flex items-center justify-between hover:bg-[#f1f5f9] transition-colors ${
                        isCurrent ? "bg-amber-50/50" : ""
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#1d4ed8] text-[#7c3aed] font-bold text-sm flex items-center justify-center shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-[#0f172a] truncate">
                              {u.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-600 text-white rounded">
                                Anda Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#64748b] truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button type="button" className="btn-secondary" onClick={()=>{setEditing(u);setName(u.name);setEmail(u.email);setRole(u.role);setPassword("");setActive(u.active);setActiveTab("create");}}>Edit{!u.active ? " (nonaktif)" : ""}</button>
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${
                            roleObj?.color || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
                Kelola akses anggota tim. Perubahan role, password, atau status akun mencabut sesi login lama.
              </div>

              <div>
                <label htmlFor="manageteammodal-field-0" className="block text-xs font-bold text-[#0f172a] mb-1">
                  Nama Lengkap Anggota Kelompok <span className="text-rose-500">*</span>
                </label>
                <input id="manageteammodal-field-0"
                  type="text"
                  required
                  placeholder="Contoh: Felix Lau"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="manageteammodal-field-1" className="block text-xs font-bold text-[#0f172a] mb-1">
                    Email Akun <span className="text-rose-500">*</span>
                  </label>
                  <input id="manageteammodal-field-1"
                    type="email"
                    required
                    placeholder="Contoh: felix@rasaaruna.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8]"
                  />
                </div>
                <div>
                  <label htmlFor="manageteammodal-field-2" className="block text-xs font-bold text-[#0f172a] mb-1">
                    Password {editing ? "(kosongkan jika tetap)" : "baru, minimal 10 karakter"}
                  </label>
                  <input id="manageteammodal-field-2"
                    type="password"
                    required={!editing}
                    minLength={10}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="manageteammodal-field-3" className="block text-xs font-bold text-[#0f172a] mb-1">
                  Pilih Role / Tanggung Jawab (Sesuai PDF Matriks Wewenang) <span className="text-rose-500">*</span>
                </label>
                <select id="manageteammodal-field-3"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1d4ed8] bg-white font-medium"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {editing && <label className="flex gap-2 text-sm"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>Akun aktif</label>}
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2 text-xs font-medium text-[#64748b] hover:text-[#0f172a] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white rounded-lg shadow-xs transition-all flex items-center space-x-1.5"
                >
                  {submitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Simpan Akun</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#f1f5f9] border-t border-[#E5E9E4] flex items-center justify-between text-[11px] text-[#64748b]">
          <span>Akses dikelola Owner</span>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            className="px-3 py-1 rounded bg-white border border-[#CBD5E1] text-[#0f172a] font-medium hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}
