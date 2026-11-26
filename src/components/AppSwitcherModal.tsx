"use client";

import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { NAVIGATION_GROUPS } from "./Sidebar";
import DialogFrame from "./ui/DialogFrame";
import { useCompany } from "@/context/CompanyContext";

const ownerModules = [
  { name: "Sales", href: "/sales/orders", description: "Penawaran dan pesanan penjualan" },
  { name: "CRM", href: "/crm/leads", description: "Prospek dan tindak lanjut pelanggan" },
  { name: "Purchase", href: "/purchase/orders", description: "Permintaan harga dan pesanan pembelian" },
  { name: "Inventory", href: "/inventory/products", description: "Stok dan ketersediaan per lokasi" },
  { name: "Accounting", href: "/accounting/journal-entries", description: "Buku besar dan jurnal transaksi" },
  { name: "Invoicing", href: "/accounting/invoices", description: "Faktur pelanggan dan status pembayaran" },
  { name: "POS", href: "/pos", description: "Penjualan dan sesi kasir" },
  { name: "Dashboard", href: "/dashboard", description: "Kinerja dan laporan operasional" },
];

export function OwnerModuleCards({ role, onNavigate }: { role?: string; onNavigate?: () => void }) {
  if (role !== "OWNER") return null;
  const pages = NAVIGATION_GROUPS.flatMap(group => group.items);
  return (
    <nav aria-label="Pintasan aplikasi Owner" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {ownerModules.map(module => {
        const page = pages.find(item => item.href === module.href && item.roles.includes(role));
        if (!page) return null;
        return <Link key={module.href} href={module.href} onClick={onNavigate}
          className="group min-w-0 rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-indigo-600">
          <span className="mb-2 flex items-center justify-between text-indigo-700">
            <page.icon className="h-5 w-5" aria-hidden="true" />
            <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-700" aria-hidden="true" />
          </span>
          <span className="block font-semibold text-slate-900">{module.name}</span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-600">{module.description}</span>
        </Link>;
      })}
    </nav>
  );
}

export function ModuleDirectory({ role, onNavigate }: { role?: string; onNavigate?: () => void }) {
  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {NAVIGATION_GROUPS.map(group => {
        const items = group.items.filter(item => item.roles.includes(role || ""));
        if (!items.length) return null;
        return (
          <section key={group.group}>
            <h3 className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-800">{group.group}</h3>
            <ul className="mt-1">
              {items.map(item => (
                <li key={item.href}>
                  <Link href={item.href} onClick={onNavigate} className="flex min-h-10 items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-800">
                    <item.icon className="h-4 w-4 shrink-0 text-indigo-600" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default function AppSwitcherModal({ isOpen, onClose, userRole }: {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}) {
  const { activeCompany } = useCompany();
  if (!isOpen) return null;
  return (
    <DialogFrame onClose={onClose} label="Daftar modul">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden bg-white">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Daftar modul</h2>
            {userRole === "OWNER" && <p className="mt-1 text-sm text-slate-600">{activeCompany?.name} · Owner</p>}
          </div>
          <button onClick={onClose} aria-label="Tutup daftar modul" className="icon-button"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-4 overflow-y-auto p-5">
          <OwnerModuleCards role={userRole} onNavigate={onClose} />
          {userRole === "OWNER" ? <details>
            <summary className="cursor-pointer text-sm font-semibold">Semua halaman</summary>
            <div className="mt-3"><ModuleDirectory role={userRole} onNavigate={onClose} /></div>
          </details> : <ModuleDirectory role={userRole} onNavigate={onClose} />}
        </div>
      </div>
    </DialogFrame>
  );
}
