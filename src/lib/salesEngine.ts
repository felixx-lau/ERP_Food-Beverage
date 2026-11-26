import { availableStock } from "./stockPolicy";
import { atomic } from "./atomic";
import { permit, quantity, money, discount, uniqueLines, editable, BusinessError, textValue } from "./validation";
import { prisma } from "./prisma";
import { OrderStatus, Role } from "@prisma/client";
import { validateCreditCheck } from "./creditControl";
import { AuditedRejection, recordAuditLog } from "./audit";
import { getNextSequence } from "./sequences";
import { discountApproval, getDiscountDecisions } from "./discountApproval";
import { DISCOUNT_APPROVAL_LIMIT } from "./discountPolicy";

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
    if (!p || p.archivedAt || p.kind !== 'MENU') throw new Error(`Product ${item.productSku} not found`);

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

async function advanceLeadForOrder(
  order: { leadId: string | null; orderNumber: string; subtotalNet: number },
  stage: 'PROPOSITION' | 'WON',
  actor: { id: string; name: string; role: Role },
) {
  if (!order.leadId) return null;
  const lead = await prisma.crmLead.findUnique({ where: { id: order.leadId } });
  if (!lead || lead.archivedAt || lead.stage === 'WON' || lead.stage === stage) return lead;

  const expectedRevenue = lead.expectedRevenue || order.subtotalNet;
  if (expectedRevenue <= 0) return lead;

  const updated = await prisma.crmLead.update({
    where: { id: lead.id },
    data: { stage, expectedRevenue, version: { increment: 1 } },
  });
  await recordAuditLog({
    actorId: actor.id, actorName: actor.name, actorRole: actor.role,
    action: 'ADVANCE_LEAD_STAGE', documentType: 'MASTER_leads', documentId: lead.id,
    beforeState: { stage: lead.stage, expectedRevenue: lead.expectedRevenue },
    afterState: { stage, expectedRevenue, orderNumber: order.orderNumber },
    notes: stage === 'WON' ? 'Sales Order dikonfirmasi.' : 'Penawaran dibuat dari lead.',
  });
  return updated;
}

async function createSalesQuotationImpl(params: {
  contactId: string;
  leadId?: string;
  lines: LineItemInput[];
  paymentTerms?: any;
  actor: { id: string; name: string; role: Role };
}) {
  const { contactId, leadId, lines: lineInputs, actor } = params;

  permit(actor, ['HEAD_ADMIN','SALES']);
  const customer = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!customer || customer.archivedAt || customer.type !== 'CUSTOMER') throw new Error('Pelanggan tidak valid.');
  if (leadId) { const lead = await prisma.crmLead.findUnique({ where: { id: leadId } }); if (!lead || lead.contactId !== contactId) throw new Error('Lead dan pelanggan harus sesuai.'); if (lead.archivedAt) throw new Error('Pulihkan lead yang dibatalkan sebelum membuat penawaran.'); }
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
  const needsOwnerApproval = totals.maxDiscountPercent > DISCOUNT_APPROVAL_LIMIT;
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

  return { ...order, lead: await advanceLeadForOrder(order, 'PROPOSITION', actor) };
}

