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
    label: "Owner (Akses Penuh)",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    role: "SALES",
    name: "Dini Anggraini",
    email: "sales@rasaaruna.com",
    label: "Sales & CRM",
    color: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    role: "CASHIER",
    name: "Bagas Putra",
    email: "cashier@rasaaruna.com",
    label: "Kasir POS",
    color: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    role: "WAREHOUSE",
    name: "Sinta Maharani",
    email: "warehouse@rasaaruna.com",
    label: "Gudang & Logistik",
    color: "bg-teal-50 text-teal-800 border-teal-200",
  },
  {
    role: "PROCUREMENT",
    name: "Arief Wicaksono",
    email: "procurement@rasaaruna.com",
    label: "Pengadaan (PO)",
    color: "bg-purple-50 text-purple-800 border-purple-200",
  },
  {
    role: "FINANCE",
    name: "Reza Firdaus",
    email: "finance@rasaaruna.com",
    label: "Keuangan & Faktur",
    color: "bg-rose-50 text-rose-800 border-rose-200",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@rasaaruna.com");
  const [password, setPassword] = useState("Password123!");
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
    setPassword("Password123!");
    setErrorMsg(null);
  };

  return (
    <div className="login-layout min-h-screen grid lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between p-12 xl:p-20 bg-[#101b3b] text-white relative overflow-hidden">
        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-sm font-bold">RA</div><span className="font-semibold tracking-tight">Rasa Aruna<span className="text-indigo-300 font-normal"> / Workspace</span></span></div>
        <div className="max-w-lg py-16"><span className="text-xs tracking-[.15em] text-indigo-300 uppercase font-medium">F&B enterprise management</span><h2 className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.16] mt-5">Satu ruang kerja.<br /><span className="text-indigo-300">Seluruh bisnis Anda.</span></h2><p className="mt-6 text-base leading-relaxed text-slate-300">Dari dapur hingga laporan keuangan. Hubungkan tim, sederhanakan operasional, dan fokus pada pertumbuhan bisnis.</p><div className="mt-10 space-y-4">{["Penjualan & layanan pelanggan", "Persediaan & pengadaan", "Keuangan & laporan bisnis"].map(t => <div key={t} className="flex items-center gap-3 text-sm text-slate-200"><CheckCircle2 className="w-5 h-5 text-indigo-300" />{t}</div>)}</div></div>
        <p className="text-xs text-slate-400">PT Rasa Aruna Bersama · Enterprise ERP</p>
      </aside>
      <div className="flex items-center justify-center px-5 py-10 sm:px-10">
      {/* Container */}
      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in-up">
        {/* Brand Logo & Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white font-semibold text-xl shadow-md shadow-blue-500/20 border border-white/20 transform transition-transform hover:scale-105 duration-200">
            RA
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
              Selamat datang kembali
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Masuk untuk melanjutkan ke ruang kerja Anda.
            </p>
          </div>
        </div>

        {/* Login Card (Glass-2) */}
        <div className="space-y-6">
          <div>
            <h2 className="sr-only">Masuk ke Akun Anda</h2>
            <p className="sr-only">
              Silakan masukkan email dan password terdaftar
            </p>
          </div>

          {errorMsg && (
            <div role="alert" className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-900 font-bold flex items-center space-x-2 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="page-field-0" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input id="page-field-0"
                  autoComplete="username"
                  type="email"
                  required
                  placeholder="nama@rasaaruna.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 input-glass rounded-xl font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="page-field-1" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input id="page-field-1"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-10 py-2.5 input-glass rounded-xl font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-0.5 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 p-0.5 transition-colors focus-brand-ring rounded"
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
              className="w-full py-2.5 px-4 btn-glass-primary font-semibold text-xs rounded-lg shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 group transition-all duration-200"
            >
              {loading ? (
                <span>Memproses Masuk...</span>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Helper */}
          <div className="pt-4 border-t border-black/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                <span>Pilih Akun Cepat (Skenario Demo)</span>
              </span>
              <span className="text-[10px] text-slate-600 font-mono font-medium">pass: Password123!</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => selectDemoAccount(acc.email)}
                  className={`p-2.5 rounded-lg border text-left transition-colors duration-200 focus-brand-ring ${
                    email === acc.email
                      ? "ring-2 ring-blue-600/70 bg-blue-50 border-blue-200 text-blue-900"
                      : "bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-800"
                  }`}
                >
                  <p className="text-[11px] font-bold text-slate-900 truncate">{acc.label}</p>
                  <p className="text-[10px] text-slate-600 font-normal truncate">{acc.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-700 font-semibold space-y-1">
          <p>© 2026 PT Rasa Aruna Bersama · F&B Enterprise ERP</p>
          <p className="text-[10px] text-slate-600 font-bold">
            Akses sesuai peran dan perusahaan Anda.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
