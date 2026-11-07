import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get("documentType");
    const documentId = searchParams.get("documentId");
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "50", 10) || 50));

    const where: Record<string, unknown> = {};
    if (!["OWNER","FINANCE"].includes(user.role)) where.actorId = user.id;
    where.documentType = { not: "REQUEST" };
    if (documentType && documentType !== "REQUEST") where.documentType = documentType;
    if (documentId) where.documentId = documentId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error("Audit log fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
