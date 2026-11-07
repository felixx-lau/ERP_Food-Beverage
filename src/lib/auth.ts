import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { prisma, getActiveCompanyId } from "./prisma";
import { randomBytes } from "node:crypto";

const authGlobal = globalThis as typeof globalThis & { erpDevelopmentSecret?: string };
function secretKey() {
  const configured = process.env.JWT_SECRET;
  if (configured && configured !== 'rasa-aruna-kitchen-secure-jwt-token-key-2026' && configured.length >= 32) return new TextEncoder().encode(configured);
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET unik minimal 32 karakter wajib dikonfigurasi.');
  authGlobal.erpDevelopmentSecret ||= randomBytes(48).toString('hex');
  return new TextEncoder().encode(authGlobal.erpDevelopmentSecret);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId?: string;
  sessionVersion?: number;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId || await getActiveCompanyId(),
    sessionVersion: user.sessionVersion ?? 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.id !== "string" || !Object.values(Role).includes(payload.role as Role) || typeof payload.companyId !== "string") return null;
    return {
      companyId: payload.companyId,
      sessionVersion: Number(payload.sessionVersion),
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(request?: NextRequest): Promise<SessionUser | null> {
  let token: string | undefined;

  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = request.cookies.get("rasa_aruna_session")?.value;
    }
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get("rasa_aruna_session")?.value;
  }

  if (!token) return null;
  const session = await verifySessionToken(token);
  const companyId = request?.cookies.get('rasa_aruna_company')?.value || await getActiveCompanyId();
  if (!session || session.companyId !== companyId) return null;
  const current = await prisma.user.findUnique({ where: { id: session.id } });
  if (!current || !current.active || current.sessionVersion !== session.sessionVersion || current.email !== session.email || current.role !== session.role) return null;
  return { id: current.id, email: current.email, name: current.name, role: current.role, companyId, sessionVersion: current.sessionVersion };

}

export const MODULE_PERMISSIONS: Record<string, Role[]> = {
  sales: [Role.OWNER, Role.SALES],
  crm: [Role.OWNER, Role.SALES],
  purchase: [Role.OWNER, Role.PROCUREMENT],
  inventory: [Role.OWNER, Role.WAREHOUSE, Role.PROCUREMENT],
  accounting: [Role.OWNER, Role.FINANCE],
  invoicing: [Role.OWNER, Role.FINANCE, Role.SALES],
  pos: [Role.OWNER, Role.CASHIER],
  dashboard: [Role.OWNER, Role.FINANCE],
};

export function canAccessModule(role: Role, module: string): boolean {
  const allowed = MODULE_PERMISSIONS[module.toLowerCase()];
  if (!allowed) return false;
  return allowed.includes(role);
}
