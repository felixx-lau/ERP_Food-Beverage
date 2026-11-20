import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateSalesOrderLine } from "@/lib/salesEngine";
import { availableStock } from "@/lib/stockPolicy";
import { calculateCustomerCreditStatus } from "@/lib/creditControl";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const order = await prisma.salesOrder.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        contact: true,
        lead: true,
        lines: { include: { product: true } },
        deliveryOrders: { include: { lines: true } },
        invoices: { include: { lines: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (request.nextUrl.searchParams.get("stockPreview") === "1") {
      const [locations, stock] = await Promise.all([
        prisma.warehouseLocation.findMany({
          where: { archivedAt: null }, select: { code: true, name: true }, orderBy: { name: "asc" },
        }),
        prisma.stockLevel.findMany({
          where: { productSku: { in: order.lines.map(line => line.productSku) } },
          select: { productSku: true, locationCode: true, onHand: true, reserved: true },
        }),
      ]);
      const byLocation = new Map(stock.map(level => [JSON.stringify([level.locationCode, level.productSku]), level]));
      const fulfillment = locations.map(location => {
        const lines = order.lines.map(line => {
          const level = byLocation.get(JSON.stringify([location.code, line.productSku])) ?? { onHand: 0, reserved: 0 };
          return {
            sku: line.productSku, name: line.product.name, unit: line.product.unit,
            quantity: line.quantity, available: availableStock(level),
          };
        });
        return { ...location, lines, sufficient: lines.length > 0 && lines.every(line => line.available >= line.quantity) };
      });
      return NextResponse.json({ success: true, fulfillment });
    }

    const [creditStatus, approval] = await Promise.all([
      calculateCustomerCreditStatus(order.contactId),
      order.discountPercent > 10 && order.discountApproved && order.discountApprovedBy
        ? prisma.auditLog.findFirst({
          where: {
            documentType: 'SO', documentId: order.orderNumber, action: 'APPROVE_DISCOUNT',
            actorName: order.discountApprovedBy, actorRole: { in: ['OWNER', 'HEAD_ADMIN'] },
          },
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
          select: { actorRole: true },
        })
        : null,
    ]);

    return NextResponse.json({
      success: true,
      order: { ...order, discountApprovalRole: approval?.actorRole ?? null },
      creditStatus,
    });
  } catch (error) {
    console.error("Fetch order detail error:", error);
    return NextResponse.json({ error: "Failed to fetch order detail" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { lineId, quantity, unitPrice, discountPercent } = body;

    const updated = await updateSalesOrderLine({
      orderId: id,
      lineId,
      quantity,
      unitPrice,
      discountPercent,
      actor: user,
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
