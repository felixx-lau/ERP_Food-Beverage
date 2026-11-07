import React from "react";
export default function LoadingState({ label = "Memuat data…", cards = 4 }: { label?: string; cards?: number }) {
  return <div role="status" aria-live="polite" className="space-y-4"><span className="sr-only">{label}</span><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-hidden="true">{Array.from({ length: cards }, (_, i) => <div key={i} className="surface-card p-6 space-y-4"><div className="skeleton h-3 w-24" /><div className="skeleton h-8 w-32" /><div className="skeleton h-3 w-40" /></div>)}</div></div>;
}
