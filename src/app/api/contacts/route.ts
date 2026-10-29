import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calculateCustomerCreditStatus } from "@/lib/creditControl";
import { recordAuditLog } from "@/lib/audit";
import { ContactType, CustomerType, PaymentTerms } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // CUSTOMER or VENDOR

    const where: Record<string, unknown> = {};
    if (type) where.type = type;

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
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      type = "CUSTOMER",
      customerType = "COMPANY",
      city = "Jakarta",
      creditLimit = 0,
      paymentTerms = "IMMEDIATE",
      openReceivable = 0,
      openPayable = 0,
    } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Nama kontak / pelanggan wajib diisi." }, { status: 400 });
    }

    const contactType = type === "VENDOR" ? ContactType.VENDOR : ContactType.CUSTOMER;
    const prefix = contactType === ContactType.VENDOR ? "V" : "C";

    // Auto-generate ID: find highest numeric ID for prefix
    const existing = await prisma.contact.findMany({
      where: {
        id: { startsWith: prefix },
      },
      select: { id: true },
    });

    let maxNum = 0;
    for (const item of existing) {
      const numPart = parseInt(item.id.replace(/\D/g, ""), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
    const nextId = `${prefix}${(maxNum + 1).toString().padStart(2, "0")}`;

    const newContact = await prisma.contact.create({
      data: {
        id: nextId,
        name: name.trim(),
        type: contactType,
        customerType:
          contactType === ContactType.CUSTOMER
            ? customerType === "INDIVIDUAL"
              ? CustomerType.INDIVIDUAL
              : CustomerType.COMPANY
            : null,
        city: city.trim() || "Jakarta",
        creditLimit: Math.max(0, Number(creditLimit) || 0),
        paymentTerms: (paymentTerms as PaymentTerms) || PaymentTerms.IMMEDIATE,
        openReceivable: Math.max(0, Number(openReceivable) || 0),
        openPayable: Math.max(0, Number(openPayable) || 0),
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role as any,
      action: "CREATE_CONTACT",
      documentType: "CONTACT",
      documentId: newContact.id,
      afterState: newContact as any,
      notes: `Kontak baru ${newContact.id} (${newContact.name}) berhasil ditambahkan.`,
    });

    return NextResponse.json({ success: true, contact: newContact });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Create contact error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
