# Prioritized implementation plan for approval

> Laporan historis sebelum implementasi. Pengguna telah menyetujui rencana; lihat [hasil implementasi dan verifikasi terbaru](../implementation-2026-11-06/IMPLEMENTATION.md). Temuan/status di bawah tidak otomatis menggambarkan kode terbaru.

Date: 6 November 2026. This is a proposed plan, not an implementation log. No schema or application changes have been made. Basis: [AUDIT.md](AUDIT.md), [PDF_COMPLIANCE.md](PDF_COMPLIANCE.md), [TEST_REPORT.md](TEST_REPORT.md).

## Scope and architecture decisions

Retain Next.js, React, Prisma, SQLite, existing route structure, six roles, domain engines, SKU identities, document relationships, baseline seed, and the blue/purple component foundation. Extend the current system in small vertical slices: database model where needed, validated API/domain operation, permission-aware website form, persistence/integration test and regression evidence.

Do not rebuild the ERP, replace SQLite by preference, reset existing companies, or expose a generic delete endpoint for transaction trees. Keep existing business policies: delivered-only invoicing, protection of reserved stock, accepted-receipt three-way matching, and recorded Owner approval above 10% discount. Preserve contradictory stakeholder requests and trade-offs in Decision Defense.

The current application has valid local persistence but not proven hosting durability. Before deployment, choose a durable SQLite hosting layout with backups/restore and a concurrency model. Changing to another database is outside this proposed default and requires a demonstrated deployment need and reviewed migration.

## Proposed permission matrix

Owner can perform all **permitted** actions in authorized companies, but cannot bypass posting invariants or delete financial history. Read access and mutation access are separate permissions. All server operations must derive company/actor from validated context and enforce ownership where applicable; frontend capabilities only reflect those checks.

| Area | Read | Create / draft edit | Confirm / post / sensitive action | Archive / safe delete |
| --- | --- | --- | --- | --- |
| Customers / CRM | Sales, Finance, Owner; Warehouse only fulfillment details as needed | Sales, Owner | Credit limit changes: Owner; Sales can request approval. Finance can view credit exposure. | Sales, Owner with dependency checks; credit/balance restrictions still apply. |
| Vendors / price lists | Procurement, Finance, Owner; Warehouse receipt details | Procurement, Owner | Approved supplier terms/prices: Procurement, Owner | Procurement, Owner with dependency checks. |
| SKU products / categories / UoM | Sales, Warehouse, Procurement, Owner; Cashier only eligible POS fields; Finance valuation as needed | Warehouse, Owner | Price/cost changes under explicit permission; cost revaluation via Finance/Owner posting if stock exists | Warehouse, Owner; no destructive deletion of stock/financial history. |
| Warehouses / locations | Warehouse, Procurement, Owner; others only required selection/detail | Warehouse, Owner | Warehouse operations; financial valuation under Finance/Owner policy | Warehouse, Owner only if no stock/reservations/documents, otherwise archive. |
| Reservations / delivery / transfers / receipt | Warehouse, Procurement and relevant order owner; financial views Finance/Owner | Warehouse; Procurement drafts PO-related receiving intent | Warehouse, Owner validate physical movements/acceptance | Draft cancel with allocation release; completed movement reversal only. |
| RFQ / PO | Procurement, Owner; Warehouse receiving and Finance bill-source views | Procurement, Owner | Procurement, Owner confirm | Cancel drafts/unreceived remainder under lifecycle policy; preserve completed history. |
| Quotation / SO | Sales, Owner; Warehouse fulfillment and Finance invoice-source views | Sales, Owner | Sales/Owner confirm within approved policies; only Owner approves high discount | Draft cancel; confirmed cancel only with validated reservation/document release. |
| Invoice / bill / credit note / payment | Finance, Owner; Sales customer sales-document subset | Finance, Owner | Finance, Owner post/register/reverse; return receipt accepted by Warehouse first | Cancel eligible drafts; posted corrections through linked reversal. |
| Accounts / GL / financial reports | Finance, Owner | Finance, Owner maintain permitted accounts | Finance, Owner post eligible adjustments/reversals; immutable posted entry | Delete unused permitted accounts only; otherwise archive. |
| POS | Cashier's assigned sessions/history, Owner | Cashier, Owner | Same authorized cashier/session, Owner overrides only where explicitly recorded | Draft basket changes; completed sale refund/reversal workflow. |
| Dashboard | Role-specific operational summaries; financial reconciliation Finance/Owner | No financial mutations | No automatic reconciliation posting | Not applicable. |
| Users / company administration | Owner | Owner | Explicit privileged role assignment, membership and account/session management | Deactivate/archive; company data deletion outside ordinary operating UI. |

