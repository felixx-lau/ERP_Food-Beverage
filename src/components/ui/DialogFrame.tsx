"use client";
import React, { useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";

/** Portal-backed dialog: escape, focus containment, scroll lock and focus return. */
export default function DialogFrame({ children, onClose, label = "Dialog", drawer = false, side = "right" }: { children: React.ReactNode; onClose: () => void; label?: string; drawer?: boolean; side?: "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = ref.current!;
    const heading = root.querySelector("h1,h2,h3");
    if (heading) { heading.id ||= id; root.setAttribute("aria-labelledby", heading.id); }
    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el => el.getClientRects().length);
    (focusable()[0] || root).focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close.current(); }
      if (e.key === "Tab") {
        const nodes = focusable(), first = nodes[0], last = nodes[nodes.length - 1];
        if (!first) { e.preventDefault(); root.focus(); }
        else if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    root.addEventListener("keydown", keydown);
    const siblings = Array.from(document.body.children).filter(el => el !== root.parentElement && el instanceof HTMLElement) as HTMLElement[];
    const inertStates = siblings.map(el => el.inert);
    siblings.forEach(el => { el.inert = true; });
    return () => { root.removeEventListener("keydown", keydown); document.body.style.overflow = overflow; siblings.forEach((el, i) => { el.inert = inertStates[i]; }); previous?.focus(); };
  }, [id]);
  return createPortal(<div data-side={drawer ? side : undefined} className={`dialog-backdrop ${drawer ? "dialog-drawer" : ""}`} onMouseDown={e => { if (e.target === e.currentTarget) close.current(); }}><div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className="dialog-frame" onMouseDown={e => { if (e.target === e.currentTarget) close.current(); }}>{children}</div></div>, document.body);
}
