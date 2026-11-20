"use client";

import { useEffect, useRef, useState } from "react";
import DialogFrame from "@/components/ui/DialogFrame";
import { publishDataRefresh } from "@/components/ui/useDataRefresh";

type Lead = { id: string; name: string; contactId: string; expectedRevenue: number; stage: string; version: number; contact?: { name: string } };
type Props = { isOpen: boolean; onClose: () => void; onLeadCreated: (record?: Lead) => void; lead?: Lead };
type Customer = { id: string; name: string };

const stages = [
  ["NEW", "New"],
  ["QUALIFIED", "Qualified"],
  ["PROPOSITION", "Proposition"],
  ["WON", "Won"],
] as const;

const inputClass = "input-glass mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm";

export default function CreateLeadModal({ isOpen, ...props }: Props) {
  return isOpen ? <LeadForm key={props.lead?.id ?? "new"} {...props} /> : null;
}

function LeadForm({ lead, onClose, onLeadCreated }: Omit<Props, "isOpen">) {
  const [name, setName] = useState(lead?.name ?? "");
  const [contactId, setContactId] = useState(lead?.contactId ?? "");
  const [expectedRevenue, setExpectedRevenue] = useState(lead?.expectedRevenue ? String(lead.expectedRevenue) : "");
  const [stage, setStage] = useState(lead?.stage ?? "NEW");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const pending = useRef(false);
  const identity = useRef<{ body: string; key: string } | null>(null);
  const dirty = name !== (lead?.name ?? "") || contactId !== (lead?.contactId ?? "")
    || expectedRevenue !== (lead?.expectedRevenue ? String(lead.expectedRevenue) : "") || stage !== (lead?.stage ?? "NEW");
  const title = lead ? "Edit lead" : "Lead baru";

  useEffect(() => {
    const controller = new AbortController();
    setCatalogError("");
    setLoading(true);
    async function loadCustomers() {
      try {
        const response = await fetch("/api/master/options", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) setCustomers(data.customers ?? []);
      } catch {
        if (!controller.signal.aborted) setCatalogError("Daftar pelanggan belum dapat dimuat.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadCustomers();
    return () => controller.abort();
  }, [refresh]);

  const close = () => {
    if (!pending.current && (!dirty || window.confirm("Tutup tanpa menyimpan perubahan?"))) onClose();
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const body = JSON.stringify({
        name, contactId, expectedRevenue: Number(expectedRevenue || 0),
        ...(lead ? { version: lead.version, ...(stage !== lead.stage ? { stage } : {}) } : {}),
      });
      if (identity.current?.body !== body) identity.current = { body, key: crypto.randomUUID() };
      const path = lead ? `/api/crm/leads/${encodeURIComponent(lead.id)}` : "/api/crm/leads";
      const response = await fetch(path, {
        method: lead ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": identity.current.key },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lead belum dapat disimpan.");
      publishDataRefresh();
      onLeadCreated(data.lead);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Lead belum dapat disimpan.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <DialogFrame label={title} onClose={close}>
    <form onSubmit={submit} className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
      <header className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </header>
      <div className="space-y-4 px-5 py-5 sm:px-6">
        {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <label htmlFor="lead-name" className="block text-sm font-medium">Nama peluang
          <input id="lead-name" className={inputClass} value={name} maxLength={250} required disabled={busy}
            onChange={event => setName(event.target.value)} />
        </label>
        <div>
          <label htmlFor="lead-customer" className="block text-sm font-medium">Pelanggan
            <select id="lead-customer" className={inputClass} value={contactId} required disabled={busy || loading || !!catalogError}
              onChange={event => setContactId(event.target.value)}>
              <option value="">{loading ? "Memuat pelanggan…" : "Pilih pelanggan"}</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              {lead && !customers.some(customer => customer.id === lead.contactId) &&
                <option value={lead.contactId}>{lead.contact?.name ?? lead.contactId}</option>}
            </select>
          </label>
          {catalogError && <p role="alert" className="mt-1 text-sm text-rose-800">{catalogError} <button type="button" className="underline" onClick={() => setRefresh(value => value + 1)}>Coba lagi</button></p>}
          {!loading && !catalogError && !customers.length && <p className="mt-1 text-sm text-slate-600">Tambahkan pelanggan di menu Pelanggan & Vendor.</p>}
        </div>
        <label htmlFor="lead-revenue" className="block text-sm font-medium">Estimasi penjualan (Rp) <span className="font-normal text-slate-500">· opsional</span>
          <input id="lead-revenue" className={inputClass} type="number" step={1} min={0} disabled={busy}
            value={expectedRevenue} onChange={event => setExpectedRevenue(event.target.value)} />
        </label>
        {lead && <label htmlFor="lead-stage" className="block text-sm font-medium">Tahap
          <select id="lead-stage" className={inputClass} value={stage} disabled={busy} onChange={event => setStage(event.target.value)}>
            {stages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>}
      </div>
      <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
        <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Batal</button>
        <button className="btn-primary" disabled={busy || loading || !!catalogError || !contactId || !name.trim()}>
          {busy ? "Menyimpan…" : lead ? "Simpan perubahan" : "Simpan lead"}
        </button>
      </footer>
    </form>
  </DialogFrame>;
}
