"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  LayoutGrid,
  ShieldAlert,
  RotateCcw,
  UserCircle,
  ChevronDown,
  Check,
  MapPin,
  Sparkles,
  Users2,
  UserPlus,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import NavigationSearch from "./NavigationSearch";
import ManageTeamModal from "@/components/ManageTeamModal";
import CompanySwitcher from "@/components/CompanySwitcher";
import { useCompany } from "@/context/CompanyContext";

interface TopbarProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  onSwitchRole: (role: string, userId?: string) => Promise<void>;
  onOpenResetModal: () => void;
  onOpenAuditDrawer: () => void;
  onOpenAppSwitcher: () => void;
  onToggleMobileSidebar: () => void;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

const ROLES_LIST = [
  { role: "OWNER", name: "Maya Prasetyo", title: "Pemilik Perusahaan (Full Access)" },
  { role: "SALES", name: "Dini Anggraini", title: "Manajer Penjualan (Sales & CRM)" },
  { role: "WAREHOUSE", name: "Sinta Maharani", title: "Kepala Gudang (Inventory & Delivery)" },
  { role: "PROCUREMENT", name: "Arief Wicaksono", title: "Manajer Pengadaan (Purchase & RFQ)" },
  { role: "FINANCE", name: "Reza Firdaus", title: "Kepala Keuangan (Accounting, Ledger & Bill)" },
  { role: "CASHIER", name: "Bagas Putra", title: "Kepala Gerai / Kasir (Point of Sale)" },
];

