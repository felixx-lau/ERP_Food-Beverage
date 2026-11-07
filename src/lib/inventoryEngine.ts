import { prisma } from './prisma';
import { atomic } from './atomic';
import { Actor, permit, quantity, textValue } from './validation';
import { recordAuditLog } from './audit';
import { getNextSequence } from './sequences';

export async function adjustStock(input: { sku: string; locationCode: string; newOnHand: number; reason: string; actor: Actor }) {
  permit(input.actor, ['OWNER','WAREHOUSE']); quantity(input.newOnHand, true);
  const reason = textValue(input.reason, 'Alasan penyesuaian', true, 1000);
  return atomic(async () => {
    const location = await prisma.warehouseLocation.findUnique({ where: { code: input.locationCode } });
    const product = await prisma.productVariant.findUnique({ where: { sku: input.sku } });
    if (!location || !product) throw new Error('SKU atau lokasi tidak ditemukan.');
    const existing = await prisma.stockLevel.findUnique({ where: { productSku_locationCode: { productSku: input.sku, locationCode: input.locationCode } } });
    const before = existing?.onHand ?? 0, reserved = existing?.reserved ?? 0;
    if (input.newOnHand < reserved) throw new Error('Penyesuaian tidak boleh mengonsumsi stok reserved (SR-04).');
    const delta = input.newOnHand - before;
    if (!delta) return { stock: existing, message: 'Tidak ada perubahan stok.' };
    const reference = `ADJ/${new Date().getFullYear()}/${crypto.randomUUID()}`;
    const value = Math.abs(delta) * product.standardCost;
    const stock = await prisma.stockLevel.upsert({ where: { productSku_locationCode: { productSku: input.sku, locationCode: input.locationCode } }, create: { productSku: input.sku, locationCode: input.locationCode, onHand: input.newOnHand }, update: { onHand: input.newOnHand } });
    const movement = await prisma.stockMove.create({ data: { moveNumber: reference, productSku: input.sku, sourceLocation: delta > 0 ? 'Inventory/Adjustment' : input.locationCode, destLocation: delta > 0 ? input.locationCode : 'Inventory/Adjustment', quantity: Math.abs(delta), unitCost: product.standardCost, totalValue: value, documentType: 'ADJUSTMENT', documentRef: reference, actorId: input.actor.id, reason } });
    const journal = await prisma.journalEntry.create({ data: { entryNumber: await getNextSequence('JE'), sourceDocument: reference, documentRef: `ADJUSTMENT_${reference}`, journalType: 'INVENTORY', notes: reason, items: { create: [ { accountCode: '1030', label: reference, debit: delta > 0 ? value : 0, credit: delta < 0 ? value : 0 }, { accountCode: '8010', label: reference, debit: delta < 0 ? value : 0, credit: delta > 0 ? value : 0 } ] } } });
    await prisma.stockMove.update({where:{id:movement.id},data:{journalEntryId:journal.id}});
    await prisma.account.update({ where: { code: '1030' }, data: { currentBalance: { increment: delta * product.standardCost } } });
    await prisma.account.update({ where: { code: '8010' }, data: { currentBalance: { decrement: delta * product.standardCost } } });
    await recordAuditLog({ actorId: input.actor.id, actorName: input.actor.name, actorRole: input.actor.role as any, action: 'POST_ADJUSTMENT', documentType: 'STOCK_MOVE', documentId: reference, beforeData: { onHand: before, reserved }, afterData: { onHand: stock.onHand, movementId: movement.id, journalId: journal.id }, notes: reason });
    return { stock, movement, journal, message: 'Penyesuaian stok dan jurnal berhasil diposting.' };
  });
}
