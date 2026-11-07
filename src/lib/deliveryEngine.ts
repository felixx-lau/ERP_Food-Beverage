import { atomic } from "./atomic";
import { permit, quantity, money, discount, uniqueLines, editable } from "./validation";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { recordAuditLog } from "./audit";
import { getNextSequence } from "./sequences";

export interface DeliveryValidationItem {
  lineId: string;
  productSku: string;
  deliveredQty: number;
}

async function validateDeliveryOrderImpl(params: {
  deliveryOrderId: string;
  items: DeliveryValidationItem[];
  actor: { id: string; name: string; role: Role };
}) {
  const { deliveryOrderId, items, actor } = params;
  uniqueLines(items, l => l.lineId);
  uniqueLines(items, l => l.productSku);
  items.forEach(i => quantity(i.deliveredQty, true));

  // Role check: Only WAREHOUSE or OWNER can validate delivery
  if (actor.role !== Role.WAREHOUSE && actor.role !== Role.OWNER) {
    throw new Error("Akses ditolak (SR-15): Hanya Warehouse atau Owner yang dapat memvalidasi pengiriman.");
  }

  const delivery = await prisma.deliveryOrder.findUnique({
    where: { id: deliveryOrderId },
    include: {
      lines: { include: { product: true } },
      salesOrder: { include: { lines: true } },
    },
  });

  if (!delivery) throw new Error("Delivery Order tidak ditemukan.");
  if (delivery.status === "DONE") {
    return { delivery, message: "Delivery Order sudah selesai (idempotent)." };
  }

  if (delivery.salesOrder.status !== 'CONFIRMED' || !['DRAFT','CONFIRMED'].includes(delivery.status)) throw new Error('Pengiriman memerlukan Sales Order Confirmed dan delivery aktif (SR-04 / SR-10).');
  for (const item of items) if (!delivery.lines.some(l => l.id === item.lineId && l.productSku === item.productSku)) throw new Error('Baris pengiriman dan SKU tidak sesuai.');
  const completeItems = delivery.lines.map(l => items.find(i => i.lineId === l.id) || { lineId: l.id, productSku: l.productSku, deliveredQty: 0 });
  if (!completeItems.some(i => i.deliveredQty > 0)) throw new Error("Isi minimal satu kuantitas pengiriman positif.");
  const sourceLocation = delivery.sourceLocation || "WH-JKT";

  // Execute in an atomic database transaction
  const result = await prisma.$transaction(async (tx) => {
    let totalCogs = 0;
    let totalDeliveredValueNet = 0;
    let hasBackorder = false;
    const backorderLinesToCreate: Array<{ productSku: string; orderedQty: number }> = [];

    for (const item of completeItems) {
      const line = delivery.lines.find((l) => l.id === item.lineId && l.productSku === item.productSku);
      if (!line) throw new Error(`Baris produk ${item.productSku} tidak ditemukan di Delivery Order.`);

      const orderedQty = line.orderedQty;
      const deliverQty = item.deliveredQty;

      const sourceLine = delivery.salesOrder.lines.find(l => l.productSku === item.productSku);
      if (!sourceLine || deliverQty > orderedQty || deliverQty > sourceLine.quantity - sourceLine.deliveredQty) throw new Error("Over-delivery ditolak (SR-10).");
      if (deliverQty < 0) {
        throw new Error("Kuantitas pengiriman tidak boleh negatif.");
      }

      // Check Stock Level in source location
      const stock = await tx.stockLevel.findUnique({
        where: {
          productSku_locationCode: {
            productSku: item.productSku,
            locationCode: sourceLocation,
          },
        },
      });

      if (!stock) {
        throw new Error(`Data stok produk ${item.productSku} di ${sourceLocation} tidak ditemukan.`);
      }

      // SR-04 & T-12: Zero negative stock & protecting other orders' reserved stock
      // Calculate how much is reserved by OTHER orders
      // For this order, line.orderedQty was reserved when SO was confirmed
      const allocation = await tx.stockReservation.findUnique({ where: { salesOrderLineId_locationCode: { salesOrderLineId: sourceLine.id, locationCode: sourceLocation } } });
      if (!allocation || allocation.quantity < deliverQty) throw new Error("Reservasi order tidak mencukupi (SR-04).");
      if (stock.reserved < orderedQty) throw new Error("Reservasi order tidak valid (SR-04).");
      const otherReserved = stock.reserved - allocation.quantity;
      const availableForThisOrder = stock.onHand - otherReserved;

      if (deliverQty > stock.onHand) {
        throw new Error(
          `Validasi Gagal (SR-04 / T-12): Kuantitas pengiriman (${deliverQty}) melebihi stok fisik On-Hand (${stock.onHand}) di ${sourceLocation}. Stok negatif dilarang.`
        );
      }

      if (deliverQty > availableForThisOrder) {
        throw new Error(
          `Validasi Gagal (SR-04 / SR-10 / T-12): Kuantitas pengiriman (${deliverQty}) melebihi stok yang tersedia (${availableForThisOrder}) di ${sourceLocation}. Pengiriman dilarang karena akan mengonsumsi stok yang telah di-reserve untuk transaksi lain.`
        );
      }

      const backorderQty = Math.max(0, orderedQty - deliverQty);
      if (backorderQty > 0) {
        hasBackorder = true;
        backorderLinesToCreate.push({
          productSku: item.productSku,
          orderedQty: backorderQty,
        });
      }

      // 1. Update Stock Level at Source Location
      // On Hand decreases by deliverQty
      // Reserved decreases by deliverQty (the remaining backorderQty stays reserved!)
      await tx.stockLevel.update({
        where: {
          productSku_locationCode: {
            productSku: item.productSku,
            locationCode: sourceLocation,
          },
        },
        data: {
          onHand: { decrement: deliverQty },
          reserved: { decrement: deliverQty },
        },
      });

      await tx.stockReservation.update({ where: { id: allocation.id }, data: { quantity: { decrement: deliverQty } } });
      // 2. Update Delivery Order Line
      await tx.deliveryOrderLine.update({
        where: { id: line.id },
        data: {
          deliveredQty: deliverQty,
          backorderQty: backorderQty,
        },
      });

      // 3. Update Sales Order Line delivered quantity (eligible for invoicing)
      const soLine = delivery.salesOrder.lines.find((sl) => sl.productSku === item.productSku);
      if (soLine) {
        await tx.salesOrderLine.update({
          where: { id: soLine.id },
          data: {
            deliveredQty: { increment: deliverQty },
          },
        });
        totalDeliveredValueNet += deliverQty * soLine.unitPrice * (1 - soLine.discountPercent / 100);
      }

      if (deliverQty === 0) continue;
      // 4. Record Stock Move
      const standardCost = sourceLine.standardCost;
      const lineCogs = deliverQty * standardCost;
      totalCogs += lineCogs;

      await tx.stockMove.create({
        data: {
          moveNumber: `SM/OUT/${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productSku: item.productSku,
          sourceLocation: sourceLocation,
          destLocation: "Customer/Output",
          quantity: deliverQty,
          unitCost: standardCost,
          totalValue: lineCogs,
          documentType: "DELIVERY", actorId: actor.id, reason: "DELIVERY",
          documentRef: delivery.deliveryNumber,
          state: "DONE",
        },
      });
    }

    // 5. Update Delivery Order Status to DONE
    const updatedDelivery = await tx.deliveryOrder.update({
      where: { id: deliveryOrderId },
      data: {
        status: "DONE",
        dateDone: new Date(),
      },
      include: { lines: { include: { product: true } } },
    });

    // 6. If partial delivery, create Backorder Delivery Order (SR-10)
    let backorderDoc = null;
    if (hasBackorder && backorderLinesToCreate.length > 0) {
      const boNumber = await getNextSequence("DO");
      backorderDoc = await tx.deliveryOrder.create({
        data: {
          deliveryNumber: boNumber,
          salesOrderId: delivery.salesOrderId,
          sourceLocation: sourceLocation,
          status: "CONFIRMED", // active backorder
          isBackorder: true,
          backorderOfId: delivery.id,
          lines: {
            create: backorderLinesToCreate.map((b) => ({
              productSku: b.productSku,
              orderedQty: b.orderedQty,
              deliveredQty: 0,
              backorderQty: 0,
            })),
          },
        },
        include: { lines: true },
      });
    }

    // 7. Create Balanced COGS Journal Entry (T-25 / Wireframe S-13 / SR-13)
    let cogsJournal = null;
    if (totalCogs > 0) {
      const jeNumber = await getNextSequence("JE");
      cogsJournal = await tx.journalEntry.create({
        data: {
          entryNumber: jeNumber,
          sourceDocument: delivery.deliveryNumber,
          documentRef: `DELIVERY_${delivery.deliveryNumber}`,
          journalType: "INVENTORY",
          state: "POSTED",
          notes: `COGS recognition for Delivery ${delivery.deliveryNumber} (SO: ${delivery.salesOrder.orderNumber})`,
          items: {
            create: [
              {
                accountCode: "5010",
                label: `COGS: ${delivery.deliveryNumber}`,
                debit: totalCogs,
                credit: 0,
              },
              {
                accountCode: "1030",
                label: `Inventory Relief: ${delivery.deliveryNumber}`,
                debit: 0,
                credit: totalCogs,
              },
            ],
          },
        },
        include: { items: true },
      });

      await tx.account.update({
        where: { code: "5010" },
        data: { currentBalance: { increment: totalCogs } },
      });
      await tx.account.update({
        where: { code: "1030" },
        data: { currentBalance: { decrement: totalCogs } },
      });
    }

    if (cogsJournal) await tx.stockMove.updateMany({where:{documentRef:delivery.deliveryNumber},data:{journalEntryId:cogsJournal.id}});
    return {
      updatedDelivery,
      backorderDoc,
      cogsJournal,
      totalCogs,
      totalDeliveredValueNet,
      totalDeliveredValuePbjt: Math.round(totalDeliveredValueNet * 0.1),
      totalDeliveredValueGross: totalDeliveredValueNet + Math.round(totalDeliveredValueNet * 0.1),
    };
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "VALIDATE_DELIVERY",
    beforeData: delivery,
    documentType: "DELIVERY",
    documentId: delivery.deliveryNumber,
    afterState: {
      status: "DONE",
      cogs: result.totalCogs,
      backorderNumber: result.backorderDoc?.deliveryNumber || null,
      eligibleToInvoiceNet: result.totalDeliveredValueNet,
    },
    notes: `Pengiriman ${delivery.deliveryNumber} divalidasi. COGS: Rp ${result.totalCogs.toLocaleString("id-ID")}.${
      result.backorderDoc ? ` Backorder ${result.backorderDoc.deliveryNumber} dibuat.` : ""
    }`,
  });

  return result;
}

export const validateDeliveryOrder = (...args: Parameters<typeof validateDeliveryOrderImpl>) => atomic(() => validateDeliveryOrderImpl(...args));
