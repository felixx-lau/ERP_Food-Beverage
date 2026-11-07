import { atomic } from "./atomic";
import { permit, quantity, money, discount, uniqueLines, editable } from "./validation";
import { prisma } from "./prisma";
import { OrderStatus, Role } from "@prisma/client";
import { validateCreditCheck } from "./creditControl";
import { recordAuditLog } from "./audit";
import { getNextSequence } from "./sequences";

export interface LineItemInput {
  productSku: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export interface CalculateOrderTotalsResult {
  lines: Array<{
    productSku: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    netPrice: number;
    pbjtAmount: number;
    totalAmount: number;
    standardCost: number;
  }>;
  subtotalNet: number;
  pbjtTax: number;
  totalGross: number;
  projectedCost: number;
  maxDiscountPercent: number;
}

export async function calculateOrderTotals(items: LineItemInput[]): Promise<CalculateOrderTotalsResult> {
  uniqueLines(items, l => l.productSku);
  for (const l of items) { quantity(l.quantity); money(l.unitPrice); discount(l.discountPercent ?? 0); }
  const skus = items.map((i) => i.productSku);
  const products = await prisma.productVariant.findMany({
    where: { sku: { in: skus } },
  });

  const productMap = new Map(products.map((p) => [p.sku, p]));

  let subtotalNet = 0;
  let pbjtTax = 0;
  let totalGross = 0;
  let projectedCost = 0;
  let maxDiscountPercent = 0;

  const lines = items.map((item) => {
    const p = productMap.get(item.productSku);
    if (!p || p.archivedAt) throw new Error(`Product ${item.productSku} not found`);

    const qty = item.quantity;
    const price = item.unitPrice !== undefined ? item.unitPrice : p.salesPrice;
    const discount = item.discountPercent || 0;
    if (discount > maxDiscountPercent) maxDiscountPercent = discount;

    // SR-18: PBJT 10% atas net line sales setelah diskon, dibulatkan per baris ke Rupiah terdekat (half-up)
    const lineNet = Math.round(qty * price * (1 - discount / 100));
    const linePbjt = Math.round(lineNet * 0.1);
    const lineTotal = lineNet + linePbjt;
    const lineCost = qty * p.standardCost;
    money(lineNet); money(linePbjt); money(lineTotal); money(lineCost);

    subtotalNet += lineNet;
    pbjtTax += linePbjt;
    totalGross += lineTotal;
    projectedCost += lineCost;

    return {
      productSku: item.productSku,
      quantity: qty,
      unitPrice: price,
      discountPercent: discount,
      netPrice: lineNet,
      pbjtAmount: linePbjt,
      totalAmount: lineTotal,
      standardCost: p.standardCost,
    };
  });

  return {
    lines,
    subtotalNet,
    pbjtTax,
    totalGross,
    projectedCost,
    maxDiscountPercent,
  };
}

async function createSalesQuotationImpl(params: {
  contactId: string;
  leadId?: string;
  lines: LineItemInput[];
  paymentTerms?: any;
  actor: { id: string; name: string; role: Role };
}) {
  const { contactId, leadId, lines: lineInputs, actor } = params;

  permit(actor, ['OWNER','SALES']);
  const customer = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!customer || customer.archivedAt || customer.type !== 'CUSTOMER') throw new Error('Pelanggan tidak valid.');
  if (leadId) { const lead = await prisma.crmLead.findUnique({ where: { id: leadId } }); if (!lead || lead.contactId !== contactId) throw new Error('Lead dan pelanggan harus sesuai.'); }
  // Validate discount limit: max allowed is 20%
  for (const l of lineInputs) {
    if ((l.discountPercent || 0) > 20) {
      throw new Error("Diskon maksimal yang diizinkan adalah 20% (SR-07).");
    }
  }

  const totals = await calculateOrderTotals(lineInputs);
  const orderNumber = await getNextSequence("SO");

  // Determine initial status based on discount policy (SR-07 / SR-08)
  // Discount > 10% requires Owner approval
  const needsOwnerApproval = totals.maxDiscountPercent > 10;
  const initialStatus = OrderStatus.DRAFT;

  const order = await prisma.salesOrder.create({
    data: {
      orderNumber,
      contactId,
      leadId,
      status: initialStatus,
      pricingOption: "Exclude PBJT",
      paymentTerms: params.paymentTerms || customer.paymentTerms,
      discountApproved: !needsOwnerApproval,
      discountApprovedBy: !needsOwnerApproval ? actor.name : null,
      discountPercent: totals.maxDiscountPercent,
      subtotalNet: totals.subtotalNet,
      pbjtTax: totals.pbjtTax,
      totalGross: totals.totalGross,
      projectedCost: totals.projectedCost,
      isPriceLocked: false,
      lines: {
        create: totals.lines.map((l) => ({
          productSku: l.productSku,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPercent: l.discountPercent,
          netPrice: l.netPrice,
          pbjtAmount: l.pbjtAmount,
          totalAmount: l.totalAmount,
          standardCost: l.standardCost,
        })),
      },
    },
    include: {
      lines: { include: { product: true } },
      contact: true,
      lead: true,
    },
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "CREATE_QUOTATION",
    afterData: order,
    documentType: "SO",
    documentId: order.orderNumber,
    afterState: {
      orderNumber: order.orderNumber,
      contactId: order.contactId,
      totalGross: order.totalGross,
      maxDiscount: totals.maxDiscountPercent,
      needsOwnerApproval,
    },
    notes: `Quotation ${order.orderNumber} dibuat. Total: Rp ${order.totalGross.toLocaleString("id-ID")}`,
  });

