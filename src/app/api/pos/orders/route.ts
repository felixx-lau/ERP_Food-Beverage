import { idempotent } from "@/lib/atomic";
import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createPosOrder } from "@/lib/posEngine";

export async function GET(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.posOrder.findMany({
      where: user.role === "OWNER" ? {} : { session: { cashierId: user.id } },
      include: {
        session: true,
        lines: { include: { product: true } },
      },
      orderBy: { orderDate: "desc" },
    });

    const promotions = await prisma.posPromotion.findMany({where:{orderId:{in:orders.map(order=>order.id)}}});
    const coupons = await prisma.promotionCoupon.findMany({where:{id:{in:promotions.flatMap(p=>p.couponId ? [p.couponId] : [])}}});
    return NextResponse.json({ success: true, orders: orders.map(order=>{ const p=promotions.find(p=>p.orderId===order.id); return {...order,promotion:p ? {...p,couponCode:coupons.find(c=>c.id===p.couponId)?.code} : null}; }) });
  } catch (error) {
    console.error("Fetch POS orders error:", error);
    return NextResponse.json({ error: "Failed to fetch POS orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { sessionId, locationCode = "CAFE-JKT", tableInfo, paymentMethod, lines, loyaltyAccountId, couponCode } = body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "Keranjang belanja tidak boleh kosong." }, { status: 400 });
    }

    const processedLines: Array<{ productSku: string; quantity: number; unitPrice: number; discountPercent: number }> = [];
    for (const line of lines) {
      const variant = typeof line.productSku === 'string' ? await prisma.productVariant.findUnique({ where: { sku: line.productSku.trim() } }) : null;
      if (!variant) return NextResponse.json({ error: 'Pilih SKU yang terdaftar. Buat produk melalui master produk terlebih dahulu.' }, { status: 400 });
      processedLines.push({ productSku: variant.sku, quantity: line.quantity, unitPrice: line.unitPrice ?? variant.salesPrice, discountPercent: line.discountPercent ?? 0 });
    }

    const result = await idempotent(user, "POS_CHECKOUT", request.headers.get("idempotency-key") || undefined, body, () => createPosOrder({
      sessionId,
      locationCode,
      tableInfo,
      paymentMethod,
      loyaltyAccountId, couponCode,
      lines: processedLines,
      actor: user,
    }));

    return NextResponse.json({ ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
