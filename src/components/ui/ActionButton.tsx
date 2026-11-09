"use client";

import React from "react";
import { Archive, ArchiveRestore, Eye, LoaderCircle, Pencil, Trash2 } from "lucide-react";

const icons = { detail: Eye, edit: Pencil, archive: Archive, restore: ArchiveRestore, delete: Trash2 };
const labels = { detail: "Detail", edit: "Edit", archive: "Arsipkan", restore: "Pulihkan", delete: "Hapus" };
type Action = keyof typeof icons;

export default function ActionButton({ action, loading = false, children, className = "", disabled, ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { action: Action; loading?: boolean }) {
  const Icon = loading ? LoaderCircle : icons[action];
  const variant = action === "delete" ? "danger" : ["archive", "restore"].includes(action) ? "secondary" : "brand";
  return <button {...props} type={props.type ?? "button"} disabled={disabled || loading} aria-busy={loading || undefined}
    className={`action-button action-button--${variant} ${className}`}>
    <Icon aria-hidden="true" className={loading ? "animate-spin" : undefined} />
    <span>{loading ? "Memproses…" : children ?? labels[action]}</span>
  </button>;
}