  return order;
}

async function approveOrderDiscountImpl(orderId: string, actor: { id: string; name: string; role: Role }) {
  if (actor.role !== Role.OWNER) {
    throw new Error("Akses ditolak (SR-08): Hanya Owner (Maya Prasetyo) yang berwenang menyetujui diskon di atas 10%.");
  }

  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error("Order tidak ditemukan.");
  editable(order.status);

  const updated = await prisma.salesOrder.update({
    where: { id: orderId },
    data: {
      discountApproved: true,
      version: { increment: 1 },
      discountApprovedBy: actor.name,
      status: OrderStatus.DRAFT, // ready for confirmation
    },
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "APPROVE_DISCOUNT",
    beforeData: order,
    afterData: updated,
    documentType: "SO",
    documentId: order.orderNumber,
    notes: `Diskon ${order.discountPercent}% pada ${order.orderNumber} disetujui oleh Owner (${actor.name}).`,
  });

  return updated;
}

async function confirmSalesOrderImpl(orderId: string, actor: { id: string; name: string; role: Role }) {
  permit(actor, ["OWNER","SALES"]);
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      lines: true,
      contact: true,
    },
  });

  if (!order) throw new Error("Order tidak ditemukan.");

  // Idempotency check: if already confirmed, do not re-confirm
  if (order.status === OrderStatus.CONFIRMED) {
    return { order, confirmedOrder: order, deliveryOrder: await prisma.deliveryOrder.findFirst({ where: { salesOrderId: order.id }, include: { lines: true } }), message: "Order sudah dikonfirmasi sebelumnya (idempotent)." };
  }

  editable(order.status);
  uniqueLines(order.lines, l => l.productSku);
  for (const l of order.lines) { quantity(l.quantity); money(l.unitPrice); discount(l.discountPercent); }
  // 1. Discount Approval Check (SR-08 / T-10)
  if (order.discountPercent > 10 && !order.discountApproved) {
    await recordAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "CONFIRM_BLOCKED_DISCOUNT",
      documentType: "SO",
      documentId: order.orderNumber,
      notes: `Konfirmasi ${order.orderNumber} ditolak: Diskon ${order.discountPercent}% memerlukan persetujuan Owner (SR-08).`,
    });

    throw new Error(
      `Persetujuan Diperlukan (SR-08 / T-10): Diskon ${order.discountPercent}% melebihi batas 10%. Memerlukan persetujuan Owner sebelum order dapat dikonfirmasi.`
    );
  }

  // 2. Credit Control Check (SR-09 / T-04)
  const creditCheck = await validateCreditCheck(order.contactId, order.totalGross);
  if (!creditCheck.allowed) {
    await recordAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "CREDIT_LIMIT_EXCEEDED",
      documentType: "SO",
      documentId: order.orderNumber,
      notes: `Credit check gagal: ${creditCheck.reason}`,
    });

    throw new Error(
      `Batas Kredit Terlampaui (SR-09 / T-04): ${creditCheck.reason}`
    );
  }

  // 3. Database Transaction: Lock price, Update SO status, Create Inventory Reservation at WH-JKT, Create Draft DO
  const result = await prisma.$transaction(async (tx) => {
    // A. Update SO to CONFIRMED and lock price
    const confirmedOrder = await tx.salesOrder.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CONFIRMED,
        version: { increment: 1 },
        isPriceLocked: true, // SR-08: Harga dan diskon dikunci setelah Confirmed
      },
      include: { lines: true, contact: true },
    });

    // B. Reserve Stock at WH-JKT (SR-04 / F-07)
    for (const line of order.lines) {
      const stock = await tx.stockLevel.findUnique({ where: { productSku_locationCode: { productSku: line.productSku, locationCode: 'WH-JKT' } } });
      if (!stock || stock.onHand - stock.reserved < line.quantity) throw new Error('Stok available tidak mencukupi untuk reservasi (SR-04).');
      await tx.stockLevel.update({ where: { id: stock.id }, data: { reserved: { increment: line.quantity } } });
      await tx.stockReservation.create({ data: { salesOrderLineId: line.id, locationCode: "WH-JKT", quantity: line.quantity } });
    }

    // C. Create linked Delivery Order in DRAFT status
    const deliveryNumber = await getNextSequence("DO");
    const deliveryOrder = await tx.deliveryOrder.create({
      data: {
        deliveryNumber,
        salesOrderId: confirmedOrder.id,
        sourceLocation: "WH-JKT",
        status: "DRAFT",
        lines: {
          create: order.lines.map((l) => ({
            productSku: l.productSku,
            orderedQty: l.quantity,
            deliveredQty: 0,
            backorderQty: 0,
          })),
        },
      },
      include: { lines: true },
    });

    return { confirmedOrder, deliveryOrder };
  });

  await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: "CONFIRM_SO",
    beforeData: order,
    documentType: "SO",
    documentId: order.orderNumber,
    afterState: {
      status: "CONFIRMED",
      isPriceLocked: true,
      linkedDO: result.deliveryOrder.deliveryNumber,
    },
    notes: `Sales Order ${order.orderNumber} dikonfirmasi. Reservasi dibuat di WH-JKT dan DO ${result.deliveryOrder.deliveryNumber} terbentuk.`,
  });

  return result;
}