This refines the PDF's role responsibilities; the PDF does not provide a complete field-level CRUD policy. Document these operational choices explicitly rather than claiming they are verbatim PDF rules. Test both unauthorized requests and missing company membership, including read endpoints.

## Proposed schema changes, subject to approval

| Change | Purpose / integrity requirement |
| --- | --- |
| Contact email/phone/address, archive fields, version | Persist requested contact details; safe archive/restore and stale-write detection. Ordinary contact CRUD cannot set ledger/opening balances. |
| Product description/category, archive fields, version | Requested master administration without changing SKU identity or historical line snapshots. |
| Category / governed UoM records | Stable selectable classification and units; do not introduce automatic stock conversions without an explicit conversion policy. |
| Vendor price list with vendor/SKU/currency/minQty/effective dates | Store repeatable PDF baseline rows and support controlled purchasing defaults; keep standard cost independent. |
| Location active/archive/version and real location relations | Administer more than WH-JKT/CAFE-JKT; compute totals across authorized active/historical locations. |
| Reservation allocation linked to SO line/SKU/location | Own and release reservations safely; enforce total reserved against valid stock and remaining order quantity. |
| Stock adjustment document/lines; complete StockMove actor/reason/source/journal links | Every physical change has a validated, immutable source and valuation trace. Locations use FKs or explicit controlled external-location identities. |
| Transaction source-line references and versions | Prevent mismatching a line ID with another SKU, aggregate repeated lines correctly, block stale drafts/status changes. |
| Request identity / transactional sequence allocation | Unique company/actor/operation/request identity and payload fingerprint; retry returns original result; reject key reuse with different payload. |
| Posting source-event uniqueness and reversal references | One ledger/stock event per source action; corrections are linked compensating entries, not updates/deletes to posted lines. |
| User active/session version and company membership | Server revalidates user/role/company authorization; revoke old sessions on deactivation or privilege changes. |
| Account archive/protected-system flags | Permit account master administration while protecting historical lines and required scenario accounts. |
| Monetary representation and constraints | Adopt a reviewed integer-Rupiah/fixed-point strategy, ranges and rounding; preserve historical amounts and API serialization. Add database checks where practical. |

Create versioned, reviewed migrations against copies first. Verify row counts, references, totals, indexes, rollback/restore and application compatibility before any authorized production migration. Do not run `prisma db push` or seed against existing data as a migration strategy. Existing corrupt or unvalued records, if any, need separately reviewed correction documents rather than hidden balancing entries.

## Incremental delivery sequence

Estimates are rough engineering effort for one developer familiar with this code, including checks; they are not a completion promise. Browser/deployment access and unresolved business policy may affect effort. Regression runs follow each slice; later modules do not proceed while earlier integrity defects remain unresolved.

### Phase A — P0: authorization and transaction safety (approximately 6–10 developer days)

1. **Safe verification harness:** explicit disposable database paths, independent fixture per PDF case, fail the process on failed assertions, preserve originals with hashes, and capture baseline/source evidence. Existing QA tools must not mutate normal company data.
2. **Authorization:** central require-user/permission/company context; protect company/user/demo/dashboard APIs; remove unrestricted account switching from operational mode; validate current active user/session; redact unauthorized financial reads. Configure signing secret with no known fallback. Add denied-action audit events without leaking data.
3. **Posting foundations:** validate positive integer quantities/finite prices/discounts/reference types; fail closed on invalid database/company selection; eliminate non-atomic transaction fallback; move status/credit/quantity checks inside transactional boundaries; implement guarded state transitions, source-event uniqueness, reliable sequences and duplicate-request handling.
4. **Inventory correctness:** remove auto-stock provision from sales/POS/master creation; introduce source-backed adjustment/opening movements; preserve per-order reservations; enforce cumulative delivery/receipt/POS bounds; protect session location and reserved stock; record all StockMove and valuation evidence.
5. **Accounting correctness:** aggregate invoice/bill entitlements and PO prices; prevent draft exposure gaps; correct original-discount/tax/cost return reversal and cumulative caps; reconcile A/P/A/R/Bank without seed fallbacks; keep immutable posted history and atomic audit.

