"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, X } from "lucide-react";
import { NAVIGATION_GROUPS } from "./Sidebar";
import DialogFrame from "./ui/DialogFrame";
export default function NavigationSearch({ role }: { role?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => { const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o); } }; document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key); }, []);
  const results = NAVIGATION_GROUPS.flatMap(g => g.items.map(i => ({ ...i, group: g.group }))).filter(i => i.roles.includes(role || "") && `${i.name} ${i.group}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <button onClick={() => { setQuery(""); setOpen(true); }} className="flex items-center gap-2 text-slate-500 hover:text-blue-700 rounded-lg p-2 xl:px-3 xl:bg-slate-50 xl:border xl:border-slate-200" aria-label="Cari halaman (Ctrl atau Command K)"><Search className="w-[18px] h-[18px]" /><span className="hidden xl:inline text-xs">Cari halaman…</span><kbd className="hidden xl:inline text-[10px] border border-slate-200 rounded px-1.5 ml-5">⌘ K</kbd></button>
    {open && <DialogFrame onClose={() => setOpen(false)} label="Cari halaman"><div className="bg-white w-full max-w-xl overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-slate-100"><Search className="w-5 h-5 text-blue-600" /><input aria-label="Cari halaman" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari modul atau halaman…" className="flex-1 min-w-0 text-sm bg-transparent outline-none" /><button onClick={() => setOpen(false)} className="icon-button" aria-label="Tutup pencarian"><X className="w-5 h-5" /></button></div>
      <div className="p-3 max-h-[60vh] overflow-y-auto"><p className="px-3 py-2 text-[11px] text-slate-500" role="status">{results.length} halaman tersedia</p>{results.map(i => <Link href={i.href} key={i.href} onClick={() => setOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 group"><i.icon className="w-5 h-5 text-indigo-600" /><div><p className="text-sm font-medium text-slate-800">{i.name}</p><p className="text-xs text-slate-500">{i.group}</p></div><ArrowUpRight className="w-4 h-4 ml-auto text-slate-400" /></Link>)}{!results.length && <p className="text-sm text-slate-500 text-center py-10">Tidak ada halaman yang cocok. Coba kata kunci lain.</p>}</div>
    </div></DialogFrame>}
  </>;
}
