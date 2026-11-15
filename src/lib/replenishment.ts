import type { PrismaClient } from "@prisma/client";
import { BusinessError } from "./validation";
import { STOCK_POLICY, availableStock } from "./stockPolicy";
import { businessDate, businessDayEnd } from "./businessDate";

export async function replenishmentPlan(db: PrismaClient, args: { location?: string; query?: string; threshold?: number; target?: number; horizonDays?: number; limit?: number } = {}) {
  const threshold = args.threshold ?? STOCK_POLICY.minimum, target = args.target ?? STOCK_POLICY.target, horizonDays = args.horizonDays ?? STOCK_POLICY.horizonDays;
  if (!Number.isInteger(threshold) || !Number.isInteger(target) || threshold < 0 || target <= threshold || target > 100_000) throw new BusinessError("Target harus melebihi batas minimum, maksimal 100.000 unit.");
  if (!Number.isInteger(horizonDays) || horizonDays < 0 || horizonDays > 90) throw new BusinessError("Horizon perencanaan 0–90 hari.");
  const location = args.location || "WH-JKT", take = args.limit ?? 5;
  if (!Number.isInteger(take) || take < 1 || take > 20) throw new BusinessError("Batas hasil 1–20.");
  if (!await db.warehouseLocation.findFirst({ where: { code: location, archivedAt: null } })) throw new BusinessError("Lokasi tidak terdaftar.");
  const until = businessDayEnd(businessDate(new Date(Date.now() + horizonDays * 86_400_000)));
  const products = await db.productVariant.findMany({ where: { archivedAt: null, ...(args.query ? { OR: [{ sku: { contains: args.query } }, { name: { contains: args.query } }] } : {}) }, orderBy: { sku: "asc" }, select: { sku: true, name: true, defaultVendorId: true, stockLevels: { where: { location: { archivedAt: null } }, select: { locationCode: true, onHand: true, reserved: true } } } });
  const low = products.map(p => ({ ...p, stock: p.stockLevels.find(s => s.locationCode === location) || { onHand: 0, reserved: 0 } })).filter(p => availableStock(p.stock) < threshold);
  const items = await Promise.all(low.slice(0, take).map(async p => {
    const receipts = await db.goodsReceipt.findMany({ where: { destLocation: location, status: { in: ["DRAFT", "CONFIRMED"] }, scheduledDate: { lte: until }, purchaseOrder: { status: "CONFIRMED" }, lines: { some: { productSku: p.sku } } }, orderBy: [{ scheduledDate: "asc" }, { id: "asc" }], select: { receiptNumber: true, scheduledDate: true, purchaseOrderId: true, lines: { where: { productSku: p.sku }, select: { demandQty: true } } } });
    const outstanding = await db.purchaseOrderLine.findMany({ where: { productSku: p.sku, purchaseOrderId: { in: receipts.map(r => r.purchaseOrderId) } }, select: { purchaseOrderId: true, orderedQty: true, receivedQty: true } });
    const remaining = new Map(outstanding.map(l => [l.purchaseOrderId, Math.max(0, l.orderedQty - l.receivedQty)]));
    const inbound = receipts.map(r => {
      const quantity = Math.min(remaining.get(r.purchaseOrderId) || 0, r.lines.reduce((n, l) => n + l.demandQty, 0));
      remaining.set(r.purchaseOrderId, (remaining.get(r.purchaseOrderId) || 0) - quantity);
      return { receiptNumber: r.receiptNumber, expectedAt: r.scheduledDate, quantity };
    }).filter(r => r.quantity > 0);
    const openPurchaseQty = inbound.reduce((n, r) => n + r.quantity, 0), available = availableStock(p.stock);
    return { sku: p.sku, name: p.name, onHand: p.stock.onHand, reserved: p.stock.reserved, available, defaultVendorId: p.defaultVendorId, openPurchaseQty, suggestedQty: Math.max(0, target - available - openPurchaseQty), inbound, transferOptions: p.stockLevels.filter(s => s.locationCode !== location && availableStock(s) > 0).map(s => ({ location: s.locationCode, available: availableStock(s) })) };
  }));
  return { asOf: new Date().toISOString(), location, planningAssumption: { threshold, target, horizonDays, expectedBy: until.toISOString(), trigger: "available < threshold" }, matched: low.length, hasMore: low.length > take, items, note: "Hanya sisa penerimaan aktif menuju lokasi ini dalam horizon rencana yang dihitung. ETA adalah jadwal, bukan jaminan kedatangan. Opsi transfer belum dialokasikan; tinjau sebelum menyiapkan draft." };
}
