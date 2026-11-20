type Receipt = {
  status: string;
  lines: { productSku: string; acceptedQty: number }[];
};
type Bill = {
  status: string;
  lines: { productSku: string; quantity: number }[];
};

export function vendorBillChoices<T extends { productSku: string }>(order?: {
  lines?: T[];
  receipts?: Receipt[];
  bills?: Bill[];
}) {
  const accepted = new Map<string, number>();
  const alreadyInBills = new Map<string, number>();
  for (const receipt of order?.receipts ?? []) {
    if (receipt.status !== 'DONE') continue;
    for (const line of receipt.lines) {
      accepted.set(line.productSku, (accepted.get(line.productSku) ?? 0) + line.acceptedQty);
    }
  }
  for (const bill of order?.bills ?? []) {
    if (bill.status === 'CANCELLED') continue;
    for (const line of bill.lines) {
      alreadyInBills.set(line.productSku, (alreadyInBills.get(line.productSku) ?? 0) + line.quantity);
    }
  }
  return (order?.lines ?? []).map(line => {
    const acceptedQty = accepted.get(line.productSku) ?? 0;
    return { ...line, acceptedQty, billable: Math.max(0, acceptedQty - (alreadyInBills.get(line.productSku) ?? 0)) };
  });
}
