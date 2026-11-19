import { createHash, randomUUID } from "node:crypto";
import { PaymentTerms } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { idempotent } from "@/lib/atomic";
import { prisma } from "@/lib/prisma";
import { createSalesQuotation } from "@/lib/salesEngine";
import { createPurchaseQuotation } from "@/lib/purchaseEngine";
import { createInternalTransfer } from "@/lib/transferEngine";
import { BusinessError, permit, quantity, money, discount, textValue, uniqueLines } from "@/lib/validation";
import type { AgentContext } from "./capabilities";
import { listRecords, lockRecord, readRecord, saveRecord } from "./storage";

type Line = { productSku: string; quantity: number; unitPrice: number; discountPercent: number; name: string; version: number };
export type AgentProposal = {
  id: string; companyId: string; userId: string; kind: "sales_quote" | "purchase_rfq" | "transfer";
  title: string; createdAt: string; expiresAt: string; status: "PENDING" | "SAVED" | "CANCELLED";
  partyId?: string; partyName?: string; partyVersion?: number; lines: Line[];
  sourceLocation?: string; destLocation?: string; paymentTerms?: PaymentTerms;
  subtotal: number; tax: number; total: number; fingerprint: string;
  result?: { id: string; number: string; href: string; status: string };
};
const roles = { sales_quote: ["HEAD_ADMIN", "SALES"], purchase_rfq: ["HEAD_ADMIN", "PROCUREMENT"], transfer: ["HEAD_ADMIN", "WAREHOUSE"] };
function fingerprint(data: unknown) { return createHash("sha256").update(JSON.stringify(data)).digest("hex"); }
export function ownProposal(user: SessionUser, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new BusinessError("Proposal tidak ditemukan.", 404);
  const proposal = readRecord<AgentProposal>("proposals", id);
  if (!proposal || proposal.companyId !== (user.companyId || "default") || proposal.userId !== user.id) throw new BusinessError("Proposal tidak ditemukan.", 404);
  permit(user, roles[proposal.kind]);
  return proposal;
}
export function listOwnProposals(user: SessionUser, ids?: string[]) {
  return listRecords<AgentProposal>("proposals").filter(p => p.companyId === (user.companyId || "default") && p.userId === user.id && (!ids || ids.includes(p.id)) && (p.status !== "PENDING" || Date.parse(p.expiresAt) > Date.now())).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
}
export async function prepareProposal(ctx: AgentContext, kind: AgentProposal["kind"], args: Record<string, unknown>) {
  permit(ctx.user, roles[kind]);
  const rawLines = args.lines;
  if (!Array.isArray(rawLines) || rawLines.length < 1 || rawLines.length > 20) throw new BusinessError("Isi 1–20 baris SKU dan kuantitas.");
  const lines: Line[] = [];
  for (const raw of rawLines) {
    if (!raw || typeof raw !== "object") throw new BusinessError("Baris item tidak valid.");
    const sku = textValue(raw.productSku, "SKU", true, 100);
    const qty = quantity(raw.quantity ?? raw.orderedQty);
    const product = await ctx.db.productVariant.findFirst({ where: { sku, archivedAt: null } });
    if (!product) throw new BusinessError(`SKU ${sku} tidak terdaftar.`);
    const price = kind === "transfer" ? 0 : money(raw.unitPrice === undefined ? (kind === "sales_quote" ? product.salesPrice : product.standardCost) : raw.unitPrice);
    lines.push({ productSku: sku, quantity: qty, unitPrice: price, discountPercent: kind === "sales_quote" ? discount(raw.discountPercent ?? 0) : 0, name: product.name, version: product.version });
  }
  uniqueLines(lines, l => l.productSku);
  let partyId: string | undefined, partyName: string | undefined, partyVersion: number | undefined, paymentTerms: PaymentTerms | undefined;
  let sourceLocation: string | undefined, destLocation: string | undefined;
  if (kind !== "transfer") {
    const party = await ctx.db.contact.findFirst({ where: { id: textValue(args.contactId ?? args.vendorId, "ID pelanggan/vendor", true, 100), type: kind === "sales_quote" ? "CUSTOMER" : "VENDOR", archivedAt: null } });
    if (!party) throw new BusinessError("Pelanggan/vendor tidak terdaftar atau tidak sesuai jenis dokumen.");
    partyId = party.id; partyName = party.name; partyVersion = party.version;
    paymentTerms = party.paymentTerms;
    if (kind === "purchase_rfq") {
      for (const [index, line] of lines.entries()) {
        const raw = rawLines[index];
        if (raw?.unitPrice === undefined) {
          const price = await ctx.db.vendorPrice.findFirst({ where: { vendorId: party.id, productSku: line.productSku, archivedAt: null, minimumQty: { lte: line.quantity } }, orderBy: { minimumQty: "desc" } });
          if (price) line.unitPrice = money(price.price);
        }
      }
    }
  } else {
    sourceLocation = textValue(args.sourceLocation || "WH-JKT", "Lokasi asal", true, 100);
    destLocation = textValue(args.destLocation || "CAFE-JKT", "Lokasi tujuan", true, 100);
    if (sourceLocation === destLocation) throw new BusinessError("Lokasi asal dan tujuan harus berbeda.");
    for (const code of [sourceLocation, destLocation]) if (!await ctx.db.warehouseLocation.findFirst({ where: { code, archivedAt: null } })) throw new BusinessError("Lokasi tidak terdaftar.");
    for (const line of lines) {
      const stock = await ctx.db.stockLevel.findUnique({ where: { productSku_locationCode: { productSku: line.productSku, locationCode: sourceLocation } } });
      if (!stock || stock.onHand - stock.reserved < line.quantity) throw new BusinessError(`Stok tersedia ${line.productSku} belum cukup untuk usulan transfer.`);
    }
  }
  let subtotal = 0, tax = 0;
  for (const line of lines) { const net = Math.round(line.quantity * line.unitPrice * (1 - line.discountPercent / 100)); subtotal += net; if (kind === "sales_quote") tax += Math.round(net * .1); }
  money(subtotal); money(tax); money(subtotal + tax);
  const proposal: AgentProposal = { id: randomUUID(), companyId: ctx.companyId, userId: ctx.user.id, kind, title: kind === "sales_quote" ? "Draft penawaran penjualan" : kind === "purchase_rfq" ? "Draft permintaan penawaran pembelian" : "Draft transfer persediaan", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), status: "PENDING", partyId, partyName, partyVersion, paymentTerms, lines, sourceLocation, destLocation, subtotal, tax, total: subtotal + tax, fingerprint: "" };
  proposal.fingerprint = fingerprint({ kind, partyId, partyVersion, paymentTerms, lines, sourceLocation, destLocation, subtotal, tax });
  // Same proposal on a retried model/tool call reuses the pending card.
  const existing = listRecords<AgentProposal>("proposals").find(p => p.companyId === ctx.companyId && p.userId === ctx.user.id && p.status === "PENDING" && Date.parse(p.expiresAt) > Date.now() && p.fingerprint === proposal.fingerprint);
  if (existing) return existing;
  saveRecord("proposals", proposal.id, proposal);
  return proposal;
}
function proposalLock(id: string) {
  try { return lockRecord("proposals", id); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new BusinessError("Proposal sedang diproses. Tunggu lalu coba kembali.", 409); throw error; }
}
export async function executeProposal(user: SessionUser, id: string, expectedFingerprint: string) {
  ownProposal(user, id);
  const unlock = proposalLock(id);
  try { return await executeLocked(user, id, expectedFingerprint); } finally { unlock(); }
}
async function executeLocked(user: SessionUser, id: string, expectedFingerprint: string) {
  const proposal = ownProposal(user, id);
  if (proposal.fingerprint !== expectedFingerprint) throw new BusinessError("Isi proposal berbeda. Tinjau ulang.", 409);
  if (proposal.status === "SAVED") return proposal;
  if (proposal.status !== "PENDING" || Date.parse(proposal.expiresAt) < Date.now()) throw new BusinessError("Proposal dibatalkan atau kedaluwarsa. Siapkan ulang.", 409);
  const result = await idempotent(user, "AGENT_SAVE_DRAFT", `agent-${proposal.id}`, { fingerprint: proposal.fingerprint }, async () => {
  // Validate under the same writer transaction used by the business engines.
  const current = await prisma.user.findUnique({ where: { id: user.id } });
  if (!current?.active || current.role !== user.role || current.email !== user.email || current.sessionVersion !== user.sessionVersion) throw new BusinessError("Sesi pengguna berubah. Login kembali sebelum menyimpan draft.", 401);
  for (const line of proposal.lines) {
    const product = await prisma.productVariant.findFirst({ where: { sku: line.productSku, archivedAt: null } });
    if (!product || product.version !== line.version) throw new BusinessError("Data produk berubah. Siapkan proposal baru.", 409);
  }
  if (proposal.partyId) {
    const party = await prisma.contact.findFirst({ where: { id: proposal.partyId, archivedAt: null } });
    if (!party || party.version !== proposal.partyVersion) throw new BusinessError("Data pelanggan/vendor berubah. Siapkan proposal baru.", 409);
  }
    if (proposal.kind === "sales_quote") {
      const order = await createSalesQuotation({ contactId: proposal.partyId!, paymentTerms: proposal.paymentTerms, lines: proposal.lines.map(l => ({ productSku: l.productSku, quantity: l.quantity, unitPrice: l.unitPrice, discountPercent: l.discountPercent })), actor: user });
      return { id: order.id, number: order.orderNumber, href: `/sales/orders?id=${encodeURIComponent(order.id)}`, status: order.status };
    }
    if (proposal.kind === "purchase_rfq") {
      const order = await createPurchaseQuotation({ vendorId: proposal.partyId!, lines: proposal.lines.map(l => ({ productSku: l.productSku, orderedQty: l.quantity, unitPrice: l.unitPrice })), actor: user });
      return { id: order.id, number: order.poNumber, href: `/purchase/orders?id=${encodeURIComponent(order.id)}`, status: order.status };
    }
    const transfer = await createInternalTransfer({ sourceLocation: proposal.sourceLocation, destLocation: proposal.destLocation, lines: proposal.lines.map(l => ({ productSku: l.productSku, quantity: l.quantity })), actor: user });
    return { id: transfer.id, number: transfer.transferNumber, href: `/inventory/transfers?id=${encodeURIComponent(transfer.id)}`, status: transfer.status };
  });
  proposal.status = "SAVED"; proposal.result = result;
  saveRecord("proposals", id, proposal);
  return proposal;
}
export function cancelProposal(user: SessionUser, id: string) {
  ownProposal(user, id);
  const unlock = proposalLock(id);
  try {
    const proposal = ownProposal(user, id);
    if (proposal.status !== "PENDING") throw new BusinessError("Proposal tidak dapat dibatalkan.", 409);
    proposal.status = "CANCELLED"; saveRecord("proposals", id, proposal); return proposal;
  } finally { unlock(); }
}
