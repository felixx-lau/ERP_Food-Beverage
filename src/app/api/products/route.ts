import { withUser } from "@/lib/apiResult";
import { createMaster } from "@/lib/masterData";
import { BusinessError } from "@/lib/validation";
import { money, textValue } from "@/lib/validation";
import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await prisma.productVariant.findMany({
      where: request.nextUrl.searchParams.get("status") === "all" ? {} : { archivedAt: null },
      include: {
        stockLevels: {
          include: {
            location: true,
          },
        },
        defaultVendor: { select: { id: true, name: true } },
      },
      orderBy: { sku: "asc" },
    });

    const enriched = products.map((p) => {
      const whStock = p.stockLevels.find((s) => s.locationCode === "WH-JKT") || { onHand: 0, reserved: 0 };
      const cafeStock = p.stockLevels.find((s) => s.locationCode === "CAFE-JKT") || { onHand: 0, reserved: 0 };

      const totalOnHand = p.stockLevels.reduce((n,s) => n + s.onHand,0);
      const totalReserved = p.stockLevels.reduce((n,s) => n + s.reserved,0);
      const totalAvailable = totalOnHand - totalReserved;
      const totalValuation = totalOnHand * p.standardCost;

      return {
        ...p,
        whStock: {
          locationCode: "WH-JKT",
          onHand: whStock.onHand,
          reserved: whStock.reserved,
          available: whStock.onHand - whStock.reserved,
        },
        cafeStock: {
          locationCode: "CAFE-JKT",
          onHand: cafeStock.onHand,
          reserved: cafeStock.reserved,
          available: cafeStock.onHand - cafeStock.reserved,
        },
        totalOnHand,
        totalReserved,
        totalAvailable,
        totalValuation,
      };
    });

    return NextResponse.json({ success: true, products: user.role === "CASHIER" ? enriched.map(p => ({sku:p.sku,name:p.name,size:p.size,color:p.color,unit:p.unit,salesPrice:p.salesPrice,cafeStock:p.cafeStock})) : enriched });
  } catch (error) {
    console.error("Fetch products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return withUser(request, async user => {
    const body = await request.json();
    const resource = "products";
    if (Number(body.initialWhStock || 0) || Number(body.initialCafeStock || 0)) throw new BusinessError('Gunakan penyesuaian/penerimaan untuk stok awal.');
    const record = await createMaster(resource, body, user);
    return { success: true, product: record };
  });
}
