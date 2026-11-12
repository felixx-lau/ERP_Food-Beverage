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
