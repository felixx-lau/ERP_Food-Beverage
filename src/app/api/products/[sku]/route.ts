import { withUser } from "@/lib/apiResult";
import { changeMaster } from "@/lib/masterData";
import { adjustStock } from "@/lib/inventoryEngine";
import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sku } = await params;
    const product = await prisma.productVariant.findUnique({
      where: { sku },
      include: {
        stockLevels: {
          include: { location: true },
        },
        defaultVendor: { select: { id: true, name: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (user.role === "CASHIER") return NextResponse.json({ success: true, product: { sku: product.sku, name: product.name, size: product.size, color: product.color, unit: product.unit, salesPrice: product.salesPrice, stock: product.stockLevels.filter(s => s.locationCode === "CAFE-JKT").map(s=>({locationCode:s.locationCode,onHand:s.onHand,reserved:s.reserved})) } });
    const wh = product.stockLevels.find((s) => s.locationCode === "WH-JKT") || { onHand: 0, reserved: 0 };
    const cafe = product.stockLevels.find((s) => s.locationCode === "CAFE-JKT") || { onHand: 0, reserved: 0 };

    const whAvailable = wh.onHand - wh.reserved;
    const cafeAvailable = cafe.onHand - cafe.reserved;
    const companyOnHand = wh.onHand + cafe.onHand;
    const companyReserved = wh.reserved + cafe.reserved;
    const companyAvailable = companyOnHand - companyReserved;

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        locations: [
          {
            locationCode: "WH-JKT",
            locationName: "Gudang Pusat Jakarta",
            onHand: wh.onHand,
            reserved: wh.reserved,
            available: whAvailable,
            valuation: wh.onHand * product.standardCost,
          },
          {
            locationCode: "CAFE-JKT",
            locationName: "Gerai Jakarta",
            onHand: cafe.onHand,
            reserved: cafe.reserved,
            available: cafeAvailable,
            valuation: cafe.onHand * product.standardCost,
          },
        ],
        companyOnHand,
        companyReserved,
        companyAvailable,
        totalValuation: companyOnHand * product.standardCost,
      },
    });
  } catch (error) {
    console.error("Fetch product detail error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  const denied = await authorizeApi(request); if (denied) return denied;
  try {
    const user = (await getCurrentUser(request))!;
    const { sku } = await params;
    const body = await request.json();
    if (body.newOnHand === undefined) return withUser(request, async actor => ({ success: true, product: await changeMaster("products",sku,body,actor) }));
    const result = await adjustStock({ sku, locationCode: body.locationCode, newOnHand: body.newOnHand, reason: body.reason, actor: user });
    return NextResponse.json({ success: true, ...result });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Penyesuaian gagal.' }, { status: 400 }); }
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{sku:string}>}) {return withUser(request,async user=>({success:true,...await changeMaster('products',(await params).sku,{version:Number(request.nextUrl.searchParams.get('version') ?? NaN)},user,true)}));}
