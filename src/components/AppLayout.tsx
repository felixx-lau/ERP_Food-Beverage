"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import AppSwitcherModal from "@/components/AppSwitcherModal";
import ResetSeedModal from "@/components/ResetSeedModal";
import AuditHistoryDrawer from "@/components/AuditHistoryDrawer";
import PageTransition from "@/components/PageTransition";
import ChatbotWidget from "@/components/ChatbotWidget";
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
  useEffect(() => { try { setIsCollapsed(localStorage.getItem("erp-sidebar-collapsed") === "true"); } catch {} }, []);
  const toggleSidebar = () => { setIsCollapsed(prev => { try { localStorage.setItem("erp-sidebar-collapsed", String(!prev)); } catch {} return !prev; }); };
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
    <div className="app-shell min-h-screen flex">
      <a href="#main-content" className="skip-link">Lewati navigasi</a>
      {/* Sidebar */}
      <Sidebar
        userRole={user?.role || ""}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleSidebar}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          isCollapsed ? "lg:pl-20" : "lg:pl-[272px]"
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
        <main id="main-content" tabIndex={-1} className="app-main flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Optional unified page header if title is passed */}
          {title && (
            <div className="page-heading flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-[var(--glass-text-primary)]">
                    {title}
                  </h1>

                </div>
                {subtitle && (
                  <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">
                    {subtitle.replace(/\s*\((?:Fitur |F-|SR-|S-)\S*[^)]*\)/g, "")}
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
      {user && <ChatbotWidget key={`${user.id}:${user.role}`} />}
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
