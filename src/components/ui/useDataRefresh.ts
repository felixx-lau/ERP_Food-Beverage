"use client";
import { useEffect, useRef } from "react";
const company = () => decodeURIComponent(document.cookie.split("; ").find(c => c.startsWith("rasa_aruna_company="))?.split("=").slice(1).join("=") || "default");
export function publishDataRefresh() {
  window.dispatchEvent(new Event("aruna:data-refresh"));
  if (typeof BroadcastChannel !== "undefined") { const channel = new BroadcastChannel("aruna-data"); channel.postMessage({ companyId: company() }); channel.close(); }
}
export default function useDataRefresh(refresh: () => Promise<unknown>, intervalMs = 15_000) {
  const latest = useRef(refresh); latest.current = refresh;
  useEffect(() => {
    let running = false, stopped = false;
    const update = async () => {
      if (document.visibilityState === "hidden" || running || stopped) return;
      running = true;
      try { await latest.current(); } catch { /* Pages display their own refresh error. */ } finally { running = false; }
    };
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("aruna-data") : null;
    if (channel) channel.onmessage = event => { if (event.data?.companyId === company()) void update(); };
    window.addEventListener("focus", update); window.addEventListener("aruna:data-refresh", update); document.addEventListener("visibilitychange", update);
    const timer = window.setInterval(update, intervalMs);
    return () => { stopped = true; clearInterval(timer); channel?.close(); window.removeEventListener("focus", update); window.removeEventListener("aruna:data-refresh", update); document.removeEventListener("visibilitychange", update); };
  }, [intervalMs]);
}