async function updateSalesOrderLineImpl(params: {
  orderId: string;
  lineId: string;
  quantity?: number;
  unitPrice?: number;
  discountPercent?: number;
  actor: { id: string; name: string; role: Role };
}) {
  const { orderId, lineId, quantity: nextQuantity, unitPrice, discountPercent, actor } = params;
  permit(actor, ["OWNER", "SALES"]);

  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });

  if (!order) throw new Error("Order tidak ditemukan.");

  // SR-08 / F-06: Price and discount locked once Confirmed
  if (order.status === OrderStatus.CONFIRMED || order.isPriceLocked) {
    await recordAuditLog({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "ILLEGAL_PRICE_EDIT_ATTEMPT",
      documentType: "SO",
      documentId: order.orderNumber,
      notes: `Percobaan ubah harga pada order ${order.orderNumber} yang sudah Confirmed dicegah (SR-08 / F-06).`,
    });

    throw new Error(
      "Perubahan Tak Sah (SR-08 / F-06): Harga dan diskon telah dikunci setelah Sales Order dikonfirmasi. Perubahan ditolak."
    );
  }

  // Update line and recalculate totals
  const line = order.lines.find((l) => l.id === lineId);
  if (!line) throw new Error("Line tidak ditemukan.");

  const nextQty = nextQuantity !== undefined ? nextQuantity : line.quantity;
  const nextPrice = unitPrice !== undefined ? unitPrice : line.unitPrice;
  const nextDiscount = discountPercent !== undefined ? discountPercent : line.discountPercent;

  editable(order.status);
  quantity(nextQty); money(nextPrice); discount(nextDiscount);
  const nextNet = Math.round(nextQty * nextPrice * (1 - nextDiscount / 100));
  const nextPbjt = Math.round(nextNet * 0.1);
  const nextTotal = nextNet + nextPbjt;

  await prisma.salesOrderLine.update({
    where: { id: lineId },
    data: {
      quantity: nextQty,
      unitPrice: nextPrice,
      discountPercent: nextDiscount,
      netPrice: nextNet,
      pbjtAmount: nextPbjt,
      totalAmount: nextTotal,
    },
  });

  // Re-fetch all lines and recalculate order totals
  const updatedLines = await prisma.salesOrderLine.findMany({
    where: { salesOrderId: orderId },
  });

  const subtotalNet = updatedLines.reduce((sum, l) => sum + l.netPrice, 0);
  const pbjtTax = updatedLines.reduce((sum, l) => sum + l.pbjtAmount, 0);
  const totalGross = subtotalNet + pbjtTax;
  const projectedCost = updatedLines.reduce((sum, l) => sum + l.quantity * l.standardCost, 0);
  const maxDiscount = Math.max(...updatedLines.map((l) => l.discountPercent));

  const updatedOrder = await prisma.salesOrder.update({
    where: { id: orderId },
    data: {
      subtotalNet,
      pbjtTax,
      totalGross,
      projectedCost,
      version: { increment: 1 },
      discountPercent: maxDiscount,
      discountApproved: maxDiscount <= 10,
      discountApprovedBy: null,
    },
    include: { lines: true },
  });

  await recordAuditLog({ actorId: actor.id, actorName: actor.name, actorRole: actor.role, action: "UPDATE_QUOTATION", documentType: "SO", documentId: order.orderNumber, beforeData: order, afterData: updatedOrder });
  return updatedOrder;
}

export const createSalesQuotation = (...args: Parameters<typeof createSalesQuotationImpl>) => atomic(() => createSalesQuotationImpl(...args));

export const approveOrderDiscount = (...args: Parameters<typeof approveOrderDiscountImpl>) => atomic(() => approveOrderDiscountImpl(...args));

export const confirmSalesOrder = (...args: Parameters<typeof confirmSalesOrderImpl>) => atomic(() => confirmSalesOrderImpl(...args));

export const updateSalesOrderLine = (...args: Parameters<typeof updateSalesOrderLineImpl>) => atomic(() => updateSalesOrderLineImpl(...args));
