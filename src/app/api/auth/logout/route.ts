import type { NextRequest } from "next/server";
import { authorizeApi } from "@/lib/apiAuthorization";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;

  const user = await getCurrentUser(request);

  if (user) {
    await recordAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "LOGOUT",
      documentType: "AUTH",
      documentId: user.id,
      notes: `User ${user.name} logged out.`,
    });
  }

  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete("rasa_aruna_session");
  return response;
}
