export type ProductChoice = { sku: string; name: string; size?: string; color?: string; unit?: string };
export function productChoiceLabel(product: ProductChoice) {
  return `${product.name} · ${[product.size, product.color].filter(Boolean).join(" / ")} — ${product.sku}`;
}
export function resolveProductChoice<T extends ProductChoice>(products: T[], input: string): T | undefined {
  const q = input.trim().toLowerCase();
  if (!q) return undefined;
  const exact = products.find(p => p.sku.toLowerCase() === q || productChoiceLabel(p).toLowerCase() === q);
  if (exact) return exact;
  const names = products.filter(p => p.name.toLowerCase() === q);
  return names.length === 1 ? names[0] : undefined;
}
