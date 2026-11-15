import { authorizeApi } from "@/lib/apiAuthorization";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { confirmSalesOrder } from "@/lib/salesEngine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const raw = await request.text();
    const body = raw.trim() ? JSON.parse(raw) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body) || (body.sourceLocation !== undefined && (typeof body.sourceLocation !== 'string' || !body.sourceLocation.trim()))) throw new Error('Lokasi tidak valid.');
    const result = await confirmSalesOrder(id, user, body.sourceLocation);

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
