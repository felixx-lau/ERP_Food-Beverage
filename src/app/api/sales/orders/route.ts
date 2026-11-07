import { idempotent } from "@/lib/atomic";
import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createSalesQuotation } from "@/lib/salesEngine";

export async function GET(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.salesOrder.findMany({
      include: {
        contact: true,
        lines: { include: { product: true } },
        deliveryOrders: true,
        invoices: { include: { lines: true } },
      },
      orderBy: { orderDate: "desc" },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { contactId, leadId, lines, paymentTerms } = body;

    if (!contactId || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "Pelanggan dan minimal satu baris item wajib diisi." }, { status: 400 });
    }

    const processedLines: Array<{productSku:string;quantity:number;unitPrice:number;discountPercent:number}> = [];
    for (const line of lines) {
      const variant = typeof line.productSku === 'string' ? await prisma.productVariant.findUnique({ where: { sku: line.productSku.trim() } }) : null;
      if (!variant) return NextResponse.json({ error: 'Pilih SKU yang terdaftar. Buat produk melalui master produk terlebih dahulu.' }, { status: 400 });
      processedLines.push({ productSku: variant.sku, quantity: line.quantity, unitPrice: line.unitPrice ?? variant.salesPrice, discountPercent: line.discountPercent ?? 0 });
    }

    const order = await idempotent(user, "CREATE_SALES_ORDERS", request.headers.get("idempotency-key") || undefined, body, () => createSalesQuotation({
      contactId,
      leadId,
      lines: processedLines,
      paymentTerms,
      actor: user,
    }));

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
