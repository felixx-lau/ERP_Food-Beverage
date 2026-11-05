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
      onClick={onClick}
      className={`glass-2 glass-2-interactive group rounded-2xl p-5 border border-white/70 shadow-glass-2 relative overflow-hidden ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
              {title}
            </p>
            {badgeText && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeVariants}`}
              >
                {badgeText}
              </span>
            )}
          </div>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        
        {/* Glass Icon Bubble with Hover Scale */}
        <div className={`w-11 h-11 rounded-2xl glass-3 flex items-center justify-center border shadow-xs flex-shrink-0 group-hover:scale-115 transition-transform duration-300 ${iconVariants}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs">
          {subtitle && (
            <span className="text-slate-700 font-semibold truncate">
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
