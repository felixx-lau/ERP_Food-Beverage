"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { NAVIGATION_GROUPS } from "./Sidebar";
import DialogFrame from "./ui/DialogFrame";

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
  if (!isOpen) return null;
  return (
    <DialogFrame onClose={onClose} label="Daftar modul">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden bg-white">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold">Daftar modul</h2>
          <button onClick={onClose} aria-label="Tutup daftar modul" className="icon-button"><X className="h-5 w-5" /></button>
        </header>
        <div className="overflow-y-auto p-5"><ModuleDirectory role={userRole} onNavigate={onClose} /></div>
      </div>
    </DialogFrame>
  );
}
