"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Company {
  id: string;
  name: string;
  brand: string;
  dbFile: string;
  isDefault?: boolean;
  description?: string;
  city?: string;
  address?: string;
  currency?: string;
  taxRate?: number;
  createdAt: string;
}

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  loading: boolean;
  switchCompany: (companyId: string) => Promise<void>;
  createCompany: (data: {
    name: string;
    brand: string;
    city?: string;
    description?: string;
    adminName?: string;
    adminEmail?: string;
    adminPassword?: string;
    cloneMode?: "clean" | "sample";
  }) => Promise<void>;
  updateCompany: (data: Partial<Company>) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setActiveCompany(data.activeCompany || data.companies?.[0] || null);
      }
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const switchCompany = async (companyId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/companies/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to switch company:", err);
      setLoading(false);
    }
  };

  const createCompany = async (data: {
    name: string;
    brand: string;
    city?: string;
    description?: string;
    adminName?: string;
    adminEmail?: string;
    adminPassword?: string;
    cloneMode?: "clean" | "sample";
  }) => {
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Gagal membuat perusahaan.");
    }

    window.location.reload();
  };

  const updateCompany = async (data: Partial<Company>) => {
    if (!activeCompany) return;
    const res = await fetch("/api/companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeCompany.id, ...data }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Gagal memperbarui profil perusahaan.");
    }

    await fetchCompanies();
  };

  const deleteCompany = async (companyId: string) => {
    const res = await fetch(`/api/companies?id=${companyId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Gagal menghapus perusahaan.");
    }

    window.location.reload();
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompany,
        loading,
        switchCompany,
        createCompany,
        updateCompany,
        deleteCompany,
        refreshCompanies: fetchCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export const DEFAULT_COMPANY: Company = {
  id: "default",
  name: "PT Rasa Aruna Bersama",
  brand: "Rasa Aruna Kitchen",
  dbFile: "erp.db",
  isDefault: true,
  description: "Baseline Skenario Kuliah ERP F&B Group 03",
  city: "Jakarta",
  currency: "IDR",
  taxRate: 10,
  createdAt: "2026-10-20T00:00:00.000Z",
};

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    return {
      companies: [DEFAULT_COMPANY],
      activeCompany: DEFAULT_COMPANY,
      loading: false,
      switchCompany: async () => {},
      createCompany: async () => {},
      updateCompany: async () => {},
      deleteCompany: async () => {},
      refreshCompanies: async () => {},
    };
  }
  return context;
}
