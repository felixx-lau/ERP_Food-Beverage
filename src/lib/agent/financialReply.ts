import type { FinancialSummary } from '@/lib/financialSummary';

/** Report figures come directly from authorized posted journals for the selected period. */
export function financialReply(reports: FinancialSummary[]) {
  const rupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
  return reports.map(report => [
    `**Ringkasan keuangan seluruh outlet · ${report.period.start} sampai ${report.period.end} (WIB)**`,
    '',
    `- Pendapatan: ${rupiah(report.revenue)}`,
    `- Retur penjualan: ${rupiah(report.returns)}`,
    `- Pendapatan bersih: ${rupiah(report.netRevenue)}`,
    `- HPP: ${rupiah(report.cogs)}`,
    `- Laba kotor: ${rupiah(report.grossProfit)}`,
    `- Beban operasional: ${rupiah(report.operatingExpenses)}`,
    `- Beban lain dan penyesuaian: ${rupiah(report.otherExpenses)}`,
    `- Laba/rugi bersih: ${rupiah(report.profit)}`,
    '',
    `Sumber: [Laporan keuangan](/accounting/reports) · ${report.journalCount} jurnal terposting. Pendapatan di luar PBJT.`,
  ].join('\n')).join('\n\n');
}
