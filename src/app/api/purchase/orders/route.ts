import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createPurchaseQuotation } from "@/lib/purchaseEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.purchaseOrder.findMany({
      include: {
        vendor: true,
        lines: { include: { product: true } },
        receipts: { include: { lines: true } },
        bills: { include: { lines: true } },
      },
      orderBy: { orderDate: "desc" },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Fetch POs error:", error);
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { vendorId, lines, scheduledDate } = body;

    if (!vendorId || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "Vendor dan minimal satu baris item wajib disertakan." }, { status: 400 });
    }

    // Process each line item; if user typed a custom product name, auto-provision it
    const processedLines = [];
    for (const line of lines) {
      const inputSku = line.productSku ? String(line.productSku).trim() : "";
      const rawName = line.productName ? String(line.productName).trim() : inputSku;

      // 1. Try finding by SKU
      let variant = inputSku
        ? await prisma.productVariant.findUnique({ where: { sku: inputSku } })
        : null;

      // 2. If not found by SKU, try finding by Name
      if (!variant && rawName) {
        variant = await prisma.productVariant.findFirst({
          where: {
            name: { equals: rawName },
          },
        });
      }

      // 3. If still not found, auto-create product variant
      if (!variant) {
        const cleanSlug = (rawName || inputSku || "MAT")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 15);
        const autoSku = `${cleanSlug}-${Math.floor(100 + Math.random() * 900)}`;

        const cost = Math.max(500, Number(line.unitPrice) || 15000);
        const price = Math.round(cost * 1.5);

        let validVendorId: string | null = null;
        if (vendorId) {
          const v = await prisma.contact.findUnique({ where: { id: vendorId } });
          if (v) validVendorId = v.id;
        }

        variant = await prisma.productVariant.create({
          data: {
            sku: autoSku,
            name: rawName || autoSku,
            size: "Regular",
            color: "Original",
            unit: "porsi",
            salesPrice: price,
            standardCost: cost,
            defaultVendorId: validVendorId,
            stockLevels: {
              create: [
                { locationCode: "WH-JKT", onHand: 0, reserved: 0 },
                { locationCode: "CAFE-JKT", onHand: 0, reserved: 0 },
              ],
            },
          },
        });
      }

      processedLines.push({
        productSku: variant.sku,
        orderedQty: Math.max(1, Number(line.orderedQty) || 1),
        unitPrice: line.unitPrice !== undefined ? Number(line.unitPrice) : variant.standardCost,
      });
    }

    const order = await createPurchaseQuotation({
      vendorId,
      lines: processedLines,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      actor: user,
    });

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