**Exit criteria:** A02–A13 and all relevant B probes demonstrate the corrected behavior; role denial and genuinezero tests pass; each forbidden action leaves business data unchanged apart from permitted denial audit; stock/reserved/financial invariants hold; sequential retry does not repost; concurrent attempt tests demonstrate one accepted state transition or explicit conflict. Legacy suites pass with proper fixtures. No automatic journal can hide a reconciliation discrepancy.

### Phase B — P1: dynamic master-data administration (approximately 5–8 days)

Implement one module at a time: customers → vendors/prices → products/categories/UoM → warehouse/locations → permitted accounts. Each slice includes list/search/filter/sort/pagination, create/detail/edit forms, safe delete/archival/restore, version conflicts, visible permitted actions, dependent-document links and audit history. Maintain a shared source of truth for selectors; archive hides records from new documents but retains historical rendering. Enforce category, vendor and UoM relationships in the API.

**Exit criteria per module:** valid/invalid/duplicate create, persisted read after fresh connection and browser refresh, allowed/rejected update, stale update409, safe unused delete, dependency-protected archive, restore, unauthorized request403, and related-module selector synchronization. Delete is never shown when unauthorized. Referenced master records are never removed by cascading transaction deletion.

### Phase C — P1: complete operating workflows (approximately 6–10 days)

1. Normal quotation edit, Owner approval, selectedSO confirmation, delivery quantities, partial delivery/backorder, invoice creation/posting and customer payment.
2. Normal RFQ edit/confirm, receipt QC quantities, vendor bill create/post and **vendor partial/full payment**, including Bank/A/P entries and overpayment guard.
3. CRM lead detail/stage management and quotation-from-lead. F-04 remains Should in PDF, but dynamic CRM is explicitly requested in the master prompt.
4. Draft cancellation and reservation release, posted reversals/credit notes, per-record history and direct related-document links.
5. POS empty cart, authorized session ownership, stable checkout receipt, cashier history/close summary, durable movements, and linked refund/restock/tax/COGS workflow. POS returns require explicit POS source support, since current returns require a CustomerInvoice.
6. Correct role dashboards, A/R/A/P reports and reporting metadata/source drill-down. F-20 remains Should; do not delay Must controls in its favor.

**Exit criteria:** a user completes both end-to-end workflows entirely through the website on newly created records; vendor bill reaches payment; partial/backorder/return/POS/retry flows reconcile; original assignment identities and totals remain available through the repeatable isolated baseline. Demonstrate permitted draft editing and locked posted documents.

### Phase D — P2: consistent UI/UX and acceptance (approximately 3–5 days)

Reuse the existing blue/purple tokens, sidebar, dialogs, tables, status indicators and charts. Standardize document action bars, input labels/help, loading/empty/error/success states, responsive lists and source links. Add dirty-form warnings and accessible keyboard actions; improve dense text after browser review. Move fixture/rubric tools out of ordinary business tasks. Align all wireframe labels/mandatory fields with S-01–S-16.

**Exit criteria:** browser checks at 1440/1280/768/390/320px,200%zoom, keyboard-only journeys, focus return/containment, required-field/error announcements, measured contrast, reduced motion and assistive-technology checks. Capture real screenshots for all 16 screens. No WCAG or visualPASS without execution evidence.

### Phase E — P1 release gate, then P3 enhancements (approximately 3–5 days for acceptance/deployment)

Execute T-01–T-32 with exact independent/explicit prerequisite fixtures and expected/actual evidence. Run CRUD, role, integration, concurrency and retry regression checks. Reconcile source documents to stock/subledgers/GL; repeat refresh/logout/browser-restart acceptance on the chosen durable deployment. Verify public URL and six accounts; exercise backup/restore on staging. Update README, Decision Log, diagrams, AI disclosure and handoff materials without claiming unperformed work.

**Release gate:** all Must features, requested CRUD and32PDF cases have actual acceptance evidence; no unresolvedP0 defects; no regression in inventory/ledger equality or source identity; deployable storage/backup proven. Only then select P3 features below.

## Recommendations: value, effort, dependencies and risks

Some features are already partially present; extend them rather than rebuilding or marketing them as new. Effort: S≈1–2days, M≈3–5days, L≈1–2weeks, after foundations. RequiredCRUD and PDF obligations take precedence over optional enhancements.

