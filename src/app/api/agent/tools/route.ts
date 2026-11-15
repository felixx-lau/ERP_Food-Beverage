import { NextRequest, NextResponse } from "next/server";
import { apiFailure } from "@/lib/apiResult";
import { authenticateTool, registerToolResult } from "@/lib/agent/capabilities";
import { dispatchAgentTool } from "@/lib/agent/tools";
import type { FinancialSummary } from "@/lib/financialSummary";
import { BusinessError } from "@/lib/validation";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) throw new BusinessError("Akses tool diperlukan.", 401);
    const ctx = await authenticateTool(authorization.slice(7));
    const raw = await request.text();
    if (raw.length > 24_000) throw new BusinessError("Permintaan terlalu panjang.", 413);
    const body = JSON.parse(raw);
    if (typeof body?.action !== "string" || !body.args || typeof body.args !== "object" || Array.isArray(body.args)) throw new BusinessError("Isi action dan args dengan benar.");
    const result = await dispatchAgentTool(ctx, body.action, body.args);
    registerToolResult(ctx.runId, body.action, (result as { proposalId?: string })?.proposalId, body.action === "financial_summary" ? result as FinancialSummary : undefined);
    return NextResponse.json({ success: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
