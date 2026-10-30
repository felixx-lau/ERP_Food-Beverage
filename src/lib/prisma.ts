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
  if (path.isAbsolute(clean) && fs.existsSync(clean)) {
    return clean;
  }
  const prismaDir = getPrismaDir();
  const candidatePrismaRelative = path.join(prismaDir, clean);
  if (fs.existsSync(candidatePrismaRelative)) {
    return candidatePrismaRelative;
  }
  const candidatePrismaBasename = path.join(prismaDir, path.basename(clean));
  if (fs.existsSync(candidatePrismaBasename)) {
    return candidatePrismaBasename;
  }
  const candidateDirect = path.resolve(clean);
  if (fs.existsSync(candidateDirect)) {
    return candidateDirect;
  }
  return path.join(prismaDir, "erp.db");
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

  try {
    const company = getCompanyById(companyId);
    const dbPath = getDatabasePathForCompany(company);
    return getClientForDbPath(dbPath);
  } catch (err) {
    console.error(`Failed to get client for company ${companyId}, falling back to default:`, err);
    const defaultUrl = ensureDatabaseExists();
    return getClientForDbPath(defaultUrl);
  }
}

// Global Proxy that routes all model calls and transactions to the active company client
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (prop === "then" || typeof prop === "symbol") return undefined;

    if (prop === "$transaction") {
      return async (...args: any[]) => {
        const client = await getActivePrismaClient();
        if (typeof args[0] === "function") {
          return client.$transaction(args[0], args[1]);
        }
        if (Array.isArray(args[0])) {
          try {
            return await (client as any).$transaction(...args);
          } catch (err: any) {
            if (err?.message?.includes("Prisma Client promises")) {
              return await Promise.all(args[0]);
            }
            throw err;
          }
        }
        return (client as any).$transaction(...args);
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
          const client = await getActivePrismaClient();
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
