"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Building2,
  ChevronDown,
  Plus,
  Check,
  Settings,
  Trash2,
  Sparkles,
  Layers,
} from "lucide-react";
import { useCompany, Company } from "@/context/CompanyContext";
import CreateCompanyModal from "./CreateCompanyModal";
import EditCompanyModal from "./EditCompanyModal";

interface CompanySwitcherProps {
  currentUser?: any;
}

export default function CompanySwitcher({ currentUser }: CompanySwitcherProps) {
  const { companies, activeCompany, switchCompany, deleteCompany } = useCompany();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "CO";
    const words = name.replace(/^(pt|cv|ud)\.?\s+/i, "").trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSelectCompany = async (company: Company) => {
    if (company.id === activeCompany?.id) {
      setDropdownOpen(false);
      return;
    }
    setDropdownOpen(false);
    await switchCompany(company.id);
  };

  const handleDelete = async (e: React.MouseEvent, company: Company) => {
    e.stopPropagation();
    if (company.id === "default") return;
    const confirmDelete = window.confirm(
      `Yakin ingin menghapus ruang kerja perusahaan '${company.name}'? Seluruh data produk dan transaksi di perusahaan ini akan dihapus permanen.`
    );
    if (confirmDelete) {
      await deleteCompany(company.id);
    }
  };

  const activeName = activeCompany?.name || "PT Rasa Aruna Bersama";
  const activeBrand = activeCompany?.brand || "Rasa Aruna Kitchen";
  const initials = getInitials(activeName);

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white/95 active:bg-white border border-white/80 text-slate-800 hover:text-[#26493b] transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 text-left group cursor-pointer focus-visible:ring-2 focus-visible:ring-[#26493b] focus-visible:outline-none"
          title={`${activeBrand} — ${activeName} (Klik untuk beralih perusahaan)`}
          aria-expanded={dropdownOpen}
          aria-label={`Perusahaan aktif: ${activeName} (${activeBrand})`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4b36a] to-[#b5924f] flex items-center justify-center font-extrabold text-[#14281f] text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform border border-white/60">
            {initials}
          </div>
          <div className="leading-tight min-w-0 max-w-[210px]">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-slate-900 text-xs truncate group-hover:text-[#26493b]" title={activeBrand}>
                {activeBrand}
              </span>
              {activeCompany?.isDefault ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300/60 shrink-0">
                  Demo
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300/60 shrink-0">
                  Kustom
                </span>
              )}
            </div>
            <span className="text-xs text-slate-700 font-semibold hidden sm:block truncate" title={activeName}>
              {activeName}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-700 group-hover:text-[#26493b] transition-transform shrink-0 ${
              dropdownOpen ? "rotate-180 text-[#26493b]" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute left-0 mt-2 w-84 rounded-2xl glass-modal shadow-2xl border border-white/80 py-2 z-50 animate-in fade-in zoom-in-95">
            {/* Header info */}
            <div className="px-4 py-2.5 border-b border-black/5 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-slate-800 text-[11px] font-black uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-[#26493b]" aria-hidden="true" />
                <span>Pilih Perusahaan Aktif</span>
              </div>
              <span className="text-[11px] font-bold text-[#26493b] bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-300/50">
                {companies.length} Entitas
              </span>
            </div>

            {/* List of Companies */}
            <div className="max-h-60 overflow-y-auto py-1 space-y-1 px-2">
              {companies.map((comp) => {
                const isActive = comp.id === activeCompany?.id;
                const compInitials = getInitials(comp.name);

                return (
                  <div
                    key={comp.id}
                    onClick={() => handleSelectCompany(comp)}
                    className={`group/item flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? "bg-[#26493b]/10 border border-[#26493b]/30 text-[#26493b] font-bold shadow-xs"
                        : "hover:bg-white/80 hover:shadow-xs text-slate-800 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                          isActive
                            ? "bg-[#26493b] text-white"
                            : "bg-slate-200 text-slate-800 group-hover/item:bg-[#d4b36a] group-hover/item:text-[#14281f]"
                        }`}
                      >
                        {compInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <p className="text-xs font-bold truncate text-slate-900 group-hover/item:text-[#26493b]" title={comp.name}>{comp.name}</p>
                          {comp.isDefault && (
                            <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-emerald-100 text-emerald-900 shrink-0">
                              Demo Kuliah
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-700 font-semibold truncate">
                          Brand: {comp.brand} · {comp.city || "Jakarta"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {isActive ? (
                        <div className="w-5 h-5 rounded-full bg-[#26493b] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : !comp.isDefault ? (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, comp)}
                          className="opacity-0 group-hover/item:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Hapus perusahaan ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions Divider */}
            <div className="border-t border-black/5 my-1 pt-1.5 px-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setCreateModalOpen(true);
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-black text-[#174A3A] bg-[#174A3A]/10 hover:bg-[#174A3A]/15 border border-[#174A3A]/20 rounded-xl transition-all text-left shadow-xs cursor-pointer hover:translate-x-0.5"
              >
                <div className="w-6 h-6 rounded-lg bg-[#174A3A] text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>Tambah Perusahaan Baru</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setEditModalOpen(true);
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-slate-800 hover:text-[#174A3A] hover:bg-white/80 rounded-xl transition-colors text-left cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-200/80 text-slate-800 flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <span>Pengaturan Profil Perusahaan</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateCompanyModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        currentUser={currentUser}
      />
      <EditCompanyModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
      />
    </>
  );
}
