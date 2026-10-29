"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Users2,
  CheckCircle2,
} from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    role: "OWNER",
    name: "Maya Prasetyo",
    email: "owner@rasaaruna.com",
    label: "👑 Owner (Akses Penuh)",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    role: "SALES",
    name: "Dini Anggraini",
    email: "sales@rasaaruna.com",
    label: "💼 Sales & CRM",
    color: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    role: "CASHIER",
    name: "Bagas Putra",
    email: "cashier@rasaaruna.com",
    label: "🏪 Kasir POS",
    color: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    role: "WAREHOUSE",
    name: "Sinta Maharani",
    email: "warehouse@rasaaruna.com",
    label: "📦 Gudang & Logistik",
    color: "bg-teal-50 text-teal-800 border-teal-200",
  },
  {
    role: "PROCUREMENT",
    name: "Arief Wicaksono",
    email: "procurement@rasaaruna.com",
    label: "🛍️ Pengadaan (PO)",
    color: "bg-purple-50 text-purple-800 border-purple-200",
  },
  {
    role: "FINANCE",
    name: "Reza Firdaus",
    email: "finance@rasaaruna.com",
    label: "💰 Keuangan & Faktur",
    color: "bg-rose-50 text-rose-800 border-rose-200",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@rasaaruna.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Email atau password salah.");
        return;
      }

      // Redirect based on role or home
      if (data.user?.role === "CASHIER") {
        router.push("/pos");
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || "Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword("password123");
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] flex flex-col justify-center items-center px-4 py-8">
      {/* Container */}
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#174A3A] text-[#C6A15B] font-extrabold text-2xl shadow-md border border-[#11382C]">
            RA
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              PT Rasa Aruna Bersama
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Sistem ERP Terpadu Makanan & Minuman
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-200/80 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Masuk ke Akun Anda</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Silakan masukkan email dan password terdaftar
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="nama@rasaaruna.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#174A3A] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#174A3A] hover:bg-[#134032] active:bg-[#0f3328] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Memproses Masuk...</span>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Helper */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C6A15B]" />
                <span>Pilih Akun Cepat (Skenario Demo)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">pass: password123</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => selectDemoAccount(acc.email)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    email === acc.email
                      ? "ring-2 ring-[#174A3A] bg-[#F2F7F4] border-[#174A3A]"
                      : "bg-slate-50 border-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-[11px] font-bold text-slate-800 truncate">{acc.label}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{acc.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>© 2026 PT Rasa Aruna Bersama · F&B Enterprise ERP</p>
          <p className="text-[10px] text-slate-400">
            Akses aman terenkripsi JWT & role-based access control (RBAC)
          </p>
        </div>
      </div>
    </div>
  );
}
