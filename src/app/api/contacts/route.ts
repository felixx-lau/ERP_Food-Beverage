import { withUser } from "@/lib/apiResult";
import { createMaster } from "@/lib/masterData";
import { BusinessError } from "@/lib/validation";
import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calculateCustomerCreditStatus } from "@/lib/creditControl";
import { recordAuditLog } from "@/lib/audit";
import { ContactType, CustomerType, PaymentTerms } from "@prisma/client";

export async function GET(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // CUSTOMER or VENDOR

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (searchParams.get("status") !== "all") where.archivedAt = null;

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { id: "asc" },
    });

    // If fetching customers, enrich with live credit status
    const enriched = await Promise.all(
      contacts.map(async (c) => {
        if (c.type === "CUSTOMER") {
          const status = await calculateCustomerCreditStatus(c.id);
          return {
            ...c,
            openingReceivable: c.openReceivable,
            openReceivable: status.openReceivable,
            creditExposure: status.creditExposure,
            creditHeadroom: status.creditHeadroom,
            grossConfirmedUninvoiced: status.grossConfirmedUninvoiced,
          };
        }
        return c;
      })
    );

    return NextResponse.json({ success: true, contacts: enriched });
  } catch (error) {
    console.error("Fetch contacts error:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return withUser(request, async user => {
    const body = await request.json();
    const resource = body.type === "VENDOR" ? "vendors" : "customers";
    if (Number(body.initialWhStock || 0) || Number(body.initialCafeStock || 0)) throw new BusinessError('Gunakan penyesuaian/penerimaan untuk stok awal.');
    const record = await createMaster(resource, body, user);
    return { success: true, contact: record };
  });
}
