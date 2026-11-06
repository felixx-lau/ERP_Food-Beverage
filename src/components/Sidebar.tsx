"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import {
  Home,
  BarChart3,
  Users2,
  Contact2,
  ShoppingCart,
  Package,
  Truck,
  ArrowLeftRight,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Receipt,
  FileText,
  CreditCard,
  BookOpen,
  Store,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Lock,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  wireframe?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    group: "Ringkasan",
    items: [
      { name: "Beranda", href: "/", icon: Home, roles: ["OWNER", "SALES", "WAREHOUSE", "PROCUREMENT", "FINANCE", "CASHIER"], wireframe: "S-01" },
      { name: "Dashboard Eksekutif", href: "/dashboard", icon: BarChart3, roles: ["OWNER", "FINANCE", "SALES", "WAREHOUSE", "PROCUREMENT"], wireframe: "S-16" },
    ],
  },
  {
    group: "Penjualan & CRM",
    items: [
      { name: "Peluang CRM (Leads)", href: "/crm/leads", icon: Users2, roles: ["OWNER", "SALES"], wireframe: "S-02" },
      { name: "Pelanggan & Vendor", href: "/sales/contacts", icon: Contact2, roles: ["OWNER", "SALES"], wireframe: "S-03" },
      { name: "Pesanan Penjualan (SO)", href: "/sales/orders", icon: ShoppingCart, roles: ["OWNER", "SALES"], wireframe: "S-04" },
    ],
  },
  {
    group: "Persediaan & Gudang",
    items: [
      { name: "Produk & Menu", href: "/inventory/products", icon: Package, roles: ["OWNER", "WAREHOUSE", "PROCUREMENT"], wireframe: "S-05" },
      { name: "Pengiriman (Delivery)", href: "/inventory/delivery", icon: Truck, roles: ["OWNER", "WAREHOUSE"], wireframe: "S-06" },
      { name: "Transfer Gudang", href: "/inventory/transfers", icon: ArrowLeftRight, roles: ["OWNER", "WAREHOUSE"], wireframe: "S-07" },
      { name: "Penerimaan Barang", href: "/inventory/receipts", icon: PackageCheck, roles: ["OWNER", "WAREHOUSE"], wireframe: "S-09" },
      { name: "Retur Barang", href: "/inventory/returns", icon: RotateCcw, roles: ["OWNER", "WAREHOUSE"], wireframe: "S-15" },
    ],
  },
  {
    group: "Pengadaan",
    items: [
      { name: "Pesanan Pembelian (PO)", href: "/purchase/orders", icon: ShoppingBag, roles: ["OWNER", "PROCUREMENT"], wireframe: "S-08" },
    ],
  },
  {
    group: "Keuangan",
    items: [
      { name: "Faktur Tagihan (Invoice)", href: "/accounting/invoices", icon: Receipt, roles: ["OWNER", "FINANCE", "SALES"], wireframe: "S-10" },
      { name: "Tagihan Vendor (Bills)", href: "/accounting/vendor-bills", icon: FileText, roles: ["OWNER", "FINANCE"], wireframe: "S-11" },
      { name: "Pembayaran Kas & Bank", href: "/accounting/payments", icon: CreditCard, roles: ["OWNER", "FINANCE"], wireframe: "S-12" },
      { name: "Buku Besar & Jurnal", href: "/accounting/journal-entries", icon: BookOpen, roles: ["OWNER", "FINANCE"], wireframe: "S-13" },
    ],
  },
  {
    group: "Penjualan Kasir (POS)",
    items: [
      { name: "Kasir POS", href: "/pos", icon: Store, roles: ["OWNER", "CASHIER"], wireframe: "S-14" },
    ],
  },
];

interface SidebarProps {
  userRole?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  userRole = "OWNER",
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { activeCompany } = useCompany();

  const getInitials = (name?: string) => {
    if (!name) return "RA";
    const words = name.replace(/^(pt|cv|ud)\.?\s+/i, "").trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const activeName = activeCompany?.name || "PT Rasa Aruna Bersama";
  const activeBrand = activeCompany?.brand || "Rasa Aruna";
  const initials = getInitials(activeName);

  const sidebarContent = (
    <div className="flex flex-col h-full glass-1 text-[var(--glass-text-primary)] select-none border-r border-white/40 shadow-glass-1">
      {/* Brand Header */}
      <div className={`h-14 flex items-center justify-between border-b border-white/30 bg-white/30 backdrop-blur-md ${isCollapsed ? "px-0 justify-center" : "px-4"}`}>
        <Link 
          href="/" 
          className={`flex items-center overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none ${isCollapsed ? "p-1 justify-center" : "space-x-2.5 p-1"}`}
          title={`${activeBrand} — Portal ERP`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md shadow-indigo-500/20 border border-white/40">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm tracking-tight text-slate-900 truncate">
                {activeBrand}
              </span>
              <span className="text-xs text-slate-500 font-medium tracking-normal truncate">
                Portal ERP
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle (desktop) — hidden when collapsed to save space */}
        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label="Ciutkan Sidebar"
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/80 text-[var(--glass-text-muted)] hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none transition-colors"
            title="Ciutkan Sidebar"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {/* Expand button visible when collapsed */}
        {isCollapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label="Perluas Sidebar"
            title="Perluas Sidebar"
            className="flex items-center justify-center w-9 h-9 mt-1 mx-auto rounded-xl hover:bg-white/80 text-slate-500 hover:text-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                {group.group}
              </p>
            )}
            {isCollapsed && (
              <div className="border-t border-white/30 mx-1 mb-1" />
            )}

            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const hasAccess = item.roles.includes(userRole);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  title={item.name}
                  className={`group flex items-center rounded-xl text-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none ${
                    isCollapsed ? "justify-center w-9 h-9 mx-auto" : "px-3 py-2"
                  } ${
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-sm border border-blue-500/20"
                      : hasAccess
                      ? "text-slate-800 font-medium hover:bg-slate-50/80 hover:text-blue-700"
                      : "text-slate-400 font-medium hover:bg-white/20"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${
                      isActive
                        ? "text-blue-100"
                        : hasAccess
                        ? "text-slate-500 group-hover:text-blue-600"
                        : "text-slate-400"
                    } ${!isCollapsed ? "mr-3" : ""}`}
                    aria-hidden="true"
                  />

                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{item.name}</span>
                      {!hasAccess && (
                        <Lock className="w-3 h-3 text-amber-700 flex-shrink-0 ml-1.5" aria-hidden="true" />
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-3 border-t border-white/40 bg-white/40 text-xs">
          <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-600 shrink-0" aria-hidden="true" />
            <span className="truncate">Sesi Terverifikasi</span>
          </div>
          <p className="text-xs text-slate-700 mt-0.5 font-semibold">
            Role: <span className="font-bold text-blue-700 uppercase">{userRole}</span>
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed top-0 bottom-0 left-0 z-30 transition-all duration-200 ease-in-out ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 ease-in-out ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}