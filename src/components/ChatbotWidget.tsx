"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Bot, ChevronDown, RotateCcw, Send, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import type { ChatAction } from "@/lib/agent/websiteData";
import type { AgentProposal } from "@/lib/agent/proposals";
import { publishDataRefresh } from "./ui/useDataRefresh";
import styles from "./ChatbotWidget.module.css";

type Message = { id: string; role: "user" | "assistant"; text: string; tools?: string[]; asOf?: string; actions?: ChatAction[] };
const roleSuggestions: Record<string, string[]> = {
  HEAD_ADMIN: ["Buat briefing pekerjaan yang perlu saya tindak lanjuti", "Periksa stok dan usulkan rencana restock", "Tampilkan invoice yang masih harus ditagih"],
  SALES: ["Tampilkan order penjualan terbaru", "Bantu siapkan penawaran untuk pelanggan", "Tampilkan invoice yang masih harus ditagih"],
  PROCUREMENT: ["Periksa stok dan usulkan rencana restock", "Tampilkan PO terbaru", "Bantu siapkan RFQ untuk vendor"],
  WAREHOUSE: ["Buat briefing pekerjaan gudang", "Periksa stok di WH-JKT", "Bantu siapkan transfer stok ke kafe"],
  FINANCE: ["Invoice mana yang lewat jatuh tempo?", "Buat briefing pekerjaan Finance", "Berapa HPP dan laba kotor bulan ini?"],
  CASHIER: ["Tampilkan ringkasan sesi kasir saya", "Periksa stok di kafe", "Jelaskan langkah tutup sesi POS"],
};
const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function ChatbotWidget({ role, identity }: { role: string; identity: string }) {
  const storageKey = `aruna-chat:${identity}`;
  const [hydrated, setHydrated] = useState(false);
  const suggestions = roleSuggestions[role] || roleSuggestions.CASHIER;
  const [open, setOpen] = useState(false);
  const [service, setService] = useState('checking');
  const checkService = async () => {
    setService('checking');
    try { const r = await fetch('/api/chatbot/health', { cache: 'no-store' }); const d = await r.json(); setService(r.ok ? d.state : 'unknown'); } catch { setService('unknown'); }
  };
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [failedMessage, setFailedMessage] = useState("");
  const [proposals, setProposals] = useState<AgentProposal[]>([]);
  const [reviewId, setReviewId] = useState("");
  const [savingId, setSavingId] = useState("");
  const [proposalError, setProposalError] = useState("");
  const session = useRef("");
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const hintId = useId();

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (saved && saved.expiresAt > Date.now() && /^[0-9a-f-]{36}$/i.test(saved.sessionId) && Array.isArray(saved.messages)) {
        session.current = saved.sessionId;
        setMessages(saved.messages.filter((m:Message) => m && typeof m.id === "string" && ["user","assistant"].includes(m.role) && typeof m.text === "string").slice(-30));
      }
    } catch { /* Storage may be unavailable in private mode. */ }
    setHydrated(true);
  }, [storageKey]);
  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({sessionId:session.current,messages:messages.slice(-30),expiresAt:Date.now()+8*60*60*1000})); } catch {}
  }, [messages, hydrated, storageKey]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (open) { input.current?.focus(); void loadProposals(); void checkService(); }
  }, [open]);
  useEffect(() => {
    if (open && history.current) {
      history.current.scrollTop = messages.length || pending || error ? history.current.scrollHeight : 0;
    }
  }, [messages, pending, error, open, proposals]);

  async function loadProposals() {
    try {
      const response = await fetch("/api/agent/proposals", { cache: "no-store" });
      if (response.ok) { const data = await response.json(); setProposals(data.proposals || []); }
    } catch { /* A failed refresh does not discard an already visible review card. */ }
  }

  async function decide(proposal: AgentProposal, action: "execute" | "cancel") {
    if (savingId || pending) return;
    setSavingId(proposal.id); setProposalError("");
    try {
      const response = await fetch(`/api/agent/proposals/${proposal.id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fingerprint: proposal.fingerprint }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Proposal belum dapat diproses.");
      setProposals(previous => previous.map(p => p.id === proposal.id ? data.proposal : p));
      if(action === "execute") publishDataRefresh();
    } catch (cause) { setProposalError(cause instanceof Error ? cause.message : "Koneksi terputus. Coba kembali."); }
    finally { setSavingId(""); }
  }

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  function reset() {
    session.current = "";
    setMessages([]);
    setError("");
    setFailedMessage("");
    setDraft("");
    input.current?.focus();
  }

  async function send(text: string, retry = false) {
    const message = text.trim();
    if (!message || message.length > 4_000 || busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setFailedMessage("");
    if (!retry) {
      setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: "user", text: message }]);
      setDraft("");
    }
    session.current ||= crypto.randomUUID();
    const activeController = new AbortController();
    controller.current = activeController;
    const timeout = setTimeout(() => activeController.abort(), 220_000);
    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId: session.current, context: {path:window.location.pathname,resource:new URLSearchParams(window.location.search).get("type"),documentId:new URLSearchParams(window.location.search).get("id")} }),
        signal: activeController.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Pesan belum terkirim. Silakan coba lagi.");
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("Chatbot belum mengirim jawaban.");
      setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: "assistant", text: data.reply, tools: data.toolsUsed, asOf: data.asOf, actions: data.actions }]);
    } catch (cause) {
      setError(activeController.signal.aborted
        ? "Waktu tunggu habis. Silakan coba lagi."
        : cause instanceof Error ? cause.message : "Koneksi terputus. Silakan coba lagi.");
      setFailedMessage(message);
    } finally {
      clearTimeout(timeout);
      controller.current = null;
      busy.current = false;
      setPending(false);
      void loadProposals();
    }
  }

  return (
    <div className={styles.widget}>
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className={styles.panel}
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.stopPropagation(); close(); }
          }}
        >
          <header className={styles.header}>
            <span className={styles.avatar}><Bot size={25} aria-hidden="true" /></span>
            <div className={styles.heading}>
              <h2 id={titleId}>Aruna Assistant <Sparkles size={13} aria-hidden="true" /></h2>
              <p>Asisten kerja · {role.toLowerCase()}</p>
            </div>
            <button type="button" className={styles.headerButton} onClick={reset} disabled={pending || messages.length === 0} aria-label="Mulai percakapan baru" title="Percakapan baru"><RotateCcw size={17} aria-hidden="true" /></button>
            <button type="button" className={styles.headerButton} onClick={close} aria-label="Tutup chatbot"><X size={20} aria-hidden="true" /></button>
          </header>

          <div className={styles.history} ref={history}>
            <div className="mb-3 rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
              <div className="flex items-center justify-between gap-2"><span role="status">{service === 'ready' ? '● Layanan AI aktif' : service === 'offline' ? 'Layanan AI sedang offline' : service === 'checking' ? 'Memeriksa layanan AI…' : 'Status layanan belum terverifikasi'}</span><button className="text-indigo-700 font-semibold shrink-0" disabled={service === 'checking' || pending} onClick={() => void checkService()}>Cek ulang</button></div>
              {service === 'offline' && <p className="mt-1">Pencarian stok, pelanggan, pesanan, invoice, dan laporan tetap dapat digunakan. Untuk bantuan AI lanjutan, buka “Mulai Asisten ERP.command”, lalu cek ulang.</p>}
              <details className="mt-2"><summary className="cursor-pointer font-semibold text-slate-700">Apa yang bisa dibantu?</summary><p className="mt-2 leading-relaxed">Cari data sesuai hak akses, periksa stok dan dokumen, serta rangkum prioritas. Draft penawaran, pembelian, dan transfer perlu ditinjau sebelum disimpan.</p><p className="mt-2 leading-relaxed">Untuk menambah produk atau mengunduh invoice PDF, gunakan tombol di modul terkait.</p></details>
            </div>
            {messages.length === 0 && (
              <div className={styles.welcome}>
                <span className={styles.welcomeIcon}><Bot size={34} aria-hidden="true" /><Sparkles size={16} className={styles.sparkle} aria-hidden="true" /></span>
                <span className={styles.eyebrow}>ASISTEN RASA ARUNA</span>
                <h3>Halo! Ada yang bisa<br />saya bantu?</h3>
                <p>Periksa data, susun prioritas,<br />dan siapkan draft pekerjaan Anda.</p>
                <div className={styles.suggestions}>
                  {suggestions.map((suggestion) => (
                    <button type="button" key={suggestion} onClick={() => void send(suggestion)}>{suggestion}<ArrowUpRight size={16} aria-hidden="true" /></button>
                  ))}
                </div>
              </div>
            )}
            <div role="log" aria-label="Percakapan dengan Aruna Assistant" aria-live="polite" aria-relevant="additions" className={styles.messages}>
              {messages.map((message) => (
                <div key={message.id} className={`${styles.message} ${message.role === "user" ? styles.user : styles.assistant}`}>
                  {message.role === "assistant" && <span className={styles.miniAvatar}><Bot size={17} aria-hidden="true" /></span>}
                  <div>
                    <span className="sr-only">{message.role === "user" ? "Anda" : "Aruna Assistant"}: </span>
                    {message.role === "assistant" && message.tools?.length ? <p className={styles.sourceNote}>Sumber: data ERP · {message.asOf ? new Date(message.asOf).toLocaleTimeString("id-ID", {timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit"}) + " WIB" : "diperiksa saat menjawab"}</p> : null}
                    {message.role === "user" ? (
                      <p>{message.text}</p>
                    ) : (
                      <div className={styles.markdownBody}>
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                        {Array.isArray(message.actions) && message.actions.filter(action => /^\/(?:sales|purchase|inventory|accounting)\/|^\/pos(?:[?#]|$)/.test(action.href)).map(action => (
                          <Link key={action.id} href={action.href} className="mt-2 block rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
                            <span className="block text-xs font-semibold text-indigo-700">{action.department}</span>
                            <span className="block text-sm font-semibold">{action.title}</span>
                            <span className="block text-xs text-slate-700">{action.reason}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {proposals.length > 0 && <div className={styles.proposals} aria-label="Tinjauan draft pekerjaan">
              {proposals.map(proposal => <article key={proposal.id} className={styles.proposal}>
                <span className={styles.proposalLabel}>{proposal.status === "SAVED" ? "DRAFT TERSIMPAN" : proposal.status === "CANCELLED" ? "DIBATALKAN" : "PERLU DITINJAU"}</span>
                <h4>{proposal.title}</h4>
                <p>{proposal.partyName || `${proposal.sourceLocation} → ${proposal.destLocation}`}</p>
                <p>{proposal.lines.length} item{proposal.kind !== "transfer" && ` · ${rupiah(proposal.total)}`}</p>
                {proposal.status === "SAVED" && proposal.result && <Link className={styles.documentLink} href={proposal.result.href}>Buka {proposal.result.number} ↗</Link>}
                {proposal.status === "PENDING" && <>
                  <button type="button" className={styles.reviewButton} aria-expanded={reviewId === proposal.id} onClick={() => { setReviewId(reviewId === proposal.id ? "" : proposal.id); setProposalError(""); }}>{reviewId === proposal.id ? "Tutup rincian" : "Tinjau rincian"}</button>
                  {reviewId === proposal.id && <div className={styles.reviewDetails}>
                    <ul>{proposal.lines.map(line => <li key={line.productSku}><strong>{line.name}</strong><span>{line.productSku} · {line.quantity} unit</span>{proposal.kind !== "transfer" && <span>{rupiah(line.unitPrice)} / unit · diskon {line.discountPercent}%</span>}</li>)}</ul>
                    {proposal.kind !== "transfer" && <dl><div><dt>Subtotal</dt><dd>{rupiah(proposal.subtotal)}</dd></div><div><dt>PBJT</dt><dd>{rupiah(proposal.tax)}</dd></div><div><dt>Total</dt><dd>{rupiah(proposal.total)}</dd></div>{proposal.paymentTerms && <div><dt>Termin</dt><dd>{proposal.paymentTerms}</dd></div>}</dl>}
                    <p>Disimpan sebagai DRAFT untuk proses berikutnya di modul ERP. Berlaku sampai {new Date(proposal.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.</p>
                    <div className={styles.proposalActions}><button type="button" disabled={!!savingId || pending || Date.parse(proposal.expiresAt) < Date.now()} onClick={() => void decide(proposal, "execute")}>{savingId === proposal.id ? "Memproses…" : "Simpan draft"}</button><button type="button" disabled={!!savingId || pending} onClick={() => void decide(proposal, "cancel")}>Batalkan</button></div>
                    {proposalError && <p className={styles.proposalError} role="alert">{proposalError}</p>}
                  </div>}
                </>}
              </article>)}
            </div>}
            {pending && <><div className={styles.typing} role="status"><Bot size={18} aria-hidden="true" /><span aria-hidden="true"><i /><i /><i /></span><span className="sr-only">Aruna sedang memeriksa data</span></div><p className={styles.waitNote}>Aruna sedang membaca sumber data dan menyiapkan jawaban.</p></>}
            {error && <div className={styles.error}><p role="alert">{error}</p><button type="button" disabled={pending} onClick={() => void send(failedMessage, true)}><RotateCcw size={13} aria-hidden="true" /> Coba lagi</button></div>}
          </div>

          <footer className={styles.footer}>
            <form onSubmit={(event) => { event.preventDefault(); void send(draft); }} className={styles.composer}>
              <label className="sr-only" htmlFor={`${panelId}-input`}>Pesan untuk Aruna Assistant</label>
              <textarea
                ref={input}
                id={`${panelId}-input`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(draft); }
                }}
                placeholder="Apa yang ingin Anda kerjakan?"
                maxLength={4_000}
                rows={2}
                aria-describedby={hintId}
              />
              <button type="submit" disabled={!draft.trim() || pending} aria-label="Kirim pesan"><Send size={18} aria-hidden="true" /></button>
            </form>
            <p id={hintId}>Enter untuk kirim · Shift + Enter untuk baris baru</p>
          </footer>
        </section>
      )}
      <button
        ref={launcher}
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherOpen : ""}`}
        aria-label={open ? "Tutup chatbot" : "Buka chatbot Aruna Assistant"}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        onClick={() => open ? close() : setOpen(true)}
      >
        {open ? <ChevronDown size={26} aria-hidden="true" /> : <><Bot size={29} aria-hidden="true" /><span className={styles.badge}><Sparkles size={10} aria-hidden="true" /></span></>}
        {!open && <span className={styles.tooltip}>Tanya Aruna</span>}
      </button>
    </div>
  );
}
