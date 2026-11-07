"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "primary" | "gold" | "sage" | "success" | "warning" | "danger" | "default";
  badgeText?: string;
  badgeVariant?: "success" | "warning" | "danger" | "default" | "gold" | "sage";
  trend?: {
    label: string;
    positive?: boolean;
    neutral?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "primary",
  badgeText,
  badgeVariant = "default",
  trend,
  onClick,
  className = "",
}: KPICardProps) {
  const iconVariants = {
    primary: "text-blue-700 bg-blue-600/10 border-blue-600/20",
    gold: "text-violet-700 bg-violet-600/15 border-violet-600/30",
    sage: "text-indigo-700 bg-indigo-600/10 border-indigo-600/20",
    success: "text-emerald-800 bg-emerald-500/15 border-emerald-500/30",
    warning: "text-amber-800 bg-amber-500/15 border-amber-500/30",
    danger: "text-rose-800 bg-rose-500/15 border-rose-500/30",
    default: "text-slate-800 bg-slate-100 border-slate-200",
  }[variant];

  const badgeVariants = {
    success: "glass-badge-success font-semibold",
    warning: "glass-badge-warning font-semibold",
    danger: "glass-badge-danger font-semibold",
    gold: "bg-violet-50 text-violet-700 border-violet-200 backdrop-blur-xs font-semibold",
    sage: "bg-blue-50 text-blue-700 border-blue-200 backdrop-blur-xs font-semibold",
    default: "glass-badge-default font-semibold",
  }[badgeVariant];

  return (
    <div
      data-tone={variant}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`surface-card kpi-card group rounded-2xl p-5  relative overflow-hidden ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconVariants}`}><Icon className="w-5 h-5" aria-hidden="true" /></div>
      </div>
      <p className="mt-3 text-[clamp(20px,1.7vw,28px)] font-semibold tracking-tight text-slate-900 break-words tabular-nums">{value}</p>
      {badgeText && <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[11px] border ${badgeVariants}`}>{badgeText}</span>}

      {(subtitle || trend) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between text-xs">
          {subtitle && (
            <span className="text-slate-500 leading-relaxed">
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                trend.neutral
                  ? "glass-badge-default"
                  : trend.positive
                  ? "glass-badge-success"
                  : "glass-badge-danger"
              }`}
            >
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
