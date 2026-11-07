"use client";

import DialogFrame from "./ui/DialogFrame";
import React, { useState, useEffect } from "react";
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
  ChevronDown,
  X,
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

export const NAVIGATION_GROUPS: NavGroup[] = [
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
      { name: "Peluang CRM (Leads)", href: "/crm/leads", icon: Users2, roles: ["OWNER", "SALES"], wireframe: "S-04" },
      { name: "Pelanggan & Vendor", href: "/sales/contacts", icon: Contact2, roles: ["OWNER", "SALES", "PROCUREMENT", "FINANCE"], wireframe: "S-02" },
      { name: "Pesanan Penjualan (SO)", href: "/sales/orders", icon: ShoppingCart, roles: ["OWNER", "SALES"], wireframe: "S-05" },
    ],
  },
  {
    group: "Persediaan & Gudang",
    items: [
      { name: "Produk & Menu", href: "/inventory/products", icon: Package, roles: ["OWNER", "WAREHOUSE", "PROCUREMENT"], wireframe: "S-03" },
      { name: "Pergerakan & Penyesuaian", href: "/inventory/movements", icon: ArrowLeftRight, roles: ["OWNER","WAREHOUSE","PROCUREMENT","FINANCE"] },
      { name: "Pengiriman (Delivery)", href: "/inventory/delivery", icon: Truck, roles: ["OWNER", "WAREHOUSE"], wireframe: "S-06" },
      { name: "Transfer Gudang", href: "/inventory/transfers", icon: ArrowLeftRight, roles: ["OWNER", "WAREHOUSE"], wireframe: "S-07" },
      { name: "Penerimaan Barang", href: "/inventory/receipts", icon: PackageCheck, roles: ["OWNER", "WAREHOUSE"], wireframe: "S-09" },
      { name: "Retur Barang", href: "/inventory/returns", icon: RotateCcw, roles: ["OWNER", "WAREHOUSE", "FINANCE"], wireframe: "S-15" },
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
      { name: "Laporan Keuangan", href: "/accounting/reports", icon: BarChart3, roles: ["OWNER","FINANCE"] },
      { name: "Buku Besar & Jurnal", href: "/accounting/journal-entries", icon: BookOpen, roles: ["OWNER", "FINANCE"], wireframe: "S-13" },
    ],
  },
  {
    group: "Data Master",
    items: [
      { name: "Kelola Produk", href: "/master/products", icon: Package, roles: ["OWNER","WAREHOUSE","PROCUREMENT","SALES","FINANCE"] },
      { name: "Kategori & Menu", href: "/master/categories", icon: Package, roles: ["OWNER","WAREHOUSE","PROCUREMENT"] },
      { name: "Satuan Produk", href: "/master/units", icon: Package, roles: ["OWNER","WAREHOUSE","PROCUREMENT"] },
      { name: "Gudang & Lokasi", href: "/master/locations", icon: Package, roles: ["OWNER","WAREHOUSE","PROCUREMENT"] },
      { name: "Harga Vendor", href: "/master/vendor-prices", icon: ShoppingBag, roles: ["OWNER","PROCUREMENT","FINANCE"] },
      { name: "Chart of Accounts", href: "/master/accounts", icon: BookOpen, roles: ["OWNER","FINANCE"] },
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

export default function Sidebar({ userRole = "OWNER", isCollapsed, onToggleCollapse, isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { activeCompany } = useCompany();
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  useEffect(() => { setClosedGroups(groups => groups.filter(name => !NAVIGATION_GROUPS.find(g => g.group === name)?.items.some(i => i.href === pathname))); }, [pathname]);
  const content = (collapsed: boolean, mobile = false) => <div className="sidebar-shell flex flex-col h-full">
    <div className={`h-[72px] flex items-center gap-3 border-b border-white/15 shrink-0 ${collapsed ? "justify-center" : "px-5"}`}>
      <Link href="/" onClick={onCloseMobile} aria-label="Rasa Aruna — Beranda" className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm shrink-0">RA</div>
        {!collapsed && <div className="min-w-0"><p className="font-semibold text-[15px] text-white truncate">{activeCompany?.brand || "Rasa Aruna"}</p><p className="text-[11px] text-indigo-200 mt-0.5">Business workspace</p></div>}
      </Link>
      {mobile && <button className="icon-button ml-auto" onClick={onCloseMobile} aria-label="Tutup navigasi"><X className="w-5 h-5" /></button>}
    </div>
    <nav aria-label="Navigasi utama" className={`flex-1 py-5 space-y-5 ${collapsed ? "px-3 overflow-y-auto" : "px-4 overflow-y-auto"}`}>
      {NAVIGATION_GROUPS.map((group, index) => <div key={group.group}>
        {!collapsed && <button type="button" onClick={() => setClosedGroups(prev => prev.includes(group.group) ? prev.filter(g => g !== group.group) : [...prev, group.group])} aria-expanded={!closedGroups.includes(group.group)} aria-controls={`${mobile ? "mobile" : "desktop"}-nav-${index}`} className="w-full flex items-center justify-between px-3 mb-1 text-[10px] font-semibold uppercase tracking-[.1em] text-indigo-200 min-h-8">
          {group.group}<ChevronDown className={`w-3 h-3 transition-transform ${closedGroups.includes(group.group) ? "-rotate-90" : ""}`} />
        </button>}
        <div id={`${mobile ? "mobile" : "desktop"}-nav-${index}`} className="sidebar-group" data-open={collapsed || !closedGroups.includes(group.group)} aria-hidden={!collapsed && closedGroups.includes(group.group)}>
          <div className="sidebar-group-content" inert={!collapsed && closedGroups.includes(group.group)}>
          <div className="space-y-1">
          {group.items.map(item => <Link key={item.href} href={item.href} onClick={onCloseMobile} title={collapsed ? item.name : undefined} aria-label={item.name} aria-current={pathname === item.href ? "page" : undefined} className={`nav-item ${collapsed ? "justify-center px-0" : ""}`}>
            <item.icon /><span className={collapsed ? "sr-only" : "truncate"}>{item.name}</span>
            {!collapsed && !item.roles.includes(userRole) && <Lock className="nav-lock" aria-label="Akses terbatas" />}
          </Link>)}
          </div>
          </div>
        </div>
      </div>)}
    </nav>
    <div className={`border-t border-white/15 p-4 ${collapsed ? "text-center" : ""}`}>
      {!collapsed && <div className="rounded-xl bg-white/10 px-3 py-3 mb-3 flex gap-2.5 items-center"><ShieldCheck className="w-5 h-5 text-violet-200 shrink-0" /><div><p className="text-xs font-medium text-indigo-100">Ruang kerja aktif</p><p className="text-[11px] text-indigo-200 mt-0.5">{userRole}</p></div></div>}
      {!mobile && <button onClick={onToggleCollapse} aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"} title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"} className={`flex items-center gap-3 text-xs text-indigo-200 hover:text-white rounded-lg w-full ${collapsed ? "justify-center" : "px-3"}`}>{collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Ciutkan sidebar</span></>}</button>}
    </div>
  </div>;
  return <>
    <aside className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-[width] duration-200 ${isCollapsed ? "w-20" : "w-[272px]"}`}>{content(isCollapsed)}</aside>
    {isOpenMobile && <DialogFrame onClose={onCloseMobile} label="Navigasi utama" drawer side="left"><div className="w-[min(320px,90vw)] mr-auto">{content(false, true)}</div></DialogFrame>}
  </>;
}
