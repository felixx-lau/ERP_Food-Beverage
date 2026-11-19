import { permittedOutlets } from "@/lib/outlets";
import { withUser } from "@/lib/apiResult";
import { createMaster } from "@/lib/masterData";
import { BusinessError } from "@/lib/validation";
import { money, textValue } from "@/lib/validation";
import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { STOCK_POLICY, availableStock, stockAttention } from "@/lib/stockPolicy";

export async function GET(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedCodes=user.role==="CASHIER"?(await permittedOutlets(user)).map(l=>l.code):null;
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

    const categories = await prisma.category.findMany({ where: { archivedAt: null }, select: { code: true, name: true } });
    const locations = await prisma.warehouseLocation.findMany({ where: { archivedAt: null, ...(user.role === "CASHIER" ? { code: { in: allowedCodes||[] } } : {}) }, select: { code: true, name: true }, orderBy: { code: "asc" } });
    const scoped = enriched.map(p => ({ ...p, lowStockLocations: locations.filter(location => stockAttention(p.stockLevels.find(s => s.locationCode === location.code) || { onHand: 0, reserved: 0 })).map(location => location.code), totalAvailable: p.stockLevels.reduce((n, s) => n + availableStock(s), 0) }));

    return NextResponse.json({ success: true, asOf: new Date().toISOString(), stockPolicy: STOCK_POLICY, locations, categories, products: user.role === "CASHIER" ? scoped.map(p => ({sku:p.sku,name:p.name,size:p.size,color:p.color,unit:p.unit,salesPrice:p.salesPrice,categoryCode:p.categoryCode,cafeStock:(allowedCodes||[]).includes("CAFE-JKT")?p.cafeStock:undefined,stockLevels:p.stockLevels.filter(s=>(allowedCodes||[]).includes(s.locationCode)).map(s=>({locationCode:s.locationCode,onHand:s.onHand,reserved:s.reserved,available:s.onHand-s.reserved}))})) : scoped });
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
