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
          className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/10 text-white transition-all shadow-xs text-left group"
          title="Beralih atau Kelola Perusahaan (Multi-Company Workspace)"
        >
          <div className="w-8 h-8 rounded-lg bg-[#C6A15B] flex items-center justify-center font-black text-slate-900 text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            {initials}
          </div>
          <div className="hidden sm:block leading-tight max-w-[170px] truncate">
            <div className="flex items-center space-x-1">
              <span className="font-bold text-white text-xs truncate">
                {activeBrand}
              </span>
              {activeCompany?.isDefault && (
                <span className="text-[9px] px-1 py-0.2 rounded-md font-mono bg-[#11382C] text-[#C6A15B] border border-[#C6A15B]/30 shrink-0">
                  Demo
                </span>
              )}
            </div>
            <span className="text-[11px] text-white/70 block truncate">
              {activeName}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-white/70 group-hover:text-white transition-transform shrink-0 ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
            {/* Header info */}
            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-[#174A3A]" />
                <span>Pilih Perusahaan Aktif</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {companies.length} Perusahaan
              </span>
            </div>

            {/* List of Companies */}
            <div className="max-h-60 overflow-y-auto py-1 space-y-0.5 px-1.5">
              {companies.map((comp) => {
                const isActive = comp.id === activeCompany?.id;
                const compInitials = getInitials(comp.name);

                return (
                  <div
                    key={comp.id}
                    onClick={() => handleSelectCompany(comp)}
                    className={`group/item flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isActive
                        ? "bg-[#E1EDE6]/60 text-[#174A3A] font-semibold"
                        : "hover:bg-slate-100/80 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isActive
                            ? "bg-[#174A3A] text-white"
                            : "bg-slate-200 text-slate-700 group-hover/item:bg-[#C6A15B] group-hover/item:text-slate-900"
                        }`}
                      >
                        {compInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <p className="text-xs font-bold truncate">{comp.name}</p>
                          {comp.isDefault && (
                            <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-emerald-100 text-emerald-800 shrink-0">
                              Kasus Kuliah
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          Brand: {comp.brand} · {comp.city || "Jakarta"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {isActive ? (
                        <div className="w-5 h-5 rounded-full bg-[#174A3A] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : !comp.isDefault ? (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, comp)}
                          className="opacity-0 group-hover/item:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
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
            <div className="border-t border-slate-100 my-1 pt-1 px-1.5 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setCreateModalOpen(true);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-bold text-[#174A3A] hover:bg-[#E1EDE6]/50 rounded-xl transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-[#E1EDE6] text-[#174A3A] flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>Tambah Perusahaan Baru</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setEditModalOpen(true);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
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
