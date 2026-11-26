import type { PrismaClient } from '@prisma/client';
import { DISCOUNT_APPROVAL_LIMIT, mayViewQuotationMargin } from './discountPolicy';

export const DISCOUNT_DECISIONS = ['APPROVE_DISCOUNT', 'REJECT_DISCOUNT'];
export type DiscountOrder = {
  orderNumber: string;
  status: string;
  version: number;
  discountPercent: number;
  discountApproved: boolean;
  discountApprovedBy: string | null;
};

export async function getDiscountDecisions(db: PrismaClient, orders: DiscountOrder[]) {
  const numbers = orders.filter(order => order.discountPercent > DISCOUNT_APPROVAL_LIMIT).map(order => order.orderNumber);
  if (!numbers.length) return [];
  return db.auditLog.findMany({
    where: { documentType: 'SO', documentId: { in: numbers }, action: { in: DISCOUNT_DECISIONS } },
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    select: { documentId: true, action: true, actorRole: true, actorId: true, actorName: true, timestamp: true, afterState: true },
  });
}

type Decision = Awaited<ReturnType<typeof getDiscountDecisions>>[number];

export function discountApproval(order: DiscountOrder, decisions: Decision[]) {
  const required = order.discountPercent > DISCOUNT_APPROVAL_LIMIT;
  const decision = required ? decisions.find(event => event.documentId === order.orderNumber) : undefined;
  let state: { version?: number; reason?: string } | undefined;
  if (decision?.afterState) {
    try { state = JSON.parse(decision.afterState) ?? undefined; } catch { /* Old audit rows are optional. */ }
  }
  const current = decision?.actorRole === 'OWNER' && !!decision.actorId && !!state?.reason &&
    (order.status === 'DRAFT' ? state.version === order.version : state.version === order.version - 1);
  const historical = order.status !== 'DRAFT' && order.discountApproved;
  const approved = !!(current && decision?.action === 'APPROVE_DISCOUNT' && order.discountApproved) || historical;
  const status = !required ? 'NOT_REQUIRED' : approved ? 'APPROVED'
    : current && decision?.action === 'REJECT_DISCOUNT' ? 'REJECTED' : 'PENDING';
  return {
    discountApproved: !required || approved,
    discountApprovalStatus: status,
    discountApprovalRole: (current || historical) ? decision?.actorRole ?? null : null,
    discountApprovalReason: current ? state?.reason ?? null : null,
    discountApprovalAt: current ? decision?.timestamp ?? null : null,
    discountApprovedBy: approved ? order.discountApprovedBy : null,
    discountDecisionBy: current ? decision?.actorName ?? null : null,
  };
}

export function presentQuotation<T extends DiscountOrder>(order: T, role: string, decisions: Decision[]) {
  return { ...quotationForRole(order, role), ...discountApproval(order, decisions) };
}

export function quotationForRole<T>(order: T, role: string): T {
  if (mayViewQuotationMargin(role)) return order;
  const redacted = { ...order } as T & { projectedCost?: number; lines?: Record<string, any>[] };
  delete redacted.projectedCost;
  redacted.lines = redacted.lines?.map(line => {
    const copy = { ...line };
    delete copy.standardCost;
    if (copy.product) {
      copy.product = { ...copy.product };
      delete copy.product.standardCost;
    }
    return copy;
  });
  return redacted;
}
