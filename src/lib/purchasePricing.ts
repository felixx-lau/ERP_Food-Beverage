export type VendorPriceTier = {
  vendorId: string;
  productSku: string;
  minimumQty: number;
  price: number;
  currency: string;
  archivedAt?: unknown;
};

export function suggestedPurchasePrice(
  tiers: VendorPriceTier[], vendorId: string, sku: string, quantity: number, standardCost: number,
) {
  const tier = tiers.reduce<VendorPriceTier | undefined>((best, candidate) =>
    !candidate.archivedAt && candidate.currency === 'IDR' && candidate.vendorId === vendorId &&
    candidate.productSku === sku && candidate.minimumQty <= quantity &&
    (!best || candidate.minimumQty > best.minimumQty) ? candidate : best, undefined);
  return { amount: tier?.price ?? standardCost, source: tier ? 'VENDOR' as const : 'COST' as const };
}

export function purchasePriceLabel(source?: 'VENDOR' | 'COST' | 'MANUAL') {
  if (source === 'VENDOR') return 'Daftar harga vendor';
  if (source === 'COST') return 'Harga vendor belum tersedia. Saran memakai biaya standar.';
  if (source === 'MANUAL') return 'Harga kesepakatan yang Anda masukkan';
  return 'Harga tersimpan pada draft';
}