async function decideOrderDiscountImpl(
  orderId: string, actor: { id: string; name: string; role: Role },
  input: { decision: 'APPROVE' | 'REJECT'; reason: unknown; version?: number },
) {
  if (actor.role !== Role.OWNER) {
    throw new BusinessError("Hanya Owner yang dapat memutuskan persetujuan diskon (SR-08).", 403);
  }
  const reason = textValue(input.reason, "Alasan keputusan", true, 500);
  const order = await prisma.salesOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new BusinessError("Pesanan tidak ditemukan.", 404);
  editable(order.status);
  if (input.version !== undefined && input.version !== order.version) {
    throw new BusinessError("Pesanan berubah. Muat ulang sebelum memberi keputusan.", 409);
  }
  if (order.discountPercent <= DISCOUNT_APPROVAL_LIMIT) {
    throw new BusinessError("Diskon ini tidak memerlukan persetujuan Owner.", 409);
  }
  const previous = discountApproval(order, await getDiscountDecisions(prisma, [order]));
  if (previous.discountApprovalStatus !== 'PENDING') {
    throw new BusinessError("Keputusan sudah tercatat. Edit draft untuk mengajukan revisi.", 409);
  }
  const approved = input.decision === 'APPROVE';
  const updated = await prisma.salesOrder.update({
    where: { id: orderId },
    data: {
      discountApproved: approved,
      version: { increment: 1 },
      discountApprovedBy: approved ? actor.name : null,
    },
  });
  const event = await recordAuditLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: approved ? "APPROVE_DISCOUNT" : "REJECT_DISCOUNT",
    beforeState: { version: order.version, discountApproved: order.discountApproved },
    afterState: { version: updated.version, reason, discountPercent: order.discountPercent,
      subtotalNet: order.subtotalNet, projectedCost: order.projectedCost, totalGross: order.totalGross },
    documentType: "SO",
    documentId: order.orderNumber,
    notes: reason,
  });
  return { ...updated, ...discountApproval(updated, [event]) };
}

async function draftDelivery(salesOrderId: string, sourceLocation: string, lines: {productSku: string; quantity: number}[]) {
  return prisma.deliveryOrder.create({
    data: {
      deliveryNumber: await getNextSequence('DO'), salesOrderId, sourceLocation, status: 'DRAFT',
      lines: {create: lines.map(line => ({productSku: line.productSku, orderedQty: line.quantity}))},
    },
    include: {lines: true},
  });
}

