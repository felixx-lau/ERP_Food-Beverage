import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PrismaClient, Role } from '@prisma/client';
import { NextRequest } from 'next/server';
import { createSessionToken } from '../src/lib/auth';
import { transactionContext } from '../src/lib/transactionContext';
import { permit } from '../src/lib/validation';
import { NAVIGATION_GROUPS } from '../src/components/Sidebar';
import { GET as me } from '../src/app/api/auth/me/route';
import { GET as metrics } from '../src/app/api/dashboard/metrics/route';
import { GET as profit } from '../src/app/api/dashboard/profit/route';
import { GET as users } from '../src/app/api/users/route';
import { GET as invoices } from '../src/app/api/accounting/invoices/route';
import { GET as removed, POST as removedPost } from '../src/app/api/advanced/route';
import { financialSummary } from '../src/lib/financialSummary';
async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'erp-role-access-'));
  cpSync(resolve('prisma/erp.db'), join(dir, 'test.db'));
  const db = new PrismaClient({ datasourceUrl: 'file:' + join(dir, 'test.db') });
  try {
    await transactionContext.run(db, async () => {
      const requestFor = async (role: Role, path: string) => {
        const u = await db.user.findFirstOrThrow({ where: { role, active: true } });
        const token = await createSessionToken({ ...u, companyId: 'default' });
        return new NextRequest('http://localhost:3000' + path, { headers: { cookie: `rasa_aruna_company=default; rasa_aruna_session=${token}` } });
      };
      assert.equal((await me(await requestFor('OWNER', '/api/auth/me'))).status, 200);
      assert.equal((await metrics(await requestFor('OWNER', '/api/dashboard/metrics'))).status, 200);
      assert.equal((await users(await requestFor('OWNER', '/api/users'))).status, 403);
      assert.equal((await invoices(await requestFor('OWNER', '/api/accounting/invoices'))).status, 200);
      const report = await profit(await requestFor('OWNER', '/api/dashboard/profit?start=2026-11-01&end=2026-11-18'));
      assert.equal(report.status, 200);
      const payload = await report.json();
      assert.equal(payload.summary.profit, (await financialSummary(db, '2026-11-01', '2026-11-18')).profit);
      assert.equal(payload.trend.length, 6);
      assert(!('trialBalance' in payload));
      assert.equal((await users(await requestFor('HEAD_ADMIN', '/api/users'))).status, 200);
      assert.equal((await metrics(await requestFor('HEAD_ADMIN', '/api/dashboard/metrics'))).status, 200);
      assert.equal((await profit(await requestFor('SALES', '/api/dashboard/profit'))).status, 403);
      assert.equal((await invoices(await requestFor('SALES', '/api/accounting/invoices'))).status, 200);
      assert.equal((await invoices(await requestFor('CASHIER', '/api/accounting/invoices'))).status, 403);
      assert.equal((await profit(await requestFor('FINANCE', '/api/dashboard/profit'))).status, 200);
      assert.equal(removed().status, 410); assert.equal(removedPost().status, 410);
      const nav = NAVIGATION_GROUPS.flatMap(g => g.items);
      const ownerPaths = nav.filter(i => i.roles.includes('OWNER')).map(i => i.href);
      for (const path of ['/sales/orders','/crm/leads','/purchase/orders','/inventory/products','/accounting/reports','/accounting/invoices','/pos','/dashboard']) assert(ownerPaths.includes(path));
      assert(nav.every(i => i.roles.includes('HEAD_ADMIN')));
      assert.deepEqual(nav.filter(i => i.href.startsWith('/operations')).map(i => i.href).sort(), ['/operations/production','/operations/purchase']);
      assert(ownerPaths.includes('/operations/purchase'));
      assert(!ownerPaths.includes('/operations/production'));
      assert.throws(() => permit({ name: 'Owner', role: 'OWNER' }, ['HEAD_ADMIN']));
      permit({ name: 'Admin', role: 'HEAD_ADMIN' }, ['FINANCE']);
      console.log('PASS: Owner module access with restricted administration, Admin, Finance, Sales, Cashier, ledger totals, navigation and removed modules.');
    });
  } finally { await db.$disconnect(); rmSync(dir, { recursive: true, force: true }); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
