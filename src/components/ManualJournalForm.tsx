'use client';

import React, { useRef, useState } from 'react';
import DialogFrame from './ui/DialogFrame';
import MasterRecordEditor from './MasterRecordEditor';

type Line = { accountCode: string; debit: number; credit: number };
const emptyLine = (): Line => ({ accountCode: '', debit: 0, credit: 0 });
const rupiah = (value: number) => `Rp${value.toLocaleString('id-ID')}`;
const sourceAccounts = ['1020', '1030', '1040', '2010', '2020'];

export default function ManualJournalForm({ onPosted }: { onPosted: (record: any) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const pending = useRef(false);
  const keys = useRef(new Map<string, string>());
  const debit = lines.reduce((sum, line) => sum + line.debit, 0);
  const credit = lines.reduce((sum, line) => sum + line.credit, 0);
  const validLines = lines.every(line => line.accountCode && Number.isSafeInteger(line.debit) && Number.isSafeInteger(line.credit) && line.debit >= 0 && line.credit >= 0 && ((line.debit > 0) !== (line.credit > 0)));
  const balanced = debit > 0 && debit === credit;
  const dirty = !!reason || lines.some(line => line.accountCode || line.debit || line.credit);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      let page = 1, pages = 1;
      const records: any[] = [];
      do {
        const response = await fetch(`/api/master/accounts?limit=100&page=${page}&status=active`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Daftar akun gagal dimuat.');
        records.push(...(data.records || []));
        pages = data.pages || 1;
        page++;
      } while (page <= pages);
      setAccounts(records.filter(account => !sourceAccounts.includes(account.code) && !account.archivedAt));
    } catch (e) { setError(e instanceof Error ? e.message : 'Daftar akun gagal dimuat.'); }
    finally { setLoadingAccounts(false); }
  };
  const close = () => {
    if (!pending.current && (!dirty || window.confirm('Tutup jurnal yang belum diposting? Isian tetap tersedia saat dibuka kembali.'))) setOpen(false);
  };
  const changeLine = (index: number, patch: Partial<Line>) => setLines(current => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current || !validLines || !balanced || !reason.trim()) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const input = { action: 'journal', reason: reason.trim(), lines };
      const fingerprint = JSON.stringify(input);
      if (!keys.current.has(fingerprint)) keys.current.set(fingerprint, crypto.randomUUID());
      const response = await fetch('/api/accounting/corrections', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': keys.current.get(fingerprint)! }, body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Jurnal gagal diposting.');
      setOpen(false); setReason(''); setLines([emptyLine(), emptyLine()]); keys.current.clear();
      await onPosted(data.record);
    } catch (e) { setError(e instanceof Error ? e.message : 'Jurnal gagal diposting.'); }
    finally { pending.current = false; setBusy(false); }
  };

  return <>
    <button className="btn-primary" onClick={() => { setError(''); setOpen(true); void loadAccounts(); }}>+ Jurnal umum</button>
    {creatingAccount && <MasterRecordEditor resource="accounts" onClose={() => { setCreatingAccount(false); setOpen(true); }} onSaved={async account => {
      setCreatingAccount(false); setOpen(true); await loadAccounts();
      setLines(current => { const index = current.findIndex(line => !line.accountCode); return current.map((line, i) => i === index ? { ...line, accountCode: account.code } : line); });
    }} />}
    {open && <DialogFrame onClose={close} label="Jurnal umum"><form onSubmit={save} className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90dvh] overflow-y-auto space-y-5">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">Jurnal umum</h2><button type="button" disabled={busy} className="btn-secondary" onClick={() => { setOpen(false); setCreatingAccount(true); }}>+ Akun baru</button></div>
      <p className="text-sm text-slate-500">Pilih akun dan isi debit atau kredit pada setiap baris. Gunakan jurnal umum untuk modal, biaya operasional, dan transaksi umum perusahaan.</p>
      {error && <p role="alert" className="text-rose-800 bg-rose-50 p-3 rounded-xl">{error}</p>}
      <label className="text-sm block">Keterangan / referensi<input required maxLength={1000} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} className="input-glass w-full p-2 mt-1" placeholder="Contoh: pembayaran biaya listrik November" /></label>
      <fieldset disabled={busy || loadingAccounts} className="space-y-3">
        {lines.map((line, index) => <div key={index} className="grid sm:grid-cols-[2fr_1fr_1fr_auto] gap-3 border-b pb-3 items-end">
          <label className="text-sm">Akun<select required aria-label={`Akun baris ${index + 1}`} value={line.accountCode} className="input-glass w-full p-2 mt-1" onChange={event => changeLine(index, { accountCode: event.target.value })}><option value="">{loadingAccounts ? 'Memuat akun…' : 'Pilih akun…'}</option>{accounts.map(account => <option value={account.code} key={account.code}>{account.code} · {account.name}</option>)}</select></label>
          {(['debit', 'credit'] as const).map(field => <label className="text-sm" key={field}>{field === 'debit' ? 'Debit' : 'Kredit'} (Rp)<input aria-label={`${field === 'debit' ? 'Debit' : 'Kredit'} baris ${index + 1}`} min={0} step={1} required type="number" value={line[field]} className="input-glass w-full p-2 mt-1" onChange={event => changeLine(index, { [field]: Number(event.target.value) })} /></label>)}
          <button type="button" className="btn-secondary" aria-label={`Hapus baris ${index + 1}`} disabled={lines.length <= 2} onClick={() => setLines(current => current.filter((_, i) => i !== index))}>Hapus</button>
        </div>)}
      </fieldset>
      <div className="flex flex-wrap justify-between gap-3"><button type="button" className="btn-secondary" disabled={busy || lines.length >= 100} onClick={() => setLines(current => [...current, emptyLine()])}>+ Tambah baris</button><button type="button" className="btn-secondary" disabled={busy || loadingAccounts} onClick={() => void loadAccounts()}>Muat ulang akun</button></div>
      <dl className="grid sm:grid-cols-3 gap-4 text-sm"><div><dt>Total debit</dt><dd className="font-semibold">{rupiah(debit)}</dd></div><div><dt>Total kredit</dt><dd className="font-semibold">{rupiah(credit)}</dd></div><div><dt>Selisih</dt><dd className={balanced ? 'text-emerald-800 font-semibold' : 'text-amber-800 font-semibold'} role="status">{rupiah(Math.abs(debit - credit))} · {balanced ? 'Seimbang' : 'Belum seimbang'}</dd></div></dl>
      <p className="text-sm text-slate-500">Piutang, utang usaha, persediaan, GRNI, dan PBJT dicatat melalui transaksi sumber. Jurnal yang sudah diposting dikoreksi dengan reversal.</p>
      <div className="flex justify-end gap-3 border-t pt-4"><button type="button" className="btn-secondary" disabled={busy} onClick={close}>Batal</button><button className="btn-primary" disabled={busy || loadingAccounts || !reason.trim() || !balanced || !validLines}>{busy ? 'Memproses…' : 'Posting jurnal'}</button></div>
    </form></DialogFrame>}
  </>;
}
