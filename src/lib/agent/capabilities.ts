import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { FinancialSummary } from "@/lib/financialSummary";
import type { PrismaClient } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { getCompanyById, getDatabasePathForCompany } from "@/lib/companyManager";
import { getClientForDbPath } from "@/lib/prisma";
import { BusinessError } from "@/lib/validation";
import { listRecords, readRecord, saveRecord } from "./storage";

export type AgentContext = { user: SessionUser; db: PrismaClient; companyId: string; runId: string };
export type RunRecord = {
  id: string; companyId: string; userId: string; sessionId: string; expiresAt: number;
  active: boolean; calls: number; proposals: string[]; tools: string[]; financialReports?: FinancialSummary[];
};
function key() {
  const secret = process.env.AGENT_GATEWAY_SECRET;
  if (!secret || secret.length < 32) throw new BusinessError("Secret gateway agent belum dikonfigurasi.", 503);
  return new TextEncoder().encode(secret);
}
export async function beginAgentRun(user: SessionUser, sessionId: string) {
  const id = randomUUID(), companyId = user.companyId || "default";
  if (listRecords<RunRecord>("runs").some(run => run.active && run.expiresAt > Date.now())) throw new BusinessError("Model lokal sedang mengerjakan pesan lain. Tunggu hingga selesai, lalu coba kembali.", 429);
  // Reserve synchronously before signing so two requests cannot start together.
  saveRecord("runs", id, { id, companyId, userId: user.id, sessionId, expiresAt: Date.now() + 300_000, active: true, calls: 0, proposals: [], tools: [] } satisfies RunRecord);
  try {
  const token = await new SignJWT({ kind: "aruna-agent-tool", runId: id, companyId, userId: user.id, role: user.role, sessionVersion: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(key());
  return { id, token };
  } catch (error) { finishAgentRun(id); throw error; }
}
export async function authenticateTool(token: string): Promise<AgentContext> {
  let claims;
  try { claims = (await jwtVerify(token, key(), { algorithms: ["HS256"] })).payload; }
  catch { throw new BusinessError("Akses tool kedaluwarsa atau tidak valid.", 401); }
  if (claims.kind !== "aruna-agent-tool" || typeof claims.runId !== "string" || typeof claims.companyId !== "string" || typeof claims.userId !== "string") throw new BusinessError("Akses tool tidak valid.", 401);
  const run = readRecord<RunRecord>("runs", claims.runId);
  if (!run?.active || run.expiresAt < Date.now() || run.companyId !== claims.companyId || run.userId !== claims.userId || run.calls >= 16) throw new BusinessError("Sesi tool sudah berakhir atau mencapai batas panggilan.", 401);
  const db = getClientForDbPath(getDatabasePathForCompany(getCompanyById(run.companyId)));
  const user = await db.user.findUnique({ where: { id: run.userId } });
  if (!user?.active || user.role !== claims.role || user.sessionVersion !== claims.sessionVersion) throw new BusinessError("Sesi pengguna berubah. Login kembali.", 401);
  run.calls += 1;
  saveRecord("runs", run.id, run);
  return { db, companyId: run.companyId, runId: run.id, user: { id: user.id, email: user.email, name: user.name, role: user.role, sessionVersion: user.sessionVersion, companyId: run.companyId } };
}
export function registerToolResult(runId: string, tool: string, proposalId?: string, financialReport?: FinancialSummary) {
  const run = readRecord<RunRecord>("runs", runId);
  if (!run) return;
  if (!run.tools.includes(tool)) run.tools.push(tool);
  if (tool === "financial_summary" && financialReport) run.financialReports = [...(run.financialReports || []), financialReport].slice(-3);
  if (proposalId && !run.proposals.includes(proposalId)) run.proposals.push(proposalId);
  saveRecord("runs", runId, run);
}
export function finishAgentRun(runId: string) {
  const run = readRecord<RunRecord>("runs", runId);
  if (run) { run.active = false; saveRecord("runs", runId, run); }
  return run;
}

