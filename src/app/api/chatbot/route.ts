import { answerWebsiteQuestion, websiteActions, websiteReply } from "@/lib/agent/websiteData";
import { loadVerifiedRead, rememberVerifiedRead, verifiedRead } from "@/lib/agent/conversation";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/apiAuthorization";
import { getCurrentUser } from "@/lib/auth";
import { financialReply } from "@/lib/agent/financialReply";
import { chatConnectionMessage, extractChatReply } from "@/lib/chatbot";
import { beginAgentRun, finishAgentRun } from "@/lib/agent/capabilities";
import { listOwnProposals } from "@/lib/agent/proposals";
import { getActivePrismaClient } from "@/lib/prisma";
import { verifiedPageContext } from "@/lib/agent/pageContext";
import { agentPrompt } from "@/lib/agent/prompt";
import { BusinessError } from "@/lib/validation";

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

  // Keep conversation history separate for every company, user and new chat.
  const sessionId = createHash("sha256")
    .update(JSON.stringify([user.companyId, user.id, body.sessionId]))
    .digest("hex");

  // Read common data questions from the authenticated company's database on every request.
  // These answers remain available even if the optional language model is offline.
  try {
    const db = await getActivePrismaClient();
    const context = await verifiedPageContext(db, user, body.context);
    const previous = loadVerifiedRead(user, sessionId);
    const grounded = await answerWebsiteQuestion({db, user, companyId:user.companyId || 'default', runId:'direct-read'}, body.message.trim(), context, previous);
    if (grounded) {
      const { conversation, ...payload } = grounded;
      if (conversation !== undefined) rememberVerifiedRead(user, sessionId, conversation);
      return NextResponse.json(payload, {headers:{'Cache-Control':'no-store'}});
    }
  } catch (cause) {
    if (cause instanceof BusinessError) return error(cause.message,cause.status);
    console.error('ERP chatbot data read failed', {name:cause instanceof Error ? cause.name : 'Unknown'});
    return error('Data perusahaan belum berhasil dibaca. Coba kembali; belum ada angka yang dapat dikonfirmasi.',503);
  }

  const apiKey = process.env.LANGFLOW_API_KEY;
  const endpoint = process.env.LANGFLOW_API_URL;
  if (!apiKey || !endpoint) return error("Chatbot belum dikonfigurasi. Hubungi administrator.", 503);

  let runId: string | undefined;
  let stage = "start";
  try {
    const pageContext = await verifiedPageContext(await getActivePrismaClient(), user, body.context);
    const prompt = agentPrompt(user) + (pageContext ? `\nKonteks halaman terverifikasi: ${JSON.stringify(pageContext)}. Gunakan sebagai konteks jika relevan; panggil tool untuk angka dan rincian terbaru.` : "");
    const agent = await beginAgentRun(user, sessionId);
    runId = agent.id;
    const toolId = process.env.LANGFLOW_TOOL_COMPONENT_ID;
    const agentId = process.env.LANGFLOW_AGENT_COMPONENT_ID;
    if (!toolId || !agentId) return error("Flow agent belum dikonfigurasi.", 503);
    stage = "langflow_request";
    const gatewayUrl = process.env.AGENT_GATEWAY_URL || (process.env.APP_URL ? new URL("/api/agent/tools", process.env.APP_URL).toString() : "http://127.0.0.1:3000/api/agent/tools");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        output_type: "chat",
        input_type: "chat",
        input_value: body.message.trim(),
        session_id: sessionId,
        tweaks: { [toolId]: { capability: agent.token, gateway_url: gatewayUrl }, [agentId]: { system_prompt: prompt } },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(210_000),
    });
    if (!response.ok) {
      return error(response.status === 429
        ? "Chatbot sedang sibuk. Silakan coba beberapa saat lagi."
        : "Chatbot belum dapat menjawab. Silakan coba lagi nanti.", response.status === 429 ? 429 : 502);
    }
    stage = "langflow_response";
    const reply = extractChatReply(await response.json());
    if (!reply) return error("Chatbot belum mengirim jawaban. Silakan coba lagi.", 502);
    stage = "proposal_response";
    const completed = finishAgentRun(agent.id);
    const reads = completed?.readResults ?? [];
    const readReply = websiteReply(reads);
    const hasProposal = !!completed?.proposals.length;
    const verifiedReply = hasProposal
      ? 'Proposal sudah disiapkan dari data ERP. Tinjau rincian pada kartu sebelum menekan Simpan draft.'
      : readReply || (completed?.financialReports?.length ? financialReply(completed.financialReports) : 'Saya belum berhasil membaca data yang sesuai untuk pertanyaan ini. Sebutkan modul, nama produk atau nomor dokumen, serta periode yang ingin diperiksa. Saya tidak dapat mengonfirmasi angka tanpa sumber ERP.');
    if (reads.length || hasProposal) rememberVerifiedRead(user, sessionId, hasProposal ? null : verifiedRead(reads));
    return NextResponse.json({ reply: verifiedReply, actions: hasProposal ? [] : websiteActions(reads), proposals: listOwnProposals(user, completed?.proposals || []), toolsUsed: completed?.tools || [], asOf: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (cause instanceof BusinessError) return error(cause.message, cause.status);
    // Log diagnosis only; credentials, prompts, and business payloads stay private.
    console.error("Aruna agent request failed", { stage, name: cause instanceof Error ? cause.name : "Unknown", transportCode: (cause as { cause?: { code?: string } })?.cause?.code });
    const timeout = cause instanceof Error && ["TimeoutError", "AbortError"].includes(cause.name);
    return error(timeout
      ? "Waktu tunggu chatbot habis. Silakan coba lagi."
      : chatConnectionMessage(endpoint, cause), timeout ? 504 : 502);
  } finally { if (runId) finishAgentRun(runId); }
}
