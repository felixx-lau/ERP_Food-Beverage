/** Shared pilot defaults. Explicit planning overrides remain visible as assumptions. */
export const STOCK_POLICY = { minimum: 20, target: 30, horizonDays: 14 } as const;
export function availableStock(stock: { onHand: number; reserved: number }) { return stock.onHand - stock.reserved; }
export function stockAttention(stock: { onHand: number; reserved: number }, minimum: number = STOCK_POLICY.minimum) { return availableStock(stock) < minimum; }