async function confirmSalesOrderImpl(orderId: string, actor: { id: string; name: string; role: Role }, sourceLocation = "WH-JKT") {
  permit(actor, ["HEAD_ADMIN","SALES"]);
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
    let deliveryOrder = await prisma.deliveryOrder.findFirst({where: {salesOrderId: order.id}, include: {lines: true}, orderBy: {createdAt:'asc'}});
    const remaining = order.lines.filter(line => line.quantity > line.deliveredQty)
      .map(line => ({id:line.id, productSku:line.productSku, quantity:line.quantity-line.deliveredQty}));
    if (!deliveryOrder && remaining.length) {
      const allocations = await prisma.stockReservation.findMany({where: {salesOrderLineId:{in:remaining.map(l=>l.id)}, quantity:{gt:0}}});
      const locations = new Set(allocations.map(a=>a.locationCode));
      if (locations.size !== 1 || remaining.some(line => !allocations.some(a=>a.salesOrderLineId===line.id && a.quantity===line.quantity))) {
        throw new Error('Reservasi lama tidak cocok dengan sisa pesanan. Periksa alokasi gudang sebelum menyiapkan pengiriman.');
      }
      deliveryOrder = await draftDelivery(order.id, allocations[0].locationCode, remaining);
      await recordAuditLog({actorId:actor.id,actorRole:actor.role,actorName:actor.name,action:'PREPARE_DELIVERY',documentType:'SO',documentId:order.orderNumber,afterData:{deliveryNumber:deliveryOrder.deliveryNumber}});
    }
    return {order, confirmedOrder:order, deliveryOrder, message:'Pesanan sudah dikonfirmasi. Reservasi dipertahankan.'};
  }

  editable(order.status);
  if (!await prisma.warehouseLocation.findFirst({ where: { code: sourceLocation, archivedAt: null } })) throw new Error("Lokasi pemenuhan tidak aktif atau tidak ditemukan.");
  uniqueLines(order.lines, l => l.productSku);
  for (const l of order.lines) { quantity(l.quantity); money(l.unitPrice); discount(l.discountPercent); }
  // 1. Discount Approval Check (SR-08 / T-10)
  if (order.discountPercent > DISCOUNT_APPROVAL_LIMIT &&
      !discountApproval(order, await getDiscountDecisions(prisma, [order])).discountApproved) {
    throw new AuditedRejection({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "CONFIRM_BLOCKED_DISCOUNT",
      documentType: "SO",
      documentId: order.orderNumber,
      notes: `Konfirmasi ${order.orderNumber} ditolak: Diskon ${order.discountPercent}% memerlukan persetujuan Owner (SR-08).`,
    }, `Persetujuan Diperlukan (SR-08 / T-10): Diskon ${order.discountPercent}% melebihi batas 10%. Memerlukan persetujuan Owner sebelum order dapat dikonfirmasi.`
    );
  }

  // 2. Credit Control Check (SR-09 / T-04)
  const creditCheck = await validateCreditCheck(order.contactId, order.totalGross);
  if (!creditCheck.allowed) {
    throw new AuditedRejection({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "CREDIT_LIMIT_EXCEEDED",
      documentType: "SO",
      documentId: order.orderNumber,
      notes: `Credit check gagal: ${creditCheck.reason}`,
    }, `Batas Kredit Terlampaui (SR-09 / T-04): ${creditCheck.reason}`
    );
  }

  // Reserve and fulfill from one explicitly selected active location.
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

    // B. Reserve available stock (SR-04 / F-07).
    for (const line of order.lines) {
      const stock = await tx.stockLevel.findUnique({ where: { productSku_locationCode: { productSku: line.productSku, locationCode: sourceLocation } } });
      const available = stock ? availableStock(stock) : 0;
      if (!stock || available < line.quantity) {
        throw new Error(`Stok ${line.productSku} di ${sourceLocation} tidak mencukupi untuk reservasi (SR-04). Diperlukan ${line.quantity}, tersedia ${available}.`);
      }
      await tx.stockLevel.update({ where: { id: stock.id }, data: { reserved: { increment: line.quantity } } });
      await tx.stockReservation.create({ data: { salesOrderLineId: line.id, locationCode: sourceLocation, quantity: line.quantity } });
    }

    // C. Create linked Delivery Order in DRAFT status
    const deliveryOrder = await draftDelivery(confirmedOrder.id, sourceLocation, order.lines);

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
    notes: `Sales Order ${order.orderNumber} dikonfirmasi. Reservasi dibuat di ${sourceLocation} dan DO ${result.deliveryOrder.deliveryNumber} terbentuk.`,
  });

  await advanceLeadForOrder(result.confirmedOrder, 'WON', actor);
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
  permit(actor, ["HEAD_ADMIN", "SALES"]);

  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });

  if (!order) throw new Error("Order tidak ditemukan.");

  // SR-08 / F-06: Price and discount locked once Confirmed
  if (order.status === OrderStatus.CONFIRMED || order.isPriceLocked) {
    throw new AuditedRejection({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "ILLEGAL_PRICE_EDIT_ATTEMPT",
      documentType: "SO",
      documentId: order.orderNumber,
      notes: `Percobaan ubah harga pada order ${order.orderNumber} yang sudah Confirmed dicegah (SR-08 / F-06).`,
    }, "Perubahan Tak Sah (SR-08 / F-06): Harga dan diskon telah dikunci setelah Sales Order dikonfirmasi. Perubahan ditolak."
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
      discountApproved: maxDiscount <= DISCOUNT_APPROVAL_LIMIT,
      discountApprovedBy: null,
    },
    include: { lines: true },
  });

  await recordAuditLog({ actorId: actor.id, actorName: actor.name, actorRole: actor.role, action: "UPDATE_QUOTATION", documentType: "SO", documentId: order.orderNumber, beforeData: order, afterData: updatedOrder });
  return updatedOrder;
}

export const createSalesQuotation = (...args: Parameters<typeof createSalesQuotationImpl>) => atomic(() => createSalesQuotationImpl(...args));

export const decideOrderDiscount = (...args: Parameters<typeof decideOrderDiscountImpl>) => atomic(() => decideOrderDiscountImpl(...args));

export function approveOrderDiscount(orderId: string, actor: Parameters<typeof decideOrderDiscountImpl>[1], reason: string) {
  return decideOrderDiscount(orderId, actor, { decision: "APPROVE", reason });
}

export const confirmSalesOrder = (...args: Parameters<typeof confirmSalesOrderImpl>) => atomic(() => confirmSalesOrderImpl(...args));

export const updateSalesOrderLine = (...args: Parameters<typeof updateSalesOrderLineImpl>) => atomic(() => updateSalesOrderLineImpl(...args));
