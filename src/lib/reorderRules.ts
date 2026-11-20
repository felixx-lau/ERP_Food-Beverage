import type { Prisma } from '@prisma/client';
import { businessDayStart } from './businessDate';
import { getNextSequence } from './sequences';

export async function ruleAvailability(db: Prisma.TransactionClient, productSku: string, locationCode: string, trackLots: boolean) {
  const stock = await db.stockLevel.findUnique({ where: { productSku_locationCode: { productSku, locationCode } } });
  const physical = stock?.onHand ?? 0;
  const validLots = trackLots ? await db.stockLot.aggregate({
    where: { productSku, locationCode, expiresAt: { gte: businessDayStart() } },
    _sum: { onHand: true },
  }) : null;
  return Math.min(physical, validLots ? validLots._sum.onHand ?? 0 : physical) - (stock?.reserved ?? 0);
}

/** Runs inside the inventory writer transaction so simultaneous changes cannot open duplicate requests. */
export async function evaluateReorderRules(db: Prisma.TransactionClient) {
  const rules = await db.reorderRule.findMany({ where: { active: true } });
  for (const rule of rules) {
    const { productSku, locationCode, minimum, target } = rule;
    const product = await db.productVariant.findFirst({ where: { sku: productSku, archivedAt: null } });
    if (!product || !await db.warehouseLocation.count({ where: { code: locationCode, archivedAt: null } })) continue;
    if (await db.recipe.count({ where: { productSku, active: true, mode: 'BACKFLUSH' } })) continue;

    const available = await ruleAvailability(db, productSku, locationCode, product.trackLots);
    if (available > minimum) continue;
    if (await db.purchaseRequest.count({ where: { productSku, locationCode, status: { in: ['PENDING','APPROVED'] } } })) continue;

    const converted = await db.purchaseRequest.findMany({
      where: { productSku, locationCode, status: 'CONVERTED', purchaseOrderId: { not: null } },
      select: { purchaseOrderId: true },
    });
    const orderIds = converted.flatMap(request => request.purchaseOrderId ? [request.purchaseOrderId] : []);
    if (orderIds.length && await db.purchaseOrder.count({ where: {
      id: { in: orderIds },
      OR: [
        { status: 'DRAFT' },
        { status: 'CONFIRMED', lines: { some: { productSku, receivedQty: { lt: db.purchaseOrderLine.fields.orderedQty } } },
          OR: [{ receipts: { none: {} } }, { receipts: { some: { destLocation: locationCode, status: { in: ['DRAFT','CONFIRMED'] } } } }] },
      ],
    } })) continue;

    const receipts = await db.goodsReceiptLine.aggregate({
      where: { productSku, receipt: {
        destLocation: locationCode, status: { in: ['DRAFT','CONFIRMED'] }, purchaseOrder: { status: 'CONFIRMED' },
      } },
      _sum: { demandQty: true },
    });
    const incoming = receipts._sum.demandQty ?? 0;
    const amount = Math.min(100000000, target - available - incoming);
    if (amount <= 0) continue;
    const request = await db.purchaseRequest.create({ data: {
      number: await getNextSequence('PR', db), productSku, locationCode, quantity: amount, requestedBy: 'SYSTEM_REORDER',
      reason: `Stok tersedia ${available} ${product.unit}, minimum ${minimum}, target ${target}, dan ${incoming} sedang dipesan untuk lokasi ini.`,
    } });
    await db.auditLog.create({ data: {
      actorName: 'Aturan stok otomatis', actorRole: 'HEAD_ADMIN', action: 'GENERATE_PURCHASE_REQUEST',
      documentType: 'PURCHASE_REQUEST', documentId: request.id, notes: request.reason,
    } });
  }
}
