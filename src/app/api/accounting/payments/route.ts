import { idempotent } from "@/lib/atomic";
import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { registerCustomerPayment, registerVendorPayment } from "@/lib/accountingEngine";

export async function GET(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payments = await prisma.payment.findMany({
      include: {
        customer: true,
        vendor: true,
        invoice: true,
        bill: true,
      },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error("Fetch payments error:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { invoiceId, billId, paymentMethod = 'BANK', amount, paymentDate, notes } = body;
    if ((!invoiceId && !billId) || (invoiceId && billId)) return NextResponse.json({ error: 'Pilih tepat satu invoice atau vendor bill.' }, { status: 400 });
    const date = paymentDate ? new Date(paymentDate) : undefined;
    if (date && !Number.isFinite(date.getTime())) return NextResponse.json({ error: 'Tanggal pembayaran tidak valid.' }, { status: 400 });
    const result = await idempotent<Awaited<ReturnType<typeof registerCustomerPayment>> | Awaited<ReturnType<typeof registerVendorPayment>>>(user, 'REGISTER_PAYMENT', request.headers.get('idempotency-key') || undefined, body, () => billId
      ? registerVendorPayment({ billId, paymentMethod, amount, paymentDate: date, notes, actor: user })
      : registerCustomerPayment({ invoiceId, paymentMethod, amount, paymentDate: date, notes, actor: user }));

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
