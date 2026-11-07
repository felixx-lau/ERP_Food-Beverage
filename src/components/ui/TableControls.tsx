"use client";
import React from "react";
import { Search, ChevronLeft, ChevronRight, ArrowDown, ArrowUp, ArrowUpDown, X } from "lucide-react";
export function TableSearch({ value, onChange, label = "Cari data" }: { value: string; onChange: (v: string) => void; label?: string }) {
  return <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" aria-hidden="true" /><input type="search" aria-label={label} placeholder={label} value={value} onChange={e => onChange(e.target.value)} className="input-glass w-full pl-10 pr-10 py-2 text-sm" />{value && <button className="absolute right-1 top-0 icon-button" aria-label="Hapus pencarian" onClick={() => onChange("")}><X className="w-4 h-4" /></button>}</div>;
}
export function SortLabel({ children, active, direction, onClick }: { children: React.ReactNode; active: boolean; direction: "asc" | "desc"; onClick: () => void }) {
  const Icon = active ? direction === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
  return <button className="inline-flex items-center gap-1.5 text-inherit font-inherit" onClick={onClick}>{children}<Icon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" /></button>;
}
export function TablePagination({ page, pages, total, pageSize, onChange }: {page: number; pages: number; total: number; pageSize: number; onChange: (page: number) => void}) {
  return <div className="px-5 py-3 flex flex-wrap gap-3 items-center justify-between border-t border-slate-100 text-xs text-slate-500"><span role="status">{total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} dari {total} data</span><nav aria-label="Halaman tabel" className="flex items-center gap-2"><button className="icon-button border border-slate-200" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya"><ChevronLeft className="w-4 h-4" /></button><span className="px-2">{page} / {pages}</span><button className="icon-button border border-slate-200" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Halaman berikutnya"><ChevronRight className="w-4 h-4" /></button></nav></div>;
}
