type Line = { productSku: string; quantity: number; deliveredQty: number; product?: { name?: string }; [key: string]: any };
type Order = { lines?: Line[]; invoices?: { status: string; lines?: { productSku: string; quantity: number }[] }[] };
export function invoiceChoices(order?: Order) {
  const allocated = new Map<string, number>();
  for (const invoice of order?.invoices || []) {
    if (invoice.status === 'CANCELLED') continue;
    for (const line of invoice.lines || []) {
      allocated.set(line.productSku, (allocated.get(line.productSku) ?? 0) + line.quantity);
    }
  }
  return (order?.lines || []).map(line => {
    const invoiced = allocated.get(line.productSku) ?? 0;
    return { ...line, invoiced, billable: Math.max(0, line.deliveredQty - invoiced) };
  });
}
export function validInvoiceQuantities(lines: ReturnType<typeof invoiceChoices>, quantities: Record<string, number>) {
  return lines.some(l => (quantities[l.productSku] ?? l.billable) > 0) && lines.every(l => { const q = quantities[l.productSku] ?? l.billable; return Number.isInteger(q) && q >= 0 && q <= l.billable; });
}
