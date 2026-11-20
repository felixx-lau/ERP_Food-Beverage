import { createHash } from 'node:crypto';
import type { SessionUser } from '@/lib/auth';
import type { WebsiteResult } from './websiteData';
import { readRecord, saveRecord } from './storage';

export type VerifiedRead = {
  action: 'inventory' | 'financial_summary' | 'sales_orders' | 'purchase_orders' | 'invoices' | 'records';
  args: Record<string, unknown>;
};

type Conversation = { expiresAt: number; read: VerifiedRead | null };
const rememberedActions = new Set(['inventory', 'financial_summary', 'sales_orders', 'purchase_orders', 'invoices', 'records']);

export function verifiedRead(results: WebsiteResult[]): VerifiedRead | null {
  if (results.length !== 1) return null;
  const { action, data } = results[0];
  if (!rememberedActions.has(action)) return null;
  const args = action === 'financial_summary' && data.period ? { start: data.period.start, end: data.period.end } : data.contextArgs;
  if (!args) return null;
  return { action: action as VerifiedRead['action'], args };
}

function conversationKey(user: SessionUser) {
  return createHash('sha256').update(JSON.stringify([user.companyId, user.id, user.role, user.sessionVersion])).digest('hex');
}

export function loadVerifiedRead(user: SessionUser, sessionId: string) {
  try {
    const entry = readRecord<Record<string, Conversation>>('chat-context', conversationKey(user))?.[sessionId];
    return entry && entry.expiresAt > Date.now() ? entry.read : null;
  } catch {
    console.warn('ERP chat context unavailable');
    return null;
  }
}

export function rememberVerifiedRead(user: SessionUser, sessionId: string, read: VerifiedRead | null) {
  const key = conversationKey(user);
  const now = Date.now();
  try {
    const previous = readRecord<Record<string, Conversation>>('chat-context', key) ?? {};
    const recent = Object.entries(previous).filter(([id, entry]) => id !== sessionId && entry.expiresAt > now)
      .sort(([, a], [, b]) => b.expiresAt - a.expiresAt).slice(0, 7);
    saveRecord('chat-context', key, Object.fromEntries([[sessionId, { expiresAt: now + 8 * 60 * 60 * 1000, read }], ...recent]));
  } catch {
    console.warn('ERP chat context could not be saved');
  }
}
