// Regression coverage for the expo audit fixes; isolated copies only.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prisma, getActivePrismaClient } from "../src/lib/prisma";
import { executeSeed } from "../src/lib/seedData";
import { createInternalTransfer, validateInternalTransfer } from "../src/lib/transferEngine";
import { openPosSession, createPosOrder } from "../src/lib/posEngine";
import { createSalesQuotation, confirmSalesOrder } from "../src/lib/salesEngine";
import { createPurchaseQuotation, confirmPurchaseOrder } from "../src/lib/purchaseEngine";
import { operationalOverview } from "../src/lib/operationalOverview";
import { financialReply } from "../src/lib/agent/financialReply";
import { financialSummary } from "../src/lib/financialSummary";
import { verifiedPageContext } from "../src/lib/agent/pageContext";
import { businessDate, businessDayStart, businessDayEnd } from "../src/lib/businessDate";
import { productChoiceLabel, resolveProductChoice } from "../src/lib/productChoice";
import { validateDeliveryOrder } from "../src/lib/deliveryEngine";
import { validateGoodsReceipt } from "../src/lib/purchaseEngine";
import { dispatchAgentTool } from "../src/lib/agent/tools";

if (!path.basename(process.cwd()).startsWith("rasa-aruna-verification-") || path.dirname(fs.realpathSync(process.cwd())) !== fs.realpathSync(os.tmpdir())) throw new Error("Use verify_isolated.py; never run this against a business database.");
const observations: unknown[] = [];
function observed(name: string, verdict: "PASS" | "GAP" | "LIMITATION", expected: unknown, actual: unknown) {
  observations.push({ name, verdict, expected, actual });
  console.log(verdict === "PASS" ? "[PASS]" : `[OBSERVED ${verdict}]`, name, JSON.stringify(actual));
}
async function main() {
  await executeSeed(prisma);
  const db = await getActivePrismaClient();
  const owner = { ...await db.user.findFirstOrThrow({ where: { role: "OWNER" } }), companyId: "default" };
  const cashier = { ...await db.user.findFirstOrThrow({ where: { role: "CASHIER" } }), companyId: "default" };
  const customer = await db.contact.findFirstOrThrow({ where: { type: "CUSTOMER", archivedAt: null } });
  const vendor = await db.contact.findFirstOrThrow({ where: { type: "VENDOR", archivedAt: null } });
  await db.warehouseLocation.create({ data: { code: "WH-BDG", name: "Audit third location", type: "Internal", usage: "Warehouse" } });
  for (const sku of ["AUDIT-MOVE", "AUDIT-RESTOCK", "AUDIT-ALLOCATION"]) await db.productVariant.create({ data: { sku, name: sku, size: "Regular", color: "Original", unit: "unit", salesPrice: 10000, standardCost: 5000 } });
  await db.stockLevel.createMany({ data: [
    { productSku: "AUDIT-MOVE", locationCode: "WH-JKT", onHand: 20, reserved: 3 },
    { productSku: "AUDIT-MOVE", locationCode: "WH-BDG", onHand: 0 },
    { productSku: "AUDIT-MOVE", locationCode: "CAFE-JKT", onHand: 0 },
    { productSku: "AUDIT-RESTOCK", locationCode: "WH-JKT", onHand: 50 },
    { productSku: "AUDIT-RESTOCK", locationCode: "WH-BDG", onHand: 2 },
    { productSku: "AUDIT-ALLOCATION", locationCode: "WH-JKT", onHand: 0 },
    { productSku: "AUDIT-ALLOCATION", locationCode: "WH-BDG", onHand: 100 },
  ] });
  const balance = async () => Object.fromEntries((await db.stockLevel.findMany({ where: { productSku: "AUDIT-MOVE" } })).map(s => [s.locationCode, s.onHand]));
  for (const [from, to, quantity] of [["WH-JKT", "WH-BDG", 4], ["WH-BDG", "CAFE-JKT", 2]] as const) {
    const draft = await createInternalTransfer({ sourceLocation: from, destLocation: to, lines: [{ productSku: "AUDIT-MOVE", quantity }], actor: owner });
    await validateInternalTransfer(draft.id, owner);
    const moves = await db.stockMove.count({ where: { documentRef: draft.transferNumber } });
    await validateInternalTransfer(draft.id, owner);
    assert.equal(await db.stockMove.count({ where: { documentRef: draft.transferNumber } }), moves);
  }
  const moved = await balance();
  assert.deepEqual(moved, { "WH-JKT": 16, "WH-BDG": 2, "CAFE-JKT": 2 });
  observed("Transfers involving a third registered location and repeat validation", "PASS", { "WH-JKT": 16, "WH-BDG": 2, "CAFE-JKT": 2, total: 20 }, { ...moved, total: Object.values(moved).reduce((a, b) => a + b, 0) });
  const oversized = await createInternalTransfer({ sourceLocation: "WH-JKT", destLocation: "WH-BDG", lines: [{ productSku: "AUDIT-MOVE", quantity: 14 }], actor: owner });
  await assert.rejects(() => validateInternalTransfer(oversized.id, owner));
  assert.deepEqual(await balance(), moved);
  observed("Transfer cannot consume stock reserved for other orders", "PASS", "Reject 14 when available = 16 - 3 = 13", "Rejected; all location balances unchanged");
  const quote = await createSalesQuotation({ contactId: customer.id, lines: [{ productSku: "AUDIT-ALLOCATION", quantity: 1, unitPrice: 10000 }], actor: owner });
  await assert.rejects(() => confirmSalesOrder(quote.id, owner, "MISSING"));
  assert.equal((await db.salesOrder.findUniqueOrThrow({where:{id:quote.id}})).status,"DRAFT");
  await assert.rejects(() => confirmSalesOrder(quote.id, owner));
  const sale=await confirmSalesOrder(quote.id, owner, "WH-BDG");
  assert.equal(sale.deliveryOrder!.sourceLocation,"WH-BDG");
  const reservations=await db.stockReservation.findMany({where:{line:{salesOrderId:quote.id}}});
  assert.equal(reservations.length,1);assert.equal(reservations[0].locationCode,"WH-BDG");
  const again=await confirmSalesOrder(quote.id,owner,"WH-JKT");assert.equal(again.deliveryOrder!.id,sale.deliveryOrder!.id);
  await validateDeliveryOrder({deliveryOrderId:sale.deliveryOrder!.id,items:sale.deliveryOrder!.lines.map(l=>({lineId:l.id,productSku:l.productSku,deliveredQty:1})),actor:owner});
  assert.equal((await db.stockLevel.findUniqueOrThrow({where:{productSku_locationCode:{productSku:"AUDIT-ALLOCATION",locationCode:"WH-BDG"}}})).onHand,99);
  observed("Sales reserves and delivers from the selected third warehouse; repeat confirmation is idempotent", "PASS", "BDG 100 → 99, JKT unchanged", "Verified with real fulfillment");
  const po = await createPurchaseQuotation({ vendorId: vendor.id, lines: [{ productSku: "AUDIT-RESTOCK", orderedQty: 20, unitPrice: 5000 }], actor: owner });
  const confirmed = await confirmPurchaseOrder(po.id, owner);
  assert.equal(confirmed.receipt!.destLocation, "WH-JKT");
  const plan=()=>dispatchAgentTool({user:owner,db,companyId:"default",runId:"audit"},"restock_plan",{location:"WH-BDG",query:"AUDIT-RESTOCK",threshold:20,target:30}) as Promise<any>;
  let item=(await plan()).items[0];assert.equal(item.openPurchaseQty,0);assert.equal(item.suggestedQty,28);
  observed("Restock ignores receipts to another warehouse", "PASS", 28,item.suggestedQty);
  const eta=new Date(Date.now()+2*86400000);
  const po2=await createPurchaseQuotation({vendorId:vendor.id,scheduledDate:eta,lines:[{productSku:"AUDIT-RESTOCK",orderedQty:20,unitPrice:5000}],actor:owner});
  const received=await confirmPurchaseOrder(po2.id,owner,"WH-BDG");
  assert.equal(received.receipt!.scheduledDate.getTime(),eta.getTime());
  item=(await plan()).items[0];assert.equal(item.openPurchaseQty,20);assert.equal(item.suggestedQty,8);
  await db.goodsReceipt.update({where:{id:received.receipt!.id},data:{scheduledDate:new Date(Date.now()+40*86400000)}});
  item=(await plan()).items[0];assert.equal(item.openPurchaseQty,0);assert.equal(item.suggestedQty,28);
  await db.goodsReceipt.update({where:{id:received.receipt!.id},data:{scheduledDate:eta}});
  const partial=await validateGoodsReceipt({receiptId:received.receipt!.id,items:received.receipt!.lines.map(l=>({lineId:l.id,productSku:l.productSku,acceptedQty:5,rejectedQty:0})),actor:owner});
  assert.equal(partial.backorderReceipt!.destLocation,"WH-BDG");assert.equal(partial.backorderReceipt!.scheduledDate.getTime(),eta.getTime());
  item=(await plan()).items[0];assert.equal(item.available,7);assert.equal(item.openPurchaseQty,15);assert.equal(item.suggestedQty,8);
  observed("Restock counts destination, ETA horizon and remaining partial receipts once", "PASS", {available:7,inbound:15,suggested:8},{available:item.available,inbound:item.openPurchaseQty,suggested:item.suggestedQty});
  const before=await balance();
  await assert.rejects(()=>openPosSession({cashierId:cashier.id,locationCode:"WH-JKT",openingCash:0,actor:cashier}));
  const legacy=await openPosSession({cashierId:cashier.id,locationCode:"WH-JKT",openingCash:0,actor:owner});
  await assert.rejects(()=>createPosOrder({sessionId:legacy.id,locationCode:"WH-JKT",lines:[{productSku:"AUDIT-MOVE",quantity:1}],paymentMethod:"CASH",actor:cashier}));
  assert.deepEqual(await balance(),before);
  const session=await openPosSession({cashierId:cashier.id,locationCode:"CAFE-JKT",openingCash:0,actor:cashier});
  await createPosOrder({sessionId:session.id,locationCode:"CAFE-JKT",lines:[{productSku:"AUDIT-MOVE",quantity:1}],paymentMethod:"CASH",actor:cashier});
  assert.equal((await balance())["CAFE-JKT"],1);
  observed("Cashier cannot open/sell WH sessions, including a preexisting warehouse session; CAFE sale works", "PASS", "SR-03 enforced", "Verified without WH stock changes");
  assert.equal(businessDate(new Date("2026-11-14T17:30:00Z")),"2026-11-15");
  assert.equal(businessDayStart("2026-11-15").toISOString(),"2026-11-14T17:00:00.000Z");
  assert.equal(businessDayEnd("2026-11-15").toISOString(),"2026-11-15T16:59:59.999Z");
  assert.throws(()=>businessDayStart("2026-02-30"));
  const variants=[{sku:"A",name:"Matcha",size:"Small"},{sku:"B",name:"Matcha",size:"Large"}];
  assert.equal(resolveProductChoice(variants,"Matcha"),undefined);assert.equal(resolveProductChoice(variants,productChoiceLabel(variants[1]))?.sku,"B");
  observed("WIB date boundaries and ambiguous variant selection", "PASS", "Correct day; explicit variant required", "Verified");
  const overview=await operationalOverview(db,owner);assert(overview.tasks.every(t=>!t.href.includes('/inventory/deliveries')));
  const cashierOverview=await operationalOverview(db,cashier);assert(cashierOverview.tasks.every(t=>t.href==='/pos'));assert(!JSON.stringify(cashierOverview).includes("Finance"));
  await assert.rejects(()=>dispatchAgentTool({user:cashier,db,companyId:"default",runId:"audit"},"financial_summary",{}));
  assert.equal(await verifiedPageContext(db,cashier,{path:"/accounting/reports",documentId:quote.id}),null);
  const context=await verifiedPageContext(db,owner,{path:"/sales/orders",documentId:quote.id});assert.equal(context?.document?.reference,quote.orderNumber);
  const missing=await verifiedPageContext(db,owner,{path:"/sales/orders",documentId:"foreign-id"});assert.equal(missing?.document,undefined);
  observed("Worklist and page context respect role and source-record scope", "PASS", "No finance context for cashier", "Verified");
  const income=await db.account.findFirstOrThrow({where:{type:"INCOME"}}),asset=await db.account.findFirstOrThrow({where:{type:"ASSET"}});
  for(const [suffix,date,amount,state] of [["inside","2026-02-01T00:30:00+07:00",123456,"POSTED"],["outside","2026-01-31T23:30:00+07:00",222222,"POSTED"],["draft","2026-02-01T01:30:00+07:00",333333,"DRAFT"]] as const) await db.journalEntry.create({data:{entryNumber:`EXPO-${suffix}`,documentRef:`EXPO-${suffix}`,sourceDocument:"EXPO",journalType:"GENERAL",state,date:new Date(date),items:{create:[{accountCode:income.code,label:"test",credit:amount},{accountCode:asset.code,label:"test",debit:amount}]}}});
  const summary=await financialSummary(db,"2026-02-01","2026-02-01");assert.equal(summary.revenue,123456);assert.equal(summary.profit,123456);
  const rendered=financialReply([summary]);assert(rendered.includes("123.456"));assert(!rendered.includes("Simpan draft"));assert(rendered.includes("2026-02-01"));
  await assert.rejects(()=>financialSummary(db,"2026-02-02","2026-02-01"));
  observed("Period financial summary uses posted journals and WIB boundaries", "PASS",123456,summary.revenue);
  fs.writeFileSync("expo-improvements-results.json",JSON.stringify({generatedAt:new Date().toISOString(),isolated:true,observations},null,2));
  await db.$disconnect();
}
main().catch(error => { console.error("[FAIL] Audit execution", error); process.exitCode = 1; });
