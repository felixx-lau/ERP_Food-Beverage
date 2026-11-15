import { NextRequest } from "next/server";
import { withUser } from "@/lib/apiResult";
import { cancelProposal } from "@/lib/agent/proposals";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withUser(request, async user => ({ proposal: cancelProposal(user, (await context.params).id) }));
}
