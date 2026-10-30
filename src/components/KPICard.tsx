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
    primary: "text-[#174A3A] bg-emerald-500/15 border-emerald-500/30",
    gold: "text-[#A88544] bg-amber-500/15 border-amber-500/30",
    sage: "text-[#174A3A] bg-emerald-600/15 border-emerald-600/30",
    success: "text-emerald-800 bg-emerald-500/15 border-emerald-500/30",
    warning: "text-amber-800 bg-amber-500/15 border-amber-500/30",
    danger: "text-rose-800 bg-rose-500/15 border-rose-500/30",
    default: "text-slate-800 bg-black/5 border-black/15",
  }[variant];

  const badgeVariants = {
    success: "glass-badge-success font-black",
    warning: "glass-badge-warning font-black",
    danger: "glass-badge-danger font-black",
    gold: "bg-amber-500/20 text-amber-950 border-amber-500/40 backdrop-blur-xs font-black",
    sage: "bg-emerald-500/20 text-emerald-950 border-emerald-500/40 backdrop-blur-xs font-black",
    default: "glass-badge-default font-black",
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
            <p className="text-xs font-black text-slate-800 tracking-wider uppercase">
              {title}
            </p>
            {badgeText && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeVariants}`}
              >
                {badgeText}
              </span>
            )}
          </div>
          <p className="text-2xl sm:text-3xl font-black tracking-tight text-[#0A110E]">
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
