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
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/30 bg-white/30 backdrop-blur-md">
        <Link 
          href="/" 
          className="flex items-center space-x-2.5 overflow-hidden rounded-xl p-1 focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none"
          title={`${activeBrand} — Portal ERP`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-md shadow-indigo-500/20 border border-white/40">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 truncate">
                {activeBrand}
              </span>
              <span className="text-xs text-slate-700 font-semibold tracking-normal truncate">
                Portal ERP
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/80 text-[var(--glass-text-muted)] hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none transition-colors"
          title={isCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" aria-hidden="true" /> : <ChevronLeft className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.group} className="space-y-1">
            {!isCollapsed && (
              <p className="px-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                {group.group}
              </p>
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
                  className={`group flex items-center rounded-xl px-2.5 py-2 text-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25 border border-white/20 transform translate-x-1"
                      : hasAccess
                      ? "text-slate-800 font-bold hover:bg-white/80 hover:text-blue-700 hover:translate-x-1 hover:shadow-xs"
                      : "text-slate-400 font-medium hover:bg-white/20"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive
                        ? "text-violet-200"
                        : hasAccess
                        ? "text-blue-600 group-hover:text-indigo-600"
                        : "text-slate-400"
                    } ${!isCollapsed ? "mr-2.5" : "mx-auto"}`}
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
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 truncate">
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