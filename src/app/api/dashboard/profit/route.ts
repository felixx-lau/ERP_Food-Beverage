import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { prisma } from '@/lib/prisma';
import { permit } from '@/lib/validation';
import { financialSummary } from '@/lib/financialSummary';
export async function GET(request: NextRequest) {
  return withUser(request, async user => {
    permit(user, ['OWNER', 'HEAD_ADMIN', 'FINANCE']);
    const db = prisma;
    const summary = await financialSummary(db, request.nextUrl.searchParams.get('start') || undefined, request.nextUrl.searchParams.get('end') || undefined);
    // Calendar months in WIB; reuse the same journal rules as the selected period.
    const [year, month] = summary.period.end.split('-').map(Number);
    const trend = await Promise.all(Array.from({ length: 6 }, async (_, i) => {
      const d = new Date(Date.UTC(year, month - 6 + i, 1));
      const start = d.toISOString().slice(0, 10);
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
      const row = await financialSummary(db, start, end < summary.period.end ? end : summary.period.end);
      return { month: start.slice(0, 7), revenue: row.revenue - row.returns, expenses: row.expenses, profit: row.profit };
    }));
    return { success: true, summary, trend };
  });
}
