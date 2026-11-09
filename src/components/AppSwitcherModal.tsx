"use client";
import DialogFrame from "./ui/DialogFrame";

import React, { useRef } from "react";
import useEntranceMotion from "./ui/useEntranceMotion";
import {
  X,
  ShoppingCart,
  Users2,
  Truck,
  Package,
  BookOpen,
  Receipt,
  Store,
  BarChart3,
  Lock
} from "lucide-react";
import { canAccessModule } from "@/lib/auth";
import { Role } from "@prisma/client";

interface AppSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  onSelectApp?: (appKey: string) => void;
}

export const APPS_CATALOG = [
  {
    key: "sales",
    name: "Sales",
    desc: "Penawaran harga, sales order, persetujuan diskon & penguncian harga",
    icon: ShoppingCart,
    color: "bg-blue-600/10 text-blue-600 border border-blue-600/20",
    roles: ["OWNER", "SALES"],
    destination: "Penawaran & Pesanan (SO)",
  },
  {
    key: "crm",
    name: "CRM",
    desc: "Pipeline prospek kanban & pelacakan peluang bisnis",
    icon: Users2,
    color: "bg-blue-600/10 text-blue-600 border border-blue-600/20",
    roles: ["OWNER", "SALES"],
    destination: "Papan Prospek (Leads CRM)",
  },
  {
    key: "purchase",
    name: "Purchase",
    desc: "Permintaan penawaran (RFQ), PO vendor & komitmen pengadaan",
    icon: Truck,
    color: "bg-blue-600/10 text-blue-600 border border-blue-600/20",
    roles: ["OWNER", "PROCUREMENT"],
    destination: "Permintaan Penawaran (RFQ) & PO",
  },
  {
    key: "inventory",
    name: "Inventory",
    desc: "15 varian SKU, stok multi-lokasi, surat jalan & transfer",
    icon: Package,
    color: "bg-blue-600/10 text-blue-600 border border-blue-600/20",
    roles: ["OWNER", "WAREHOUSE", "PROCUREMENT"],
    destination: "Stok & Operasional",
  },
  {
    key: "accounting",
    name: "Accounting",
    desc: "Buku besar double-entry, bagan akun (CoA) & COGS",
    icon: BookOpen,
    color: "bg-blue-600/10 text-blue-600 border border-blue-600/20",
    roles: ["OWNER", "FINANCE"],
    destination: "Buku Besar & Jurnal",
  },
  {
    key: "invoicing",
    name: "Invoicing",
    desc: "Faktur pengiriman, tagihan vendor, 3-way match & PBJT 10%",
    icon: Receipt,
    color: "bg-blue-600/10 text-blue-600 border border-blue-600/20",
    roles: ["OWNER", "FINANCE", "SALES"],
    destination: "Faktur & Tagihan",
  },
  {
    key: "pos",
    name: "Point of Sale",
    desc: "Kasir gerai CAFE-JKT, sesi POS, QRIS & pencatatan pesanan",
    icon: Store,
    color: "bg-blue-600/10 text-blue-600 border border-blue-600/20",
    roles: ["OWNER", "CASHIER"],
    destination: "Sesi Kasir POS",
  },
  {
    key: "dashboard",
    name: "Dashboard",
    desc: "KPI operasional, ringkasan valuasi persediaan & rekonsiliasi",
    icon: BarChart3,
    color: "bg-blue-600/10 text-blue-600 border border-blue-600/20",
    roles: ["OWNER", "FINANCE", "SALES", "WAREHOUSE", "PROCUREMENT"],
    destination: "Laporan & KPI",
  },
];

import { useRouter } from "next/navigation";

export default function AppSwitcherModal({
  isOpen,
  onClose,
  userRole,
  onSelectApp,
}: AppSwitcherModalProps) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  useEntranceMotion(root, isOpen);
  if (!isOpen) return null;

  const handleAppClick = (appKey: string) => {
    onClose();
    if (appKey === "sales") router.push("/sales/orders");
    else if (appKey === "crm") router.push("/crm/leads");
    else if (appKey === "inventory") router.push("/inventory/products");
    else if (appKey === "purchase") router.push("/purchase/orders");
    else if (appKey === "invoicing") router.push("/accounting/invoices");
    else if (appKey === "accounting") router.push("/accounting/journal-entries");
    else if (appKey === "pos") router.push("/pos");
    else if (appKey === "dashboard") router.push("/dashboard");
    else if (onSelectApp) onSelectApp(appKey);
  };

  return (
    <DialogFrame onClose={onClose}>
      <div ref={root} className="glass-modal border border-white/80 w-full max-w-4xl rounded-3xl p-8 shadow-glass-modal relative animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Tutup jendela daftar aplikasi"
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/80 text-slate-600 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none transition-colors shadow-xs"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Modal Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-600/10 text-xs font-bold text-blue-700 mb-2 border border-blue-600/20">
            <span className="w-2 h-2 rounded-full bg-blue-600" aria-hidden="true" />
            <span>Pusat Navigasi Terpadu</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center justify-center space-x-2">
            <span>Rasa Aruna Apps Hub</span>
          </h2>
          <p className="text-xs text-slate-700 font-bold mt-1">
            Navigasi modul ERP terintegrasi · Role Aktif:{" "}
            <span className="font-black text-blue-700 uppercase px-2.5 py-0.5 rounded-full bg-blue-600/10 border border-blue-600/20">
              {userRole || "GUEST"}
            </span>
          </p>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {APPS_CATALOG.map((app) => {
            const hasAccess = userRole ? app.roles.includes(userRole) : false;
            const IconComponent = app.icon;

            return (
              <button
                key={app.key}
                disabled={!hasAccess}
                data-available={hasAccess}
                onClick={() => handleAppClick(app.key)}
                className={`brand-card module-card group flex flex-col items-center text-center p-4 rounded-2xl border transition-all relative focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:outline-none ${
                  hasAccess
                    ? "border-indigo-400/50"
                    : "cursor-not-allowed border-dashed"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center module-icon mb-3 bg-white/10 border border-white/25`}
                >
                  <IconComponent className="w-7 h-7 text-white" aria-hidden="true" />
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="module-name font-black text-sm tracking-wide transition-colors">
                    {app.name}
                  </span>
                  {!hasAccess && <Lock className="w-3.5 h-3.5 text-indigo-700" aria-hidden="true" />}
                </div>

                <span className="module-destination text-[11px] text-white font-semibold mt-1 line-clamp-2 leading-relaxed">
                  {app.destination}
                </span>

                {!hasAccess && (
                  <span className="mt-2 text-[10px] font-black px-2 py-0.5 rounded-full glass-badge-danger">
                    Terkunci
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </DialogFrame>
  );
}
