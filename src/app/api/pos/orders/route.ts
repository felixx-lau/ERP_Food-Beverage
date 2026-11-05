import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createPosOrder } from "@/lib/posEngine";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.posOrder.findMany({
      include: {
        session: true,
        lines: { include: { product: true } },
      },
      orderBy: { orderDate: "desc" },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Fetch POS orders error:", error);
    return NextResponse.json({ error: "Failed to fetch POS orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { sessionId, locationCode = "CAFE-JKT", tableInfo, paymentMethod, lines } = body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: "Keranjang belanja tidak boleh kosong." }, { status: 400 });
    }

    // Process each line item; if user typed a custom menu/product, auto-provision it
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
          where: { name: { equals: rawName } },
        });
      }

      // 3. If still not found, auto-create product variant with default stock in CAFE-JKT & WH-JKT
      if (!variant) {
        const cleanSlug = (rawName || inputSku || "MENU")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 16);
        const autoSku = `${cleanSlug || "PROD"}-${Math.floor(100 + Math.random() * 900)}`;
        const price = Math.max(1000, Number(line.unitPrice) || 25000);
        const cost = Math.round(price * 0.6);

        const firstVendor = await prisma.contact.findFirst({ where: { type: "VENDOR" } });

        variant = await prisma.productVariant.create({
          data: {
            sku: autoSku,
            name: rawName || autoSku,
            size: "Regular",
            color: "Original",
            unit: "porsi",
            salesPrice: price,
            standardCost: cost,
            defaultVendorId: firstVendor?.id || null,
            stockLevels: {
              create: [
                { locationCode: "CAFE-JKT", onHand: 100, reserved: 0 },
                { locationCode: "WH-JKT", onHand: 100, reserved: 0 },
              ],
            },
          },
        });
      } else {
        // Ensure stock level exists at locationCode if missing
        const locCode = locationCode || "CAFE-JKT";
        const locStock = await prisma.stockLevel.findUnique({
          where: {
            productSku_locationCode: {
              productSku: variant.sku,
              locationCode: locCode,
            },
          },
        });
        if (!locStock) {
          await prisma.stockLevel.create({
            data: {
              productSku: variant.sku,
              locationCode: locCode,
              onHand: 100,
              reserved: 0,
            },
          });
        }
      }

      processedLines.push({
        productSku: variant.sku,
        quantity: Math.max(1, Number(line.quantity) || 1),
        unitPrice: line.unitPrice !== undefined ? Number(line.unitPrice) : variant.salesPrice,
      });
    }

    const result = await createPosOrder({
      sessionId,
      locationCode,
      tableInfo,
      paymentMethod,
      lines: processedLines,
      actor: user,
    });

    return NextResponse.json({ ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
