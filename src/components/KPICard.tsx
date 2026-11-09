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
      className={`brand-card kpi-card group rounded-2xl p-5  relative overflow-hidden ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="kpi-label text-[13px] font-medium">{title}</p>
        <div className={`kpi-icon kpi-icon--${variant}`}><Icon className="w-5 h-5" aria-hidden="true" /></div>
      </div>
      <p className="kpi-value mt-3 font-semibold tracking-tight break-words tabular-nums">{value}</p>
      {badgeText && <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[11px] border ${badgeVariants}`}>{badgeText}</span>}

      {(subtitle || trend) && (
        <div className="kpi-footer mt-4 pt-3 border-t flex flex-wrap gap-2 items-center justify-between text-xs">
          {subtitle && (
            <span className="kpi-subtitle leading-relaxed">
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
