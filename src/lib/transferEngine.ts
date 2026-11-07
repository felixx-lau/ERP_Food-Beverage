import { atomic } from "./atomic";
import { permit, quantity, money, discount, uniqueLines, editable } from "./validation";
import { prisma } from "./prisma";
import { getNextSequence } from "./sequences";
import { logAudit } from "./audit";
import { Role } from "@prisma/client";

export interface CreateTransferInput {
  sourceLocation?: string;
  destLocation?: string;
  lines: Array<{
    productSku: string;
    quantity: number;
  }>;
  actor: {
    id?: string;
    name: string;
    role: Role | string;
  };
}

/**
 * Buat draft Internal Stock Transfer (S-07 / F-19)
 */
async function createInternalTransferImpl(input: CreateTransferInput) {
  const { sourceLocation = "WH-JKT", destLocation = "CAFE-JKT", lines, actor } = input;

  permit(actor, ["OWNER","WAREHOUSE"]);
  uniqueLines(lines, l => l.productSku); lines.forEach(l => quantity(l.quantity));
  for (const code of [sourceLocation,destLocation]) if (!await prisma.warehouseLocation.findFirst({ where: { code, archivedAt: null } })) throw new Error("Lokasi tidak terdaftar.");
  if (sourceLocation === destLocation) {
    throw new Error("Lokasi sumber dan tujuan transfer tidak boleh sama.");
  }

  if (!lines || lines.length === 0) {
    throw new Error("Daftar item produk transfer tidak boleh kosong.");
  }

  return await prisma.$transaction(async (tx) => {
    const transferNumber = await getNextSequence("INT", tx);

    // Fetch product details & standard costs
    let totalTransferValue = 0;
    const transferLinesData = [];

    for (const item of lines) {
      if (item.quantity <= 0) {
        throw new Error(`Kuantitas untuk SKU ${item.productSku} harus lebih besar dari 0.`);
      }

      const product = await tx.productVariant.findUnique({
        where: { sku: item.productSku },
      });

      if (!product) {
        throw new Error(`Produk dengan SKU ${item.productSku} tidak ditemukan.`);
      }

      const unitCost = product.standardCost;
      const totalValue = item.quantity * unitCost;
      totalTransferValue += totalValue;

      transferLinesData.push({
        productSku: item.productSku,
        quantity: item.quantity,
        unitCost,
        totalValue,
      });
    }

    const transfer = await tx.internalTransfer.create({
      data: {
        transferNumber,
        sourceLocation,
        destLocation,
        status: "DRAFT",
        isPosted: false,
        lines: {
          create: transferLinesData,
        },
      },
      include: {
        lines: { include: { product: true } },
      },
    });

    await logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role as Role,
      action: "CREATE_INTERNAL_TRANSFER",
      documentType: "INTERNAL_TRANSFER",
      documentId: transfer.id,
      documentNumber: transfer.transferNumber,
      notes: `Draft internal transfer ${transferNumber} dibuat dari ${sourceLocation} ke ${destLocation} senilai Rp ${totalTransferValue.toLocaleString("id-ID")}.`,
      afterData: transfer,
      tx,
    });

    return transfer;
  });
}

/**
 * Validasi dan eksekusi perpindahan stok internal (T-13 / T-14 / SR-04 / SR-12)
 */
