import { NextRequest } from "next/server";
import { withUser } from "@/lib/apiResult";
import { executeProposal } from "@/lib/agent/proposals";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withUser(request, async user => {
    const body = await request.json();
    return { proposal: await executeProposal(user, (await context.params).id, body.fingerprint) };
  });
}
