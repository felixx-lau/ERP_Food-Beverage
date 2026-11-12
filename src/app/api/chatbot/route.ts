import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/apiAuthorization";
import { getCurrentUser } from "@/lib/auth";
import { extractChatReply } from "@/lib/chatbot";

export const runtime = "nodejs";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const accessDenied = await authorizeApi(request);
  if (accessDenied) return accessDenied;
  const user = await getCurrentUser(request);
  if (!user) return error("Silakan login kembali untuk menggunakan chatbot.", 401);

  let body;
  try {
    if (Number(request.headers.get("content-length")) > 24_000) return error("Pesan terlalu panjang.", 413);
    const raw = await request.text();
    if (raw.length > 24_000) return error("Pesan terlalu panjang.", 413);
    body = JSON.parse(raw);
  } catch {
    return error("Format pesan tidak valid.", 400);
  }
  if (!body || typeof body.message !== "string" || !body.message.trim() || body.message.length > 4_000) {
    return error("Tulis pesan antara 1 sampai 4.000 karakter.", 400);
  }
  if (typeof body.sessionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.sessionId)) {
    return error("Sesi percakapan tidak valid. Mulai percakapan baru.", 400);
  }

  const apiKey = process.env.LANGFLOW_API_KEY;
  const endpoint = process.env.LANGFLOW_API_URL;
  if (!apiKey || !endpoint) return error("Chatbot belum dikonfigurasi. Hubungi administrator.", 503);

  // Keep conversation history separate for every company, user and new chat.
  const sessionId = createHash("sha256")
    .update(JSON.stringify([user.companyId, user.id, body.sessionId]))
    .digest("hex");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        output_type: "chat",
        input_type: "chat",
        input_value: body.message.trim(),
        session_id: sessionId,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      return error(response.status === 429
        ? "Chatbot sedang sibuk. Silakan coba beberapa saat lagi."
        : "Chatbot belum dapat menjawab. Silakan coba lagi nanti.", response.status === 429 ? 429 : 502);
    }
    const reply = extractChatReply(await response.json());
    if (!reply) return error("Chatbot belum mengirim jawaban. Silakan coba lagi.", 502);
    return NextResponse.json({ reply }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const timeout = cause instanceof Error && ["TimeoutError", "AbortError"].includes(cause.name);
    return error(timeout
      ? "Waktu tunggu chatbot habis. Silakan coba lagi."
      : "Chatbot tidak dapat dihubungi. Silakan coba lagi nanti.", timeout ? 504 : 502);
  }
}
