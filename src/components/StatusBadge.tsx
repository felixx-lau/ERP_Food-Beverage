"use client";

import React from "react";

export type StatusType =
  | "DRAFT"
  | "QUOTATION"
  | "CONFIRMED"
  | "SALE"
  | "DELIVERED"
  | "DONE"
  | "CANCELLED"
  | "PAID"
  | "PARTIAL"
  | "OVERDUE"
  | "WAITING"
  | "READY"
  | "INSPECTED"
  | "POSTED"
  | "OPEN"
  | "CLOSED"
  | "NEW"
  | "QUALIFIED"
  | "PROPOSITION"
  | "WON"
  | "LOST"
  | "SCRAP"
  | "APPROVED"
  | "PENDING"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md" | "lg";
  dot?: boolean;
}

export default function StatusBadge({
  status,
  label,
  size = "md",
  dot = true,
}: StatusBadgeProps) {
  const norm = String(status || "").toUpperCase();
  const displayLabel = label || status;

  // Determine translucent tinted glass styling based on semantic meaning
  let glassClass = "glass-badge-default";
  let dotColor = "bg-[#5C6A63]";

  if (
    [
      "CONFIRMED",
      "DELIVERED",
      "DONE",
      "PAID",
      "POSTED",
      "WON",
      "OPEN",
      "APPROVED",
      "QUALIFIED",
      "VALIDATED",
    ].includes(norm)
  ) {
    glassClass = "glass-badge-success";
    dotColor = "bg-emerald-500";
  } else if (
    [
      "WAITING",
      "PARTIAL",
      "IN_PROGRESS",

      "TO_APPROVE",
      "READY",
      "PENDING",
      "INSPECTION",
    ].includes(norm)
  ) {
    glassClass = "glass-badge-warning";
    dotColor = "bg-amber-500";
  } else if (
    [
      "CANCELLED",
      "REJECTED",
      "OVERDUE",
      "SCRAP",
      "DEFECTIVE",

      "LOST",
    ].includes(norm)
  ) {
    glassClass = "glass-badge-danger";
    dotColor = "bg-rose-500";
  } else if (
    ["NEW", "LEAD", "PROPOSITION", "TRANSFER", "INTERNAL"].includes(norm)
  ) {
    glassClass = "glass-badge-info";
    dotColor = "bg-blue-500";
  } else if (["ACTIVE", "PRIMARY", "OWNER"].includes(norm)) {
    glassClass = "glass-badge-success";
    dotColor = "bg-emerald-600";
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-xs",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${glassClass} ${sizeClasses} gap-1.5  select-none`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`}
        />
      )}
      <span className="truncate tracking-tight">{displayLabel}</span>
    </span>
  );
}
