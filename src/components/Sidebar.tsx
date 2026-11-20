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
  ChevronDown,
  X,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  keywords?: string;
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
      { name: "Beranda", href: "/", icon: Home, roles: ["OWNER", "HEAD_ADMIN", "SALES", "WAREHOUSE", "PROCUREMENT", "FINANCE", "CASHIER", "KITCHEN"], wireframe: "S-01" },
      { name: "Dashboard Eksekutif", href: "/dashboard", icon: BarChart3, roles: ["HEAD_ADMIN", "FINANCE", "OWNER"], wireframe: "S-16" },
    ],
  },
  {
    group: "Data Master",
    items: [
      { name: "Satuan Produk", href: "/master/units", icon: Package, roles: ["HEAD_ADMIN","WAREHOUSE","PROCUREMENT"] },
      { name: "Kategori produk", href: "/master/categories", icon: Package, roles: ["HEAD_ADMIN","WAREHOUSE","PROCUREMENT"] },
      { name: "Bahan baku & menu", href: "/master/products", icon: Package, roles: ["HEAD_ADMIN","WAREHOUSE","PROCUREMENT","SALES","FINANCE"] },
      { name: "Gudang & Lokasi", href: "/master/locations", icon: Package, roles: ["HEAD_ADMIN","WAREHOUSE","PROCUREMENT"] },
      { name: "Pelanggan & Vendor", href: "/sales/contacts", keywords: "pemasok supplier kontak", icon: Contact2, roles: ["HEAD_ADMIN", "SALES", "PROCUREMENT", "FINANCE"], wireframe: "S-02" },
      { name: "Harga Vendor", href: "/master/vendor-prices", icon: ShoppingBag, roles: ["HEAD_ADMIN","PROCUREMENT","FINANCE"] },
      { name: "Daftar akun keuangan", href: "/master/accounts", icon: BookOpen, roles: ["HEAD_ADMIN","FINANCE"] },
    ],
  },
  {
    group: "Pengadaan",
    items: [
      { name: "Pengajuan & minimum stok", href: "/operations/purchase", keywords: "permintaan pembelian purchase requisition pr", icon: FileText, roles: ["HEAD_ADMIN", "OWNER", "PROCUREMENT", "WAREHOUSE"] },
      { name: "Pesanan pembelian", href: "/purchase/orders", keywords: "beli pembelian vendor purchase order po", icon: ShoppingBag, roles: ["OWNER", "HEAD_ADMIN", "PROCUREMENT"], wireframe: "S-08" },
    ],
  },
  {
    group: "Persediaan & Gudang",
    items: [
      { name: "Stok & Ketersediaan", href: "/inventory/products", icon: Package, roles: ["OWNER", "HEAD_ADMIN", "WAREHOUSE", "PROCUREMENT"], wireframe: "S-03" },
      { name: "Penerimaan Barang", href: "/inventory/receipts", keywords: "barang masuk goods receipt", icon: PackageCheck, roles: ["HEAD_ADMIN", "WAREHOUSE"], wireframe: "S-09" },
      { name: "Resep & produksi", href: "/operations/production", keywords: "bom resep produksi", icon: BookOpen, roles: ["HEAD_ADMIN", "WAREHOUSE", "KITCHEN"] },
      { name: "Transfer Gudang", href: "/inventory/transfers", icon: ArrowLeftRight, roles: ["HEAD_ADMIN", "WAREHOUSE"], wireframe: "S-07" },
      { name: "Pengiriman barang", href: "/inventory/delivery", icon: Truck, roles: ["HEAD_ADMIN", "WAREHOUSE"], wireframe: "S-06" },
      { name: "Retur Barang", href: "/inventory/returns", icon: RotateCcw, roles: ["HEAD_ADMIN", "WAREHOUSE", "FINANCE"], wireframe: "S-15" },
      { name: "Pergerakan & Penyesuaian", href: "/inventory/movements", icon: ArrowLeftRight, roles: ["OWNER", "HEAD_ADMIN","WAREHOUSE","PROCUREMENT","FINANCE"] },
    ],
  },
  {
    group: "Penjualan & CRM",
    items: [
      { name: "Peluang penjualan", href: "/crm/leads", keywords: "lead prospek", icon: Users2, roles: ["OWNER", "HEAD_ADMIN", "SALES"], wireframe: "S-04" },
      { name: "Penawaran & pesanan penjualan", href: "/sales/orders", keywords: "quotation sales order so", icon: ShoppingCart, roles: ["OWNER", "HEAD_ADMIN", "SALES"], wireframe: "S-05" },
      { name: "Kasir POS", href: "/pos", keywords: "point of sale kasir", icon: Store, roles: ["OWNER", "HEAD_ADMIN", "CASHIER"], wireframe: "S-14" },
    ],
  },
  {
    group: "Keuangan",
    items: [
      { name: "Tagihan pelanggan", href: "/accounting/invoices", keywords: "invoice faktur", icon: Receipt, roles: ["OWNER", "HEAD_ADMIN", "FINANCE", "SALES"], wireframe: "S-10" },
      { name: "Tagihan vendor", href: "/accounting/vendor-bills", icon: FileText, roles: ["HEAD_ADMIN", "FINANCE"], wireframe: "S-11" },
      { name: "Pembayaran Kas & Bank", href: "/accounting/payments", icon: CreditCard, roles: ["HEAD_ADMIN", "FINANCE"], wireframe: "S-12" },
      { name: "Buku Besar & Jurnal", href: "/accounting/journal-entries", icon: BookOpen, roles: ["OWNER", "HEAD_ADMIN", "FINANCE"], wireframe: "S-13" },
      { name: "Laporan Keuangan", href: "/accounting/reports", icon: BarChart3, roles: ["OWNER", "HEAD_ADMIN","FINANCE"] },
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

export default function Sidebar({ userRole = "", isCollapsed, onToggleCollapse, isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { activeCompany } = useCompany();
  const activeGroup = NAVIGATION_GROUPS.find(group => group.items.some(item => item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href + "/"))))?.group;
  const [closedGroups, setClosedGroups] = useState<string[]>(() =>
    NAVIGATION_GROUPS.map(group => group.group).filter(name => name !== activeGroup)
  );
  useEffect(() => {
    setClosedGroups(groups => groups.filter(name => name !== activeGroup));
  }, [activeGroup, pathname]);
  const content = (collapsed: boolean, mobile = false) => <div className="sidebar-shell flex flex-col h-full">
    <div className={`h-[72px] flex items-center gap-3 border-b border-white/15 shrink-0 ${collapsed ? "justify-center" : "px-5"}`}>
      <Link href="/" onClick={onCloseMobile} aria-label="Rasa Aruna — Beranda" className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm shrink-0">RA</div>
        {!collapsed && <div className="min-w-0"><p className="font-semibold text-[15px] text-white truncate">{activeCompany?.brand || "Rasa Aruna"}</p><p className="text-[11px] text-indigo-200 mt-0.5">Ruang kerja ERP</p></div>}
      </Link>
      {mobile && <button className="icon-button ml-auto" onClick={onCloseMobile} aria-label="Tutup navigasi"><X className="w-5 h-5" /></button>}
    </div>
    <nav aria-label="Navigasi utama" className={`flex-1 min-h-0 py-3 space-y-1 ${collapsed ? "px-3 overflow-y-auto" : "px-4 overflow-y-auto"}`}>
      {NAVIGATION_GROUPS.map(group => ({ ...group, items: group.items.filter(item => item.roles.includes(userRole)) })).filter(group => group.items.length).map((group, index) => <div key={group.group}>
        {!collapsed && <button type="button" onClick={() => setClosedGroups(prev => prev.includes(group.group) ? prev.filter(g => g !== group.group) : [...prev, group.group])} aria-expanded={!closedGroups.includes(group.group)} aria-controls={`${mobile ? "mobile" : "desktop"}-nav-${index}`} className="w-full flex items-center justify-between px-3 rounded-lg hover:bg-white/10 text-sm font-semibold text-indigo-100 min-h-11">
          {group.group}<ChevronDown className={`w-3 h-3 transition-transform ${closedGroups.includes(group.group) ? "-rotate-90" : ""}`} />
        </button>}
        <div id={`${mobile ? "mobile" : "desktop"}-nav-${index}`} className="sidebar-group" data-open={collapsed || !closedGroups.includes(group.group)} aria-hidden={!collapsed && closedGroups.includes(group.group)}>
          <div className="sidebar-group-content" inert={!collapsed && closedGroups.includes(group.group)}>
          <div className="space-y-1">
          {group.items.map(item => <Link key={item.href} href={item.href} onClick={onCloseMobile} title={collapsed ? item.name : undefined} aria-label={item.name} aria-current={pathname === item.href ? "page" : item.href !== "/" && pathname.startsWith(item.href + "/") ? "location" : undefined} className={`nav-item ${collapsed ? "justify-center px-0" : ""}`}>
            <item.icon /><span className={collapsed ? "sr-only" : "leading-snug"}>{item.name}</span>
          </Link>)}
          </div>
          </div>
        </div>
      </div>)}
    </nav>
    <div className={`border-t border-white/15 p-3 ${mobile ? "hidden" : ""} ${collapsed ? "text-center" : ""}`}>
      {!mobile && <button onClick={onToggleCollapse} aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"} title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"} className={`flex items-center min-h-10 gap-3 text-xs text-indigo-200 hover:text-white rounded-lg w-full ${collapsed ? "justify-center" : "px-3"}`}>{collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Ciutkan sidebar</span></>}</button>}
    </div>
  </div>;
  return <>
    <aside className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-[width] duration-200 ${isCollapsed ? "w-20" : "w-[272px]"}`}>{content(isCollapsed)}</aside>
    {isOpenMobile && <DialogFrame onClose={onCloseMobile} label="Navigasi utama" drawer side="left"><div className="w-[min(320px,90vw)] mr-auto">{content(false, true)}</div></DialogFrame>}
  </>;
}
