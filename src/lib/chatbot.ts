export function chatConnectionMessage(endpoint: string, cause: unknown) {
  const code = (cause as { cause?: { code?: string } })?.cause?.code;
  let local = false;
  try { local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(endpoint).hostname); } catch {}
  return local && code === 'ECONNREFUSED'
    ? 'Layanan AI lokal belum aktif. Di komputer ERP, buka "Mulai Asisten ERP.command" di folder proyek, tunggu sampai siap, lalu klik Coba lagi.'
    : 'Chatbot tidak dapat dihubungi. Silakan coba lagi nanti.';
}

/** Extract only the chat output, never flow inputs or internal execution data. */
export function extractChatReply(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const runs = (payload as { outputs?: unknown }).outputs;
  if (!Array.isArray(runs)) return null;

  for (const run of runs) {
    if (!run || !Array.isArray(run.outputs)) continue;
    for (const output of run.outputs) {
      const message = output?.results?.message;
      const candidates = [
        message?.text,
        message?.data?.text,
        output?.outputs?.message?.message,
        ...(Array.isArray(output?.messages)
          ? output.messages.filter((entry: { sender?: string }) => entry?.sender !== "User").map((entry: { message?: string; text?: string }) => entry?.message || entry?.text)
          : []),
      ];
      const reply = candidates.find((value) => typeof value === "string" && value.trim());
      if (reply) return reply.trim();
    }
  }
  return null;
}
