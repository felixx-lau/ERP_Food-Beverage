'use client';

import { useRef, useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';

export default function InvoicePdfButton({ invoiceId }: { invoiceId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function download() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/accounting/invoices/${encodeURIComponent(invoiceId)}/pdf`, { cache: 'no-store' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'PDF gagal diunduh. Coba kembali.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'Invoice.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Koneksi terputus. Coba kembali.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return <div className="flex flex-col items-end gap-2">
    <button className="btn-secondary" onClick={() => void download()} disabled={busy} aria-busy={busy}>
      {busy ? <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4" aria-hidden="true" />}
      {busy ? 'Menyiapkan PDF…' : 'Unduh PDF'}
    </button>
    {error && <p role="alert" className="text-sm text-rose-700 max-w-sm">{error}</p>}
  </div>;
}
