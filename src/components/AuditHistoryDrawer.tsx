"use client";

import React, { useEffect, useState } from "react";
import { X, Shield, Clock, FileText, RefreshCw, User } from "lucide-react";

interface AuditHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuditLogItem {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  documentType: string;
  documentId: string;
  notes?: string;
  beforeState?: string;
  afterState?: string;
  timestamp: string;
}

export default function AuditHistoryDrawer({ isOpen, onClose }: AuditHistoryDrawerProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit/logs?limit=30");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl glass-modal h-full shadow-glass-modal flex flex-col border-l border-white/80 animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="bg-white/40 px-5 py-4 flex items-center justify-between border-b border-black/5">
          <div className="flex items-center space-x-2.5 text-slate-900">
            <Shield className="w-5 h-5 text-[#174A3A]" />
            <div>
              <h3 className="font-black text-sm text-slate-900">Audit Trail & Security History (SR-15 / F-21)</h3>
              <p className="text-[11px] text-slate-700 font-semibold">
                Pencatatan aktor, role, timestamp, aksi, dan status dokumen
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLogs}
              title="Refresh Logs"
              className="p-1.5 hover:bg-white/80 rounded-xl text-slate-700 hover:text-slate-900 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/80 rounded-xl text-slate-700 hover:text-slate-900 transition-colors shadow-xs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/20">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-600 font-semibold text-xs">
              {loading ? "Memuat catatan audit..." : "Belum ada catatan audit."}
            </div>
          ) : (
            logs.map((log) => {
              const isDenied = log.action.includes("DENIED") || log.action.includes("REJECT");
              const isSeed = log.documentType === "SEED";

              return (
                <div
                  key={log.id}
                  className={`glass-3 rounded-2xl p-4 border shadow-xs text-xs space-y-2.5 transition-all hover:border-[#174A3A]/40 ${
                    isDenied
                      ? "border-rose-500/40 bg-rose-500/10"
                      : isSeed
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-white/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono font-black text-[10px] ${
                          isDenied
                            ? "glass-badge-danger"
                            : "glass-badge-success"
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="font-black text-slate-900">
                        {log.documentType} / {log.documentId}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-slate-700 font-bold text-[10px]">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.timestamp).toLocaleTimeString("id-ID")}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-slate-800">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-slate-600" />
                      <span className="font-black text-slate-900">{log.actorName}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-white/70 rounded-full text-[10px] font-mono font-bold text-[#174A3A] border border-white/60">
                      {log.actorRole}
                    </span>
                  </div>

                  {log.notes && (
                    <p className="text-slate-800 font-semibold bg-white/60 p-3 rounded-xl border border-white/70 text-[11px] leading-relaxed">
                      {log.notes}
                    </p>
                  )}

                  {log.afterState && (
                    <details className="text-[10px] text-slate-700 cursor-pointer">
                      <summary className="font-mono text-[#174A3A] font-black hover:underline">
                        Lihat Snapshot State
                      </summary>
                      <pre className="mt-1.5 p-2.5 bg-[#151A18] text-[#C4DBD0] rounded-xl overflow-x-auto font-mono text-[9px]">
                        {log.afterState}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
