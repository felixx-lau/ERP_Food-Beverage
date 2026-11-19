'use client';
import React, { useState, useEffect } from 'react';
import ActionButton from './ui/ActionButton';
import StatusBadge from './StatusBadge';
import { statusLabel } from '@/lib/statusLabels';
import useTableView from './ui/useTableView';
import { TableSearch, TablePagination, SortLabel } from './ui/TableControls';
const number = (r: any) => r.orderNumber || r.poNumber || r.invoiceNumber || r.billNumber || r.deliveryNumber || r.receiptNumber || r.transferNumber || r.returnNumber || r.entryNumber || r.id;
const party = (r: any) => r.contact?.name || r.vendor?.name || r.customer?.name || r.sourceDocument || r.salesOrder?.orderNumber || r.purchaseOrder?.poNumber || '—';
const date = (r: any) => r.invoiceDate || r.billDate || r.orderDate || r.date || r.createdAt;
export default function DocumentList({ records, selectedId, onSelect, onClearSelection, loading = false }: { records: any[]; selectedId?: string; onSelect: (id: string) => void; onClearSelection?:()=>void; loading?: boolean }) {
  useEffect(() => { if (selectedId) { const url = new URL(window.location.href); url.searchParams.set('id', selectedId); window.history.replaceState(null, '', url); } }, [selectedId]);
  const [status, setStatus] = useState('ALL');
  const table = useTableView(records.filter(r => status === 'ALL' || (r.status || r.state) === status), r => `${number(r)} ${party(r)} ${r.salesOrder?.contact?.name || r.purchaseOrder?.vendor?.name || ''}`, (r, key) => key === 'number' ? number(r) : key === 'date' ? new Date(date(r)).getTime() : r.totalGross ?? r.total ?? 0);
  const formattedDate = (r: any) => date(r) ? new Date(date(r)).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : '—';
  const selected = records.find(r => r.id === selectedId);
  return <section aria-busy={loading} className="surface-card overflow-hidden">
    <div className="p-4 flex flex-wrap gap-3 items-center">
      <div className="mr-auto"><h2 className="font-semibold">Daftar dokumen</h2><p className="text-xs text-slate-500 mt-1">Pilih Detail untuk melihat isi dan langkah berikutnya.</p></div>
      <TableSearch value={table.query} onChange={table.setQuery} label="Cari nomor, mitra, atau sumber" />
      <select aria-label="Filter status dokumen" value={status} onChange={e => setStatus(e.target.value)} className="input-glass p-2 text-sm"><option value="ALL">Semua status</option>{Array.from(new Set(records.map(r => r.status || r.state).filter(Boolean))).map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
    </div>
    <div className="hidden sm:block overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50"><tr>
      <th scope="col" className="p-3"><SortLabel active={table.sort.key === 'number'} direction={table.sort.direction} onClick={() => table.toggleSort('number')}>Nomor</SortLabel></th>
      <th scope="col" className="p-3">Mitra / sumber</th><th scope="col" className="p-3">Status</th>
      <th scope="col" className="p-3"><SortLabel active={table.sort.key === 'date'} direction={table.sort.direction} onClick={() => table.toggleSort('date')}>Tanggal</SortLabel></th><th scope="col" className="p-3">Tindakan</th>
    </tr></thead><tbody>{table.rows.map(r => <tr key={r.id} className={`border-t ${r.id === selectedId ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
      <td className="p-3 font-mono text-xs">{number(r)}</td><td className="p-3">{party(r)}</td><td className="p-3"><StatusBadge status={r.status || r.state} /></td><td className="p-3 whitespace-nowrap">{formattedDate(r)}</td><td className="p-3"><ActionButton action="detail" aria-label={`Detail ${number(r)}`} aria-pressed={r.id === selectedId} onClick={() => onSelect(r.id)} /></td>
    </tr>)}</tbody></table></div>
    <div className="sm:hidden divide-y border-t border-slate-100">{table.rows.map(r => <article key={r.id} className={`p-4 space-y-2 ${r.id === selectedId ? 'bg-blue-50' : ''}`}>
      <div className="flex flex-wrap justify-between items-center gap-2"><strong className="text-sm break-all">{number(r)}</strong><StatusBadge status={r.status || r.state} /></div>
      <p className="text-sm text-slate-600 break-words">{party(r)}</p><div className="flex justify-between items-center gap-2"><span className="text-xs text-slate-500">{formattedDate(r)}</span><ActionButton action="detail" aria-label={`Detail ${number(r)}`} aria-pressed={r.id === selectedId} onClick={() => onSelect(r.id)} /></div>
    </article>)}</div>
    {!table.rows.length && <div role="status" className="p-6 text-center text-sm text-slate-600"><p>{loading ? 'Memuat dokumen…' : records.length ? 'Tidak ada dokumen yang cocok dengan pencarian atau filter.' : 'Belum ada dokumen. Dokumen baru akan muncul di sini setelah dibuat.'}</p>{!loading && (table.query || status !== 'ALL') && <button className="text-indigo-700 font-semibold mt-2" onClick={() => { table.setQuery(''); setStatus('ALL'); }}>Hapus pencarian dan filter</button>}</div>}
    <TablePagination {...table} onChange={table.setPage} />
    {selected && <p className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-600" role="status">Detail aktif: <strong className="text-slate-900">{number(selected)}</strong> · {party(selected)}{!table.rows.some(r => r.id === selectedId) && ' · Dokumen ini berada di luar hasil yang sedang ditampilkan.'}{onClearSelection&&<button className="ml-3 text-indigo-700 font-semibold underline min-h-9" onClick={()=>{const url=new URL(window.location.href);url.searchParams.delete('id');window.history.replaceState(null,'',url);onClearSelection();}}>Tutup detail</button>}</p>}
  </section>;
}
