import { NextRequest } from "next/server";
import { withUser } from "@/lib/apiResult";
import { listOwnProposals } from "@/lib/agent/proposals";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return withUser(request, async user => ({ proposals: listOwnProposals(user) })); }
