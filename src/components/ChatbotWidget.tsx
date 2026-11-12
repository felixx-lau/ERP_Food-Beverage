"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Bot, ChevronDown, RotateCcw, Send, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import styles from "./ChatbotWidget.module.css";

type Message = { id: string; role: "user" | "assistant"; text: string };
const suggestions = ["Bagaimana cara membuat sales order?", "Jelaskan alur pembelian barang", "Bagaimana cara memakai POS?"];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [failedMessage, setFailedMessage] = useState("");
  const session = useRef("");
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const hintId = useId();

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open && history.current) {
      history.current.scrollTop = messages.length || pending || error ? history.current.scrollHeight : 0;
    }
  }, [messages, pending, error, open]);

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
    const timeout = setTimeout(() => activeController.abort(), 65_000);
    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId: session.current }),
        signal: activeController.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Pesan belum terkirim. Silakan coba lagi.");
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("Chatbot belum mengirim jawaban.");
      setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: "assistant", text: data.reply }]);
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
              <p>Teman bantu untuk ERP Anda</p>
            </div>
            <button type="button" className={styles.headerButton} onClick={reset} disabled={pending || messages.length === 0} aria-label="Mulai percakapan baru" title="Percakapan baru"><RotateCcw size={17} aria-hidden="true" /></button>
            <button type="button" className={styles.headerButton} onClick={close} aria-label="Tutup chatbot"><X size={20} aria-hidden="true" /></button>
          </header>

          <div className={styles.history} ref={history}>
            {messages.length === 0 && (
              <div className={styles.welcome}>
                <span className={styles.welcomeIcon}><Bot size={34} aria-hidden="true" /><Sparkles size={16} className={styles.sparkle} aria-hidden="true" /></span>
                <span className={styles.eyebrow}>ASISTEN RASA ARUNA</span>
                <h3>Halo! Ada yang bisa<br />saya bantu?</h3>
                <p>Tanyakan seputar penggunaan ERP.<br />Kita mulai dari mana?</p>
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
                    {message.role === "user" ? (
                      <p>{message.text}</p>
                    ) : (
                      <div className={styles.markdownBody}>
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {pending && <div className={styles.typing} role="status"><Bot size={18} aria-hidden="true" /><span aria-hidden="true"><i /><i /><i /></span><span className="sr-only">Aruna sedang menyiapkan jawaban</span></div>}
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
                placeholder="Tulis pertanyaan Anda…"
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
