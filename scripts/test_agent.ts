import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomBytes } from "node:crypto";
import { prisma, getActivePrismaClient } from "../src/lib/prisma";
import { executeSeed } from "../src/lib/seedData";
import type { SessionUser } from "../src/lib/auth";
import { authenticateTool, beginAgentRun, finishAgentRun } from "../src/lib/agent/capabilities";
import { dispatchAgentTool } from "../src/lib/agent/tools";
import { prepareProposal, executeProposal, ownProposal, cancelProposal } from "../src/lib/agent/proposals";
import { readRecord, saveRecord } from "../src/lib/agent/storage";
import type { AgentProposal } from "../src/lib/agent/proposals";

if (!path.basename(process.cwd()).startsWith("rasa-aruna-verification-") || path.dirname(fs.realpathSync(process.cwd())) !== fs.realpathSync(os.tmpdir())) throw new Error("Run through verify_isolated.py; this suite changes test data.");
process.env.AGENT_GATEWAY_SECRET = randomBytes(48).toString("hex");
process.env.AGENT_DATA_DIR = path.join(process.cwd(), ".agent-data-test");
let passes = 0;
async function test(name: string, run: () => Promise<void>) { await run(); passes++; console.log("[PASS]", name); }
async function main() {
  await executeSeed(prisma);
  const db = await getActivePrismaClient();
  const users = await db.user.findMany({ where: { active: true } });
  function actor(role: SessionUser["role"]): SessionUser { const u = users.find(u => u.role === role)!; assert(u); return { ...u, companyId: "default" }; }
  const owner = actor("HEAD_ADMIN"), sales = actor("SALES"), cashier = actor("CASHIER"), warehouse = actor("WAREHOUSE"), buyer = actor("PROCUREMENT");
  const context = (user: SessionUser) => ({ user, db, companyId: "default", runId: "test" });
  const product = await db.productVariant.findFirstOrThrow({ where: { archivedAt: null, stockLevels: { some: { locationCode: "WH-JKT", onHand: { gt: 1 } } } } });
  const customer = await db.contact.findFirstOrThrow({ where: { archivedAt: null, type: "CUSTOMER" } });
  const vendor = await db.contact.findFirstOrThrow({ where: { archivedAt: null, type: "VENDOR" } });
  await test("Cashier inventory hides costs/vendor and restricts cafe", async () => {
    const data = JSON.stringify(await dispatchAgentTool(context(cashier), "inventory", { query: product.sku }));
    assert(!data.includes("standardCost") && !data.includes("defaultVendorId") && !data.includes("WH-JKT"));
  });
  await test("Role permissions reject purchases, invoices and unknown actions", async () => {
    for (const action of ["purchase_orders", "invoices", "prepare_purchase_rfq", "execute", "__proto__"]) await assert.rejects(() => dispatchAgentTool(context(cashier), action, {}));
    const vendors:any = await dispatchAgentTool(context(sales), "contacts", { type: "VENDOR" });
    assert(vendors.contacts.every((c:any) => c.type === "VENDOR")); // Same read access as the website contacts page.
  });
  await test("Real capability expires at run end and limits concurrency", async () => {
    const run = await beginAgentRun(owner, "test");
    const ctx = await authenticateTool(run.token); assert.equal(ctx.companyId, "default"); assert.equal(ctx.user.id, owner.id);
    await assert.rejects(() => beginAgentRun(owner, "parallel"));
    await assert.rejects(() => authenticateTool(run.token + "broken"));
    finishAgentRun(run.id); await assert.rejects(() => authenticateTool(run.token));
  });
  await test("Revoked user session blocks an existing capability", async () => {
    const run = await beginAgentRun(sales, "revoke");
    await db.user.update({ where: { id: sales.id }, data: { sessionVersion: { increment: 1 } } });
    await assert.rejects(() => authenticateTool(run.token)); finishAgentRun(run.id);
    await db.user.update({ where: { id: sales.id }, data: { sessionVersion: sales.sessionVersion } });
  });
  await test("Capability cannot be reused for another company", async () => {
    const run = await beginAgentRun(owner, "company");
    const record: any = readRecord("runs", run.id); record.companyId = "different-company"; saveRecord("runs", run.id, record);
    await assert.rejects(() => authenticateTool(run.token)); finishAgentRun(run.id);
  });
  await test("Preparation validates SKU, quantity, duplicate lines and role", async () => {
    for (const lines of [[{ productSku: product.sku, quantity: 0 }], [{ productSku: "UNKNOWN", quantity: 1 }], [{ productSku: product.sku, quantity: 1 }, { productSku: product.sku, quantity: 1 }]]) await assert.rejects(() => prepareProposal(context(sales), "sales_quote", { contactId: customer.id, lines }));
    await assert.rejects(() => prepareProposal(context(cashier), "sales_quote", { contactId: customer.id, lines: [{ productSku: product.sku, quantity: 1 }] }));
  });
  const base = { contactId: customer.id, lines: [{ productSku: product.sku, quantity: 2, unitPrice: 30001, discountPercent: 5 }] };
  const before = { sales: await db.salesOrder.count(), po: await db.purchaseOrder.count(), transfers: await db.internalTransfer.count(), stock: await db.stockLevel.findMany({ orderBy: { id: "asc" } }), journals: await db.journalEntry.count() };
  const proposal = await prepareProposal(context(sales), "sales_quote", base);
  await test("Proposal preparation creates no business document; retry reuses it", async () => {
    assert.equal(await db.salesOrder.count(), before.sales);
    assert.equal((await prepareProposal(context(sales), "sales_quote", base)).id, proposal.id);
    assert.equal(proposal.total, Math.round(2 * 30001 * .95) + Math.round(Math.round(2 * 30001 * .95) * .1));
  });
  await test("Proposal bound to user/company; fingerprint tampering rejected", async () => {
    assert.throws(() => ownProposal(owner, proposal.id));
    assert.throws(() => ownProposal({ ...sales, companyId: "other" }, proposal.id));
    await assert.rejects(() => executeProposal(sales, proposal.id, "modified"));
  });
  await test("Explicit save creates exactly one DRAFT and engine totals match", async () => {
    const saved = await executeProposal(sales, proposal.id, proposal.fingerprint);
    const again = await executeProposal(sales, proposal.id, proposal.fingerprint);
    assert.equal(saved.result!.id, again.result!.id); assert.equal(await db.salesOrder.count(), before.sales + 1);
    const order = await db.salesOrder.findUniqueOrThrow({ where: { id: saved.result!.id } });
    assert.equal(order.status, "DRAFT"); assert.equal(order.totalGross, proposal.total);
  });
  await test("Changed master data invalidates review; cancel and expiry block save", async () => {
    const stale = await prepareProposal(context(sales), "sales_quote", { ...base, lines: [{ productSku: product.sku, quantity: 6 }] });
    await db.user.update({ where: { id: sales.id }, data: { sessionVersion: { increment: 1 } } });
    await assert.rejects(() => executeProposal(sales, stale.id, stale.fingerprint));
    await db.user.update({ where: { id: sales.id }, data: { sessionVersion: sales.sessionVersion } });
    const p = await prepareProposal(context(sales), "sales_quote", { ...base, lines: [{ productSku: product.sku, quantity: 3 }] });
    await db.productVariant.update({ where: { sku: product.sku }, data: { version: { increment: 1 } } });
    await assert.rejects(() => executeProposal(sales, p.id, p.fingerprint));
    cancelProposal(sales, p.id); await assert.rejects(() => executeProposal(sales, p.id, p.fingerprint));
    const exp = await prepareProposal(context(sales), "sales_quote", { ...base, lines: [{ productSku: product.sku, quantity: 4 }] });
    exp.expiresAt = new Date(0).toISOString(); saveRecord("proposals", exp.id, exp);
    await assert.rejects(() => executeProposal(sales, exp.id, exp.fingerprint));
  });
  await test("RFQ and transfer save through existing engines as DRAFT", async () => {
    for (const [user, kind, args] of [[buyer, "purchase_rfq", { vendorId: vendor.id, lines: [{ productSku: product.sku, quantity: 2 }] }], [warehouse, "transfer", { sourceLocation: "WH-JKT", destLocation: "CAFE-JKT", lines: [{ productSku: product.sku, quantity: 1 }] }]] as const) {
      const p = await prepareProposal(context(user), kind, args);
      if (kind === "transfer") assert.equal(p.total, 0);
      const saved = await executeProposal(user, p.id, p.fingerprint); assert.equal(saved.result!.status, "DRAFT");
    }
    assert.equal(await db.purchaseOrder.count(), before.po + 1); assert.equal(await db.internalTransfer.count(), before.transfers + 1);
  });
  await test("Draft saves leave stock and financial journals unchanged", async () => {
    assert.deepEqual(await db.stockLevel.findMany({ orderBy: { id: "asc" } }), before.stock);
    assert.equal(await db.journalEntry.count(), before.journals);
    assert((await db.auditLog.count()) > 0);
  });
  console.log(`${passes} agent checks passed in isolated database.`);
  await db.$disconnect();
}
main().catch(error => { console.error("[FAIL]", error); process.exitCode = 1; }).finally(() => fs.rmSync(process.env.AGENT_DATA_DIR!, { recursive: true, force: true }));
