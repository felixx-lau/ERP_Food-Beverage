import type { FinancialSummary } from '@/lib/financialSummary';
/** Report figures come directly from authorized posted journals, including their period. */
export function financialReply(reports: FinancialSummary[]) {
  const rupiah=(value:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
  return reports.map(r=>`**Ringkasan keuangan · ${r.period.start} sampai ${r.period.end} (WIB)**\n\n- Pendapatan: ${rupiah(r.revenue)}\n- Retur penjualan: ${rupiah(r.returns)}\n- Beban dan HPP: ${rupiah(r.expenses)}\n- Laba/rugi: ${rupiah(r.profit)}\n\nSumber: ${r.journalCount} jurnal posted dalam periode, tanpa jurnal pembukaan. Pendapatan tidak mencakup PBJT. Laba/rugi berbeda dari arus kas.`).join('\n\n');
}
