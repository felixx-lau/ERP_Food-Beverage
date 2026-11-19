import { prisma } from './prisma';
import { BusinessError, quantity } from './validation';
import { businessDate, businessDayStart } from './businessDate';

/** Called inside the source operation's atomic transaction, before stock is reduced. */
export async function consumeLots(db: any, sku: string, location: string, qty: number, reference: string, dest?: string, explicitLot?: string) {
  quantity(qty);
  const product = await db.productVariant.findUniqueOrThrow({ where: { sku } });
  if (!product.trackLots) return [];
  const lots = await db.stockLot.findMany({ where: { productSku: sku, locationCode: location, onHand: { gt: 0 }, ...(explicitLot ? { id: explicitLot } : { expiresAt: { gte: businessDayStart(businessDate()) } }) }, orderBy: [{ expiresAt: 'asc' }, { receivedAt: 'asc' }, { id: 'asc' }] });
  if (lots.reduce((n: number, l: any) => n + l.onHand, 0) < qty) throw new BusinessError(`Batch layak pakai ${sku} tidak mencukupi di ${location}. Periksa kedaluwarsa dan alokasikan stok ke batch terlebih dahulu.`);
  let remaining = qty;
  const picks: { lotId: string; quantity: number; code: string }[] = [];
  for (const lot of lots) {
    const take = Math.min(remaining, lot.onHand); if (!take) break;
    await db.stockLot.update({ where: { id: lot.id }, data: { onHand: { decrement: take } } });
    await db.lotMovement.create({ data: { lotId: lot.id, quantity: -take, reference } });
    if (dest) {
      const target = await db.stockLot.upsert({ where: { productSku_locationCode_code: { productSku: sku, locationCode: dest, code: lot.code } }, create: { productSku: sku, locationCode: dest, code: lot.code, onHand: take, expiresAt: lot.expiresAt, receivedAt: lot.receivedAt, sourceRef: reference }, update: { onHand: { increment: take } } });
      if (new Date(target.expiresAt).getTime() !== new Date(lot.expiresAt).getTime()) throw new BusinessError('Kode batch tujuan mempunyai tanggal kedaluwarsa berbeda.');
      await db.lotMovement.create({ data: { lotId: target.id, quantity: take, reference } });
    }
    picks.push({ lotId: lot.id, quantity: take, code: lot.code }); remaining -= take;
  }
  return picks;
}

/** Returned food cannot be resold until QC assigns a valid batch: incoming remains unallocated. */
export async function ensureLotsForReduction(sku: string, location: string, qty: number, reference: string) {
  return consumeLots(prisma, sku, location, qty, reference);
}
