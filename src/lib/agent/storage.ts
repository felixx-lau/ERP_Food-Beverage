import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function agentRoot() {
  return path.resolve(process.env.AGENT_DATA_DIR || path.join(process.cwd(), ".agent-data"));
}
export function storePath(kind: string, id: string) {
  if (!/^[a-z-]+$/.test(kind) || !/^[a-zA-Z0-9_-]{1,150}$/.test(id)) throw new Error("Identitas penyimpanan agent tidak valid.");
  return path.join(agentRoot(), kind, `${id}.json`);
}
export function saveRecord(kind: string, id: string, data: unknown) {
  const target = storePath(kind, id);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(temporary, target);
}
export function readRecord<T>(kind: string, id: string): T | null {
  try { return JSON.parse(fs.readFileSync(storePath(kind, id), "utf8")) as T; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
export function listRecords<T>(kind: string): T[] {
  const folder = path.join(agentRoot(), kind);
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder).filter(name => name.endsWith(".json")).map(name => readRecord<T>(kind, name.slice(0, -5))).filter((record): record is T => !!record);
}
export function lockRecord(kind: string, id: string) {
  const target = `${storePath(kind, id)}.lock`;
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const fd = fs.openSync(target, "wx", 0o600);
  return () => { fs.closeSync(fd); fs.unlinkSync(target); };
}

