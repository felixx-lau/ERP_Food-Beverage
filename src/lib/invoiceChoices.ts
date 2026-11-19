type Line = { productSku: string; quantity: number; deliveredQty: number; product?: { name?: string }; [key: string]: any };
type Order = { lines?: Line[]; invoices?: { status: string; lines?: { productSku: string; quantity: number }[] }[] };
export function invoiceChoices(order?: Order) {
  return (order?.lines || []).map(line => ({ ...line, billable: Math.max(0, line.deliveredQty - (order?.invoices || []).filter(i => i.status !== 'CANCELLED').reduce((sum, i) => sum + (i.lines || []).filter(l => l.productSku === line.productSku).reduce((n, l) => n + l.quantity, 0), 0)) }));
}
export function validInvoiceQuantities(lines: ReturnType<typeof invoiceChoices>, quantities: Record<string, number>) {
  return lines.some(l => (quantities[l.productSku] ?? l.billable) > 0) && lines.every(l => { const q = quantities[l.productSku] ?? l.billable; return Number.isInteger(q) && q >= 0 && q <= l.billable; });
}
