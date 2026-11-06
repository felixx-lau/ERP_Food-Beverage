"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import PageTransition from "@/components/PageTransition";
import { CompanyProvider } from "@/context/CompanyContext";

interface AppLayoutProps {
  children: React.ReactNode;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  onSwitchRole?: (role: string, userId?: string) => Promise<void>;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  title?: string;
  subtitle?: string;
  wireframe?: string;
  actions?: React.ReactNode;
}

export default function AppLayout({
  children,
  currentUser: initialUser,
  onSwitchRole: initialSwitchRole,
  breadcrumbs,
  title,
  subtitle,
  wireframe,
  actions,
}: AppLayoutProps) {
  const [user, setUser] = useState(initialUser || null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);

  useEffect(() => {
    if (initialUser !== undefined) {
      setUser(initialUser);
    }
  }, [initialUser]);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else if (res.status === 401) {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
    }
  };

  useEffect(() => {
    if (!initialUser) {
      fetchSession();
    }
  }, []);

  const handleSwitchRole = async (targetRole: string, userId?: string) => {
    if (initialSwitchRole) {
      await initialSwitchRole(targetRole, userId);
      return;
    }

    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole, userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        window.location.reload();
      }
    } catch (err) {
      console.error("Role switch error:", err);
    }
  };

  const handleResetSuccess = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-transparent text-[var(--glass-text-primary)] flex">
      {/* Sidebar */}
      <Sidebar
        userRole={user?.role || "OWNER"}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          isCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        {/* Topbar */}
        <Topbar
          currentUser={user}
          onSwitchRole={handleSwitchRole}
          onOpenResetModal={() => setResetModalOpen(true)}
          onOpenAuditDrawer={() => setAuditDrawerOpen(true)}
          onOpenAppSwitcher={() => setAppSwitcherOpen(true)}
          onToggleMobileSidebar={() => setIsOpenMobile(!isOpenMobile)}
          breadcrumbs={breadcrumbs}
        />

        {/* Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-4">
          {/* Optional unified page header if title is passed */}
          {title && (
            <div className="bg-white/90 rounded-xl py-3 px-4 sm:px-5 sm:py-3.5 border border-slate-200/70 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--glass-text-primary)]">
                    {title}
                  </h1>
                  {wireframe && (
                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200">
                      {wireframe}
                    </span>
                  )}
                </div>
                {subtitle && (
                  <p className="text-xs text-[var(--glass-text-secondary)] font-medium">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
                  {actions}
                </div>
              )}
            </div>
          )}

          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Modals & Drawers */}
      <AppSwitcherModal
        isOpen={appSwitcherOpen}
        onClose={() => setAppSwitcherOpen(false)}
        userRole={user?.role}
      />

      <ResetSeedModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        currentUserRole={user?.role}
        userRole={user?.role}
        onSuccess={handleResetSuccess}
      />

      <AuditHistoryDrawer
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
    </div>
  );
}
