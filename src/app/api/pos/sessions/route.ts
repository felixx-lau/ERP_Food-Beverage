import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { openPosSession } from "@/lib/posEngine";

export async function GET(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessions = await prisma.posSession.findMany({
      where: user.role === "OWNER" ? {} : { cashierId: user.id },
      include: {
        cashier: { select: { id: true, name: true, role: true } },
        orders: { include: { lines: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ error: "Failed to fetch POS sessions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { sessionCode, locationCode, openingCash } = body;

    const session = await openPosSession({
      sessionCode,
      cashierId: user.id,
      locationCode,
      openingCash: openingCash || 0,
      actor: user,
    });

    return NextResponse.json({ success: true, session });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
