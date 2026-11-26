import { transactionContext } from "./transactionContext";
import { PrismaClient } from "@prisma/client";
import { ensureDatabaseExists } from "./dbInit";
import { getCompanyById, getDatabasePathForCompany, getPrismaDir } from "./companyManager";
import path from "path";
import fs from "fs";

const globalForPrisma = globalThis as unknown as {
  prismaClients: Map<string, PrismaClient> | undefined;
};

const clientPool = globalForPrisma.prismaClients ?? new Map<string, PrismaClient>();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaClients = clientPool;
}

export async function getActiveCompanyId(): Promise<string> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const companyId = cookieStore.get("rasa_aruna_company")?.value;
    if (companyId) return companyId;
  } catch {
    // outside request context (CLI, build, etc.)
  }
  return "default";
}

export function resolveDbFilePath(rawPath: string): string {
  const clean = rawPath.replace(/^file:/, "");
  const prismaDir = getPrismaDir();
  const relative = path.normalize(clean);
  const candidate = path.isAbsolute(clean) ? clean
    : relative.startsWith(`prisma${path.sep}`) ? path.resolve(path.dirname(prismaDir), relative)
    : path.resolve(prismaDir, relative);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return fs.realpathSync(candidate);
  throw new Error(`Database tidak ditemukan: ${path.basename(clean)}. Tidak beralih ke perusahaan lain.`);
}

export function getClientForDbPath(dbPath: string): PrismaClient {
  const resolved = resolveDbFilePath(dbPath);
  if (!clientPool.has(resolved)) {
    const client = new PrismaClient({
      datasourceUrl: `file:${resolved}`,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
    clientPool.set(resolved, client);
  }
  return clientPool.get(resolved)!;
}

export async function getActivePrismaClient(): Promise<PrismaClient> {
  const companyId = await getActiveCompanyId();
  if (companyId === "default") {
    const defaultUrl = ensureDatabaseExists();
    return getClientForDbPath(defaultUrl);
  }

  const company = getCompanyById(companyId);
  return getClientForDbPath(getDatabasePathForCompany(company));
}

// Global Proxy that routes all model calls and transactions to the active company client
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (prop === "then" || typeof prop === "symbol") return undefined;

    if (prop === "$transaction") {
      return async (...args: any[]) => {
        const pinned = transactionContext.getStore();
        if (pinned) {
          if (typeof args[0] !== 'function') throw new Error('Gunakan transaksi callback.');
          return args[0](pinned);
        }
        if (typeof args[0] !== 'function') throw new Error('Gunakan transaksi callback agar operasi tetap atomik.');
        const client = await getActivePrismaClient();
        return client.$transaction((tx: any) => transactionContext.run(tx, () => args[0](tx)), args[1]);
      };
    }

    if (prop === "$connect" || prop === "$disconnect") {
      return async (...args: any[]) => {
        const client = await getActivePrismaClient();
        return (client as any)[prop](...args);
      };
    }

    return new Proxy({}, {
      get(modelTarget, methodProp) {
        if (methodProp === "then" || typeof methodProp === "symbol") return undefined;
        return async (...args: any[]) => {
          const client = transactionContext.getStore() || await getActivePrismaClient();
          const model = (client as any)[prop];
          if (!model) {
            throw new Error(`Prisma model '${String(prop)}' not found on client.`);
          }
          const method = model[methodProp];
          if (!method) {
            throw new Error(`Prisma method '${String(methodProp)}' not found on model '${String(prop)}'.`);
          }
          return method.apply(model, args);
        };
      },
    });
  },
});