| Recommendation | Business value | Current state / priority | Complexity | Dependencies | Risks / mitigation |
| --- | --- | --- | --- | --- | --- |
| 1. Smart low-stock alerts | Prevent lost sales and emergency restocking. | A fixed20-unit chart warning exists; extend after integrity fixes, P3. | M | Accurate available stock, per-location thresholds, alert ownership. | Aggregate/on-hand alerts can ignore reservations; use available stock and deduplicate notifications. |
| 2. Automatic reorder suggestions | Reduce stockouts and procurement effort. | MISSING, P3. | M–L | Vendor prices, minQty/lead time, reliable demand/stock, approved RFQ flow. | Bad demand forecasts overbuy perishables; suggest drafts with human confirmation, never auto-post. |
| 3. Global record search | Find customers/SKUs/documents quickly. | Navigation search already exists; record search P3. | M | Server-side permissions/company filtering, indexed document fields. | Cross-role/company data leakage; filter before search results are returned. |
| 4. Revenue/profit analytics | Show actual margin and business performance. | Charts exist but mix gross orders/POS; correction P0/P1, advanced views P3. | L | Accurate recognized net revenue, returns/tax/COGS, accounting dates. | Double counting/label ambiguity; reconcile every metric with posted sources. |
| 5. Customer/vendor timelines | Speed collections and supplier follow-up. | Required related history P1; richer timeline P3. | M | Document links, canonical outstanding, audit. | Omitted/unauthorized financial details; scoped queries and reliable event ordering. |
| 6. Approval notification center | Reduce approval delays and missed work. | MISSING, P3; approval actions themselves P1. | M | Approval state/ownership, audit and request identity. | Stale/duplicate alerts; synchronize with committed transitions, no implicit approval. |
| 7. CSV/Excel import and export | Reduce repeated data entry and reporting effort. | MISSING, P3. | M–L | Master schemas, validation, permissions, background/size limits. | Formula injection, invalid relationships, private data export; sanitize/dry-run and audit. |
| 8. Printable invoices/POS receipts | Customer proof and operational record. | Proper receipt presentation P1; polished print/export P3. | S–M | Stable posted document identity, tax totals and source. | Reprinting must never repost; mark copies/cancelled/reversed state appropriately. |
| 9. Bulk master import with validation | Faster initial onboarding/migration. | MISSING, P3; separate from baseline seed. | L | Row-level validation, stable identifiers, staged review, duplicate policy. | Partial/broken imports and unsafe balance loading; preview, bounded atomic batches, explicit failure report. |
| 10. Custom dashboard filters | Relevant date/location/owner views. | Chart date/period filters exist; expansion P3. | M | Correct KPI definitions, scoped query infrastructure. | Filters may affect chart but not KPI or include opening balances incorrectly; display scope explicitly. |
| 11. Supplier performance reports | Compare delivery quality and reliability. | MISSING, P3. | M | Planned/actual receipt dates, rejected reasons, vendor links. | Incomplete history distorts ranking; show sample size/period and exclude synthetic fixtures. |
| 12. Inventory movement analytics | Explain shrinkage, flow and location demand. | MISSING, P3; permanent movement trail P1. | M | Complete immutable movements/valuation and location hierarchy. | Current missing movements make analytics misleading; backfill only from verifiable sources. |
| 13. Archive/restore | Preserve history while keeping new entry clean. | Explicitly requested essentialCRUD, P1. | M | Active state, dependency rules and selector filtering. | Restoring duplicates or using archived items in drafts; validate active constraints at posting as well. |
| 14. Product image upload | Faster cashier recognition and catalog usability. | MISSING, P3. | M | Persistent object storage, permissions and media pipeline. | Oversized/unsafe uploads and temporary storage loss; file-type/size controls and durable references. |
| 15. Digital loyalty | Encourage repeat visits. | F-23 Optional, P3 last. | L | Customer identity, POS/refunds, coupon/promotion tax rules. | Point duplication, refund abuse, margin/tax errors; immutable rewards ledger and dedicated tests beyond T-01–T-32. |

## Approval boundary

The master prompt explicitly requires presenting the audit and implementation plan **before changing schemas or rewriting modules**. Approval is requested for incremental implementation starting with Phase A/P0, followed by the requested P1 CRUD/workflows in this plan. Original business data remains untouched; any later production migration or data correction must first have a concrete reviewed migration/adjustment result. Approval of the architecture plan is not permission to reset or delete existing operational data.
