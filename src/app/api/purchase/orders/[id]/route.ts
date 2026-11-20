import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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
    const order = await prisma.purchaseOrder.findFirst({
      where: {
        OR: [{ id }, { poNumber: id }],
      },
      include: {
        vendor: true,
        lines: { include: { product: true } },
        receipts: { include: { lines: true } },
        bills: { include: { lines: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Purchase Order tidak ditemukan." }, { status: 404 });
    }

    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { purchaseOrderId: order.id }, select: { id: true, number: true, locationCode: true },
    });
    return NextResponse.json({ success: true, order: { ...order, purchaseRequest } });
  } catch (error) {
    console.error("Fetch PO detail error:", error);
    return NextResponse.json({ error: "Failed to fetch PO detail" }, { status: 500 });
  }
}