async function validateInternalTransferImpl(transferId: string, actor: { id?: string; name: string; role: Role | string }) {
  permit(actor, ["OWNER","WAREHOUSE"]);
  return await prisma.$transaction(async (tx) => {
    const transfer = await tx.internalTransfer.findUnique({
      where: { id: transferId },
      include: { lines: true },
    });

    if (!transfer) {
      throw new Error(`Internal transfer dengan ID ${transferId} tidak ditemukan.`);
    }

    if (transfer.status === "DONE" || transfer.isPosted) {
      return {
        success: true,
        alreadyValidated: true,
        message: `Transfer ${transfer.transferNumber} sudah divalidasi sebelumnya (Idempotent).`,
        transfer,
      };
    }

    editable(transfer.status);
    uniqueLines(transfer.lines, l => l.productSku);
    const movements: Array<{
      productSku: string;
      sourceBefore: number;
      sourceAfter: number;
      destBefore: number;
      destAfter: number;
      quantity: number;
      value: number;
    }> = [];

    // Validasi ketersediaan stok di lokasi sumber (SR-04 / SR-12 / T-14)
    for (const line of transfer.lines) {
      const srcStock = await tx.stockLevel.findUnique({
        where: {
          productSku_locationCode: {
            productSku: line.productSku,
            locationCode: transfer.sourceLocation,
          },
        },
      });

      const onHand = srcStock?.onHand || 0;
      const reserved = srcStock?.reserved || 0;
      const available = onHand - reserved;

      if (line.quantity > available) {
        throw new Error(
          `Validasi Transfer Gagal (SR-04 / SR-12 / T-14): Kuantitas transfer (${line.quantity}) melebihi stok yang tersedia (${available}, on-hand: ${onHand}) di lokasi sumber ${transfer.sourceLocation}. Transfer dibatalkan.`
        );
      }

      // Ambil stok tujuan
      let dstStock = await tx.stockLevel.findUnique({
        where: {
          productSku_locationCode: {
            productSku: line.productSku,
            locationCode: transfer.destLocation,
          },
        },
      });

      if (!dstStock) {
        dstStock = await tx.stockLevel.create({
          data: {
            productSku: line.productSku,
            locationCode: transfer.destLocation,
            onHand: 0,
            reserved: 0,
          },
        });
      }

      const srcBefore = onHand;
      const srcAfter = onHand - line.quantity;
      const dstBefore = dstStock.onHand;
      const dstAfter = dstStock.onHand + line.quantity;

      // Eksekusi pemindahan stok
      await tx.stockLevel.update({
        where: {
          productSku_locationCode: {
            productSku: line.productSku,
            locationCode: transfer.sourceLocation,
          },
        },
        data: {
          onHand: { decrement: line.quantity },
        },
      });

      await tx.stockLevel.update({
        where: {
          productSku_locationCode: {
            productSku: line.productSku,
            locationCode: transfer.destLocation,
          },
        },
        data: {
          onHand: { increment: line.quantity },
        },
      });

      await tx.stockMove.create({ data: { moveNumber: `SM/INT/${crypto.randomUUID()}`, productSku: line.productSku, sourceLocation: transfer.sourceLocation, destLocation: transfer.destLocation, quantity: line.quantity, unitCost: line.unitCost, totalValue: line.totalValue, documentType: "TRANSFER", actorId: actor.id, reason: "TRANSFER", documentRef: transfer.transferNumber } });
      movements.push({
        productSku: line.productSku,
        sourceBefore: srcBefore,
        sourceAfter: srcAfter,
        destBefore: dstBefore,
        destAfter: dstAfter,
        quantity: line.quantity,
        value: line.totalValue,
      });
    }

    // Update status transfer menjadi DONE
    const updatedTransfer = await tx.internalTransfer.update({
      where: { id: transfer.id },
      data: {
        status: "DONE",
        isPosted: true,
      },
      include: { lines: { include: { product: true } } },
    });

    await logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role as Role,
      action: "VALIDATE_INTERNAL_TRANSFER",
      documentType: "INTERNAL_TRANSFER",
      documentId: updatedTransfer.id,
      documentNumber: updatedTransfer.transferNumber,
      notes: `Internal transfer ${updatedTransfer.transferNumber} selesai divalidasi. Stok dipindahkan dari ${transfer.sourceLocation} ke ${transfer.destLocation}.`,
      beforeData: transfer,
      afterData: { ...updatedTransfer, movements },
      tx,
    });

    return {
      success: true,
      transfer: updatedTransfer,
      movements,
    };
  });
}

export const createInternalTransfer = (...args: Parameters<typeof createInternalTransferImpl>) => atomic(() => createInternalTransferImpl(...args));

export const validateInternalTransfer = (...args: Parameters<typeof validateInternalTransferImpl>) => atomic(() => validateInternalTransferImpl(...args));