export default function Topbar({
  currentUser,
  onSwitchRole,
  onOpenResetModal,
  onOpenAuditDrawer,
  onOpenAppSwitcher,
  onToggleMobileSidebar,
  breadcrumbs,
}: TopbarProps) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [manageTeamOpen, setManageTeamOpen] = useState(false);
  const { activeCompany } = useCompany();
  const [switching, setSwitching] = useState(false);
  const [customUsers, setCustomUsers] = useState<any[]>([]);

  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!roleMenuOpen) return;
    const dismiss = (e: MouseEvent) => { if (!profileRef.current?.contains(e.target as Node)) setRoleMenuOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setRoleMenuOpen(false); profileRef.current?.querySelector("button")?.focus(); } };
    document.addEventListener("mousedown", dismiss); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", dismiss); document.removeEventListener("keydown", key); };
  }, [roleMenuOpen]);
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        // filter out baseline 6 scenario emails to display custom team members cleanly
        const baselineEmails = [
          "owner@rasaaruna.com",
          "sales@rasaaruna.com",
          "warehouse@rasaaruna.com",
          "procurement@rasaaruna.com",
          "finance@rasaaruna.com",
          "cashier@rasaaruna.com",
        ];
        const customs = (data.users || []).filter(
          (u: any) => !baselineEmails.includes(u.email.toLowerCase())
        );
        setCustomUsers(customs);
      }
    } catch (e) {
      console.error("Fetch users error:", e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectRole = async (targetRole: string, userId?: string) => {
    setSwitching(true);
    try {
      await onSwitchRole(targetRole, userId);
    } finally {
      setSwitching(false);
      setRoleMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <>
      <header className="app-topbar sticky top-0 z-40">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          {/* Left: Mobile Toggle, Apps Launcher & Breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={onToggleMobileSidebar}
              aria-label="Buka menu navigasi"
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100/80 transition-colors text-slate-500 hover:text-slate-800 border-0 shadow-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* App Switcher Button */}
            <button
              onClick={onOpenAppSwitcher}
              aria-label="Buka Hub Aplikasi (App Switcher)"
              title="Hub Aplikasi (▦ Apps)"
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100/80 transition-colors text-slate-500 hover:text-slate-800 border-0 shadow-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none"
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Multi-Company Switcher (Retained company name) */}
            <CompanySwitcher currentUser={currentUser} />

          </div>

          {/* Right: Team Manage, Audit Trail, and User Role Switcher */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <NavigationSearch role={currentUser?.role} />
            {/* Manage Team Shortcut */}
            <button
              hidden={currentUser?.role !== "OWNER"}
              onClick={() => setManageTeamOpen(true)}
              aria-label="Kelola Tim & Anggota Kelompok"
              className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg border border-transparent hover:border-slate-200/60 transition-colors focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none"
              title="Kelola Tim & Anggota Kelompok"
            >
              <Users2 className="w-3.5 h-3.5 text-violet-600" aria-hidden="true" />
              <span>Kelola Tim</span>
            </button>

            {/* Audit History Shortcut */}
            <button
              onClick={onOpenAuditDrawer}
              aria-label="Buka Log Audit & Security History"
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg border border-transparent hover:border-slate-200/60 transition-colors focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none"
              title="Buka Log Audit & Security History (SR-15 / F-21)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-violet-600" aria-hidden="true" />
              <span className="hidden md:inline">Audit Trail</span>
            </button>

            {/* User Profile & Role Switcher */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                aria-label={`Menu pengguna: ${currentUser?.name || "Pengguna"}, Role: ${currentUser?.role || "OWNER"}`}
                aria-expanded={roleMenuOpen}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50/90 border border-slate-200/70 shadow-none text-slate-900 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {currentUser?.name ? currentUser.name.charAt(0) : "M"}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-bold leading-tight text-slate-900 max-w-[110px] truncate">
                    {currentUser?.name || "Memuat..."}
                  </p>
                  {/* High contrast role label in violet */}
                  <p className="text-xs text-violet-700 font-extrabold uppercase tracking-wider">
                    {currentUser?.role || "OWNER"}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-700" aria-hidden="true" />
              </button>

              {/* Role Switcher Dropdown */}
              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-[min(340px,calc(100vw-32px))] max-h-[calc(100dvh-88px)] overflow-y-auto glass-modal rounded-2xl shadow-glass-modal py-2 z-dropdown text-[var(--glass-text-primary)] border border-white/80 dropdown-motion">
                  <div className="px-4 py-2.5 border-b border-black/5 bg-white/40">
                    <p className="text-[10px] font-bold text-[var(--glass-text-muted)] uppercase tracking-wider">
                      Akun & akses
                    </p>
                    <p className="text-[11px] text-[var(--glass-text-secondary)] mt-0.5">
                      Identitas dan akses ruang kerja.
                    </p>
                  </div>

                  <div className="px-4 py-3 text-xs text-slate-600">Masuk sebagai {currentUser?.email}. Untuk berganti akun, keluar lalu login menggunakan kredensial pengguna tersebut.</div>

                  {/* Actions: Manage Team, Dev Reset Seed, & Logout */}
                  <div className="p-2 border-t border-slate-200 bg-[#f8fafc] space-y-1.5">
                    <button className="btn-secondary w-full" onClick={() => { setRoleMenuOpen(false); onOpenAuditDrawer(); }}>Riwayat aktivitas & audit</button>
                    <button
                      hidden={currentUser?.role !== "OWNER"}
                      onClick={() => {
                        setRoleMenuOpen(false);
                        setManageTeamOpen(true);
                      }}
                      className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-violet-200" aria-hidden="true" />
                      <span>+ Tambah / Kelola Anggota Tim</span>
                    </button>

                    {/* Developer/Demo Tool: Reset Seed with confirmation dialog */}
                    {false && (
                      <button
                        onClick={() => {
                          setRoleMenuOpen(false);
                          if (window.confirm("Buka panel konfirmasi pemulihan baseline seed database?")) {
                            onOpenResetModal();
                          }
                        }}
                        className="w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-900 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border border-amber-500/30 focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none"
                        title="Buka dialog konfirmasi reset seed database (Hanya mode Demo / Dev)"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-800" aria-hidden="true" />
                        <span>Reset data demo</span>
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border border-rose-200 focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-700" aria-hidden="true" />
                      <span>Keluar dari Sistem (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <nav aria-label="Breadcrumb" className="px-4 sm:px-6 lg:px-8 pb-3 flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-blue-700">Workspace</Link>
          {(breadcrumbs || [{label: "Beranda"}]).map((b, idx, all) => <React.Fragment key={idx}><span aria-hidden="true" className="text-slate-300">/</span>{b.href && idx < all.length - 1 ? <Link href={b.href} className="hover:text-blue-700">{b.label}</Link> : <span aria-current={idx === all.length - 1 ? "page" : undefined} className={idx === all.length - 1 ? "font-medium text-slate-700" : ""}>{b.label}</span>}</React.Fragment>)}
        </nav>
      </header>

      {/* Manage Team Modal */}
      <ManageTeamModal
        isOpen={manageTeamOpen}
        onClose={() => setManageTeamOpen(false)}
        currentUser={currentUser}
        onUserChanged={fetchUsers}
      />
    </>
  );
}
