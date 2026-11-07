# Rasa Aruna Kitchen ERP: read-only audit

> Laporan historis sebelum implementasi. Pengguna telah menyetujui rencana; lihat [hasil implementasi dan verifikasi terbaru](../implementation-2026-11-06/IMPLEMENTATION.md). Temuan/status di bawah tidak otomatis menggambarkan kode terbaru.

Audit date: 6 November 2026 (Asia/Jakarta). Scope: the current working tree, including existing uncommitted changes. Implementation is **awaiting approval**.

## Decision

Keep the existing Next.js / Prisma / SQLite architecture. The application performs real database operations; it is not simply a frontend mockup. However, it is **not yet a complete dynamic CRUD ERP**, and several controls allow inventory, accounting, or authorization violations.

The highest priorities are authorization, source-backed stock changes, cumulative quantity checks, safe posting/retries, and correct balances. Complete the normal user workflows and master-data administration next. Additional styling and business features follow those corrections.

This audit created documentation and evidence only. No application source, schema, dependencies, existing documentation, or original database was modified. Tests that mutate records ran in a temporary project copy and disposable SQLite database. All 134 protected files in the before/after manifest remained identical, including all four original databases and the company registry. The working tree already contained extensive local changes; those were preserved.

## Deliverables and evidence limits

1. This report: architecture, CRUD matrix, missing functionality, rule violations, UX, database and security findings.
2. [PDF_COMPLIANCE.md](PDF_COMPLIANCE.md): all F-01–F-23, SR-01–SR-20, and S-01–S-16, preserving PDF priorities.
3. [TEST_REPORT.md](TEST_REPORT.md): executed checks, expected/actual evidence, all 32 PDF acceptance cases, and outstanding verification.
4. [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): incremental roadmap, proposed permissions/schema work, verification gates, and all 15 feature recommendations.
5. `evidence/`: test logs, probe results, source inventories, and preservation hashes.

The 34-page assignment was read in full. Its 16 wireframe pages were rendered and visually inspected. Source: `/Users/felix/Downloads/24SI1 - Group 03 - Food and Beverage (1).pdf`; SHA-256 `6d6c0f9b8a2b301518a37e7a469031ace8722ca258647599a37d19db0607a242`. The copy without `(1)` is byte-identical.

The earlier `docs/compliance-audit` findings were treated as historical evidence, then their 14 probes were rerun against the current copied source. Seventeen additional CRUD/security/integrity probes were executed with a fresh seed for each probe. Results: existing regression suites **128/128 assertions passed**; targeted probes **1 passed / 30 failed**. These are assertions and probes, not 32 fully accepted PDF scenarios. No public deployment, browser session, visual application acceptance, or concurrent-request test was executed in this audit. A fresh independent Prisma client confirmed that a newly created contact persisted on disk; browser restart/logout persistence remains unverified.

## 1. Current architecture

| Area | Observed implementation | Assessment |
| --- | --- | --- |
| Frontend | Next.js App Router; React client pages, TypeScript, Tailwind, Lucide, Chart.js | Preserve. Forms fetch JSON APIs; page/modal/cart state is temporary UI state. |
| Backend | Next.js `src/app/api/**/route.ts`; no separate backend service | Real request handlers and Prisma writes. Authorization is inconsistent. |
| Domain layer | `salesEngine`, `deliveryEngine`, `purchaseEngine`, `accountingEngine`, `posEngine`, `transferEngine`, `returnEngine`, `creditControl`, `dashboardEngine` | Useful integrated foundation; fix individual invariants rather than replace modules. |
| Database | SQLite, Prisma 6 declared in package.json, 33 application models | FK relations and unique document/SKU identifiers exist. No migrations directory or explicit business CHECK constraints found. |
| Company storage | Default `prisma/erp.db`; three company SQLite files; JSON company registry; cookie selects active database | Separate persistence exists, but no company membership boundary. Company deletion removes the database file. |
| Authentication | bcrypt password hashes; jose HS256 JWT; httpOnly session cookie, secure in production, SameSite Lax, 24-hour token | Session payload contains identity/role but no tenant membership. Known fallback signing key and unrestricted role switching defeat intended controls. |
| Audit | AuditLog actor ID/name/role, action, entity, record ID, timestamp, optional before/after JSON | Real persistence, but many changes log after commit; logger catches failures and returns null. Not a guaranteed atomic audit trail. |
| Inventory/accounting | Several engines use interactive Prisma transactions; delivery/receipt create movements and journals | POS, transfers, returns and manual adjustments do not consistently create permanent StockMove records. Balanced journals can still represent invalid business events. |
| Deployment | Next build/start scripts; tracing includes baseline DB; serverless branch restores SQLite into `/tmp/erp.db` | Public URL not established. A temporary filesystem cannot establish durable database persistence. Keep SQLite on durable storage if this architecture is deployed. |
| Tests | Seven executable TypeScript suites, existing logs/reports, QA panels in application pages | Useful narrow regression coverage. No `npm test`, formal per-case isolation, browser E2E suite, or concurrency suite found. |

### Data relationships and workflow integration

Contacts relate to leads, sales orders, purchases, invoices, bills, payments, returns and credit notes. SKU variants relate to location stock, stock movements and document lines. Sales confirmation creates a delivery and increments aggregate reservations; delivery records delivered quantity and COGS; invoices and payments update receivables/accounts. PO confirmation prepares a receipt; accepted receipt increases stock/GRNI; a bill clears GRNI into A/P. POS updates orders, stock, session totals and ledger. Accepted returns create stock/COGS and sales/tax/A/R reversals.

These relations are real. The key problem is that aggregate checks, document state, authorization, and audit evidence are not consistently enforced across every entry point. Reservations are stored as a product/location aggregate, without a dedicated per-order reservation allocation model.

### Seed data versus hardcoded behavior

- `src/lib/seedData.ts` provides the repeatable assignment baseline: 15 SKU variants, six customers, four vendors, two locations, 15 accounts, 616 units / Rp12,214,000 inventory, six reserved units, opening A/R Rp1,500,000, A/P Rp1,000,000 and Bank Rp20,000,000. Existing suites reproduced these controls on the disposable database.
- `scripts/seed_demo_charts.ts` creates synthetic historical documents. Its public API lacks authentication and bypasses transaction engines. This is not safe operational data entry or a substitute for source transactions.
- The POS basket initially contains the fixed T-27 products and prices. New clean companies can therefore open with irrelevant fixture selections.
- Sales/POS free-text normalization can auto-create products and initial stock. Purchase normalization can create products before the purchasing engine authorizes the actor. Typing a product name must not create unvalued inventory.
- Warehouse codes, standard account codes, PBJT 10%, and vendor tax 0% are scenario policies in code. Some dashboard metadata/source trails and fallback balances are also fixed, which incorrectly affects dynamic company reporting.
- Vendor prices default to standard cost. No independent vendor-price-list model stores the PDF's vendor/SKU/currency/minimum-quantity rows. Categories, contact communication fields and archive status are also absent from the schema.

### Read-only inspection of original databases

All four originals returned SQLite `quick_check = ok` and zero `foreign_key_check` violations. None had negative or over-reserved StockLevel rows at inspection time. This does not invalidate the failing probes: the defects were reproduced on fresh disposable fixtures, not asserted to have already corrupted the original records.

| Original database | Contacts / SKUs | Company on-hand | Journals | Observation |
| --- | --- | ---: | ---: | --- |
| `prisma/erp.db` | 10 / 15 | 616 | 1 | Baseline-sized operational data. |
| `comp_pt-morie-matcha_qkc6.db` | 10 / 15 | 616 | 1 | Also has two POs. |
| `comp_pt-kuliner-nusantara_yqes.db` | 0 / 1 | 15 | 0 | Stock exists without an opening valuation journal. |
| `comp_pt-resto-nusantara-b_lfr7.db` | 0 / 1 | 15 | 0 | Stock exists without an opening valuation journal. |

Do not reset these companies to repair the application. Any future reconciliation of existing data needs its own reviewed migration/adjustment plan.

## 2. CRUD capability matrix

Labels: **WORKING** = demonstrated basic behavior in executed checks; **PARTIAL** = present but incomplete, unsafe, or not available through a normal user workflow; **MISSING** = required capability absent; **RESTRICTED BY BUSINESS RULE** = unrestricted mutation is intentionally inappropriate; **NOT VERIFIED** = no execution evidence. A database-backed API alone does not establish a usable website workflow.

| Module | Create | Read | Update | Delete/Archive | Persistence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Customers | PARTIAL | PARTIAL | MISSING | MISSING | WORKING | Name/type/city/terms/limit persist. Email/phone/address, editing, history, safe delete, archive and restore missing; role/opening-balance controls unsafe. |
| Vendors | PARTIAL | PARTIAL | MISSING | MISSING | NOT VERIFIED | Contact API supports VENDOR; normal contacts screen fetches customers only. Vendor profile/history/payables workflow incomplete. |
| Vendor price lists | MISSING | MISSING | MISSING | MISSING | MISSING | Default vendor and standard cost do not constitute a vendor price list. |
| Product variants | PARTIAL | WORKING | MISSING | MISSING | WORKING | Metadata is created and read; PATCH changes stock only. Metadata editing, description, archive, dependency-safe delete absent. Creation accepts invalid values and unjournaled initial stock. |
| Categories | MISSING | MISSING | MISSING | MISSING | MISSING | POS categories are derived filters, not administered category master records. |
| Units of measure | PARTIAL | PARTIAL | MISSING | MISSING | PARTIAL | A free-text unit is stored on each SKU; no governed UoM master/conversion administration. |
| Warehouses/locations | MISSING | PARTIAL | MISSING | MISSING | WORKING | Seeded locations and stock persist; no location administration. Product totals assume two fixed locations. |
| Stock adjustments/movements | PARTIAL | PARTIAL | RESTRICTED BY BUSINESS RULE | RESTRICTED BY BUSINESS RULE | PARTIAL | Direct balance PATCH exists but lacks source movement/valuation posting; complete movement history UI absent. Corrections should be compensating movements. |
| Reservation allocations | PARTIAL | PARTIAL | MISSING | RESTRICTED BY BUSINESS RULE | PARTIAL | Aggregate reserved counts exist; no safe per-order allocation/release/cancellation management. |
| CRM leads/opportunities | PARTIAL | PARTIAL | PARTIAL | MISSING | PARTIAL | Create/list and backend PATCH exist. Creation bypasses later-stage validation; normal detail/stage-edit/quotation linkage UI missing. |
| Quotations / Sales Orders | PARTIAL | WORKING | PARTIAL | MISSING | WORKING | Creation persists; single-line PATCH exists but no full normal edit/confirm/approval flow; cancellation missing. Confirmed price edits are restricted. |
| Delivery/backorders | PARTIAL | WORKING | PARTIAL | MISSING | WORKING | Created by SO confirmation. Validation backend exists; user-entered quantities/normal validation missing; over-delivery and reservation defects. |
| RFQs / Purchase Orders | PARTIAL | WORKING | MISSING | MISSING | WORKING | Create API/form and confirm engine exist. No draft edit/cancel or normal selected-PO confirm control. |
| Receipts / quality acceptance | PARTIAL | WORKING | PARTIAL | MISSING | WORKING | Created by PO confirmation. Accepted/rejected backend exists; normal user form absent; duplicate receipt-line requests over-receive. |
| Customer invoices | PARTIAL | WORKING | MISSING | MISSING | WORKING | Normal create/post exists. Draft line/header editing/cancel absent; posting/quantities need safeguards. Posted editing/deletion restricted. |
| Vendor bills | PARTIAL | WORKING | MISSING | MISSING | WORKING | Create/post APIs and QA scenario exist; normal creation/posting workflow absent, price/aggregate match unsafe. |
| Customer payments | PARTIAL | WORKING | RESTRICTED BY BUSINESS RULE | RESTRICTED BY BUSINESS RULE | WORKING | Partial/full posting works in legacy engine tests. No reversal; UI response contract and duplicate-submit protection incomplete. |
| Vendor payments | MISSING | PARTIAL | RESTRICTED BY BUSINESS RULE | RESTRICTED BY BUSINESS RULE | MISSING | Schema has bill/vendor links; API and engine accept customer invoices only. |
| Chart of Accounts | MISSING | PARTIAL | MISSING | MISSING | WORKING | Account data exists and is included in ledger output. No dedicated permitted account maintenance workflow. |
| Posted journals / GL | PARTIAL | WORKING | RESTRICTED BY BUSINESS RULE | RESTRICTED BY BUSINESS RULE | WORKING | Automatic journals and protected GL reads work in basic checks. No general authorized reversal/adjustment workflow. |
| Sales returns / credit notes | PARTIAL | WORKING | PARTIAL | RESTRICTED BY BUSINESS RULE | WORKING | Create/inspect/process persist. Discounts, historical cost, cumulative caps, role checks and lifecycle locking need correction. |
| Internal transfers | PARTIAL | WORKING | MISSING | MISSING | WORKING | Create/validate exists, draft edit/cancel absent, no engine role checks or permanent StockMove. |
| POS sessions / sales | PARTIAL | WORKING | RESTRICTED BY BUSINESS RULE | RESTRICTED BY BUSINESS RULE | WORKING | Cart/session/payment history exists. Session ownership, stock, retry, receipt and refund workflows incomplete. |
| Users | PARTIAL | PARTIAL | MISSING | MISSING | WORKING | Account creation/listing exists; Cashier can create OWNER. No deactivate, role-change controls or token revocation. |
| Companies | PARTIAL | PARTIAL | PARTIAL | PARTIAL | WORKING | File-backed CRUD exists but is unauthenticated, with destructive database deletion and no transaction-history protection. |

`WORKING` persistence means disk-backed behavior in the executed engine/API checks. It does not certify refresh/logout/restart across an unverified hosting environment. Missing cancellation/archive actions are not counted as acceptable business restrictions. Conversely, unrestricted editing/deletion of posted records is not a requested feature to add.

## 3. Missing functionality by module

### Customers and vendors

Add email/phone/address fields, edit forms, approved credit-limit changes, complete related-document history, live receivable/payable balances, vendor list/detail, dependency-safe deletion, and archive/restore. Unused means no business-document references, opening balances, payment history, or other protected dependencies. Contact creation must not accept arbitrary opening financial balances without a balanced migration workflow. Normal customer/vendor duplicate detection needs a defined policy; names alone must not necessarily be unique.

### Products, variants and inventory

Add product metadata editing, description/categories, active/archive state, vendor-price administration, warehouse/location maintenance, full movement history, governed stock adjustments, and reservation allocation/release. Preserve independent SKU prices/costs/stock. Do not automatically merge Hot and Iced by shared product name. Historical transaction prices/costs must remain snapshots when master prices/costs change. Existing stock needs a controlled revaluation policy if standard cost changes.

### CRM, Sales, Purchase, delivery and receipt

Build ordinary user actions for editing lead information/stage, linked lead-to-quotation creation, draft multi-line editing, Owner approval, selected-document confirmation, partial delivery quantities, backorders, and accepted/rejected receipt quantities. Add lifecycle-aware cancel/release actions. Existing QA buttons create fixed C01/V03/SKU scenarios; they do not operate as management forms for arbitrary selected records.

### Accounting

Add vendor bill creation/posting UI, vendor payments with partial/full allocation, approved account master maintenance, draft invoice/bill editing and cancellation, proper payment/journal reversal links, source document drill-down, and financial reports reconciled with the ledger. Opening A/R and A/P remain migration items, not disposable demo transactions. No generic delete/edit of posted financial records should be introduced.

### POS

Open with an empty basket, select an explicit SKU, bind order location/cashier to the session, validate available rather than only physical stock, use duplicate-request protection, persist movement evidence, present a receipt and printable output, restrict transaction history to authorized scope, and add POS-specific returns/refunds. Current ReturnRequest requires CustomerInvoice; POS orders cannot simply use that workflow. Cart editing is correctly frontend state; completion must atomically persist one sale, its movements, payment evidence and ledger.

## 4. Reproduced security and business-rule violations

Probe identifiers refer to fresh executions in `evidence/probe-results.json` (A) and `evidence/crud-probe-results.json` (B). FAIL means the required control failed, not a test-runner crash. See TEST_REPORT for expected/actual details.

| Finding | Priority | Evidence | Business impact / required correction |
| --- | --- | --- | --- |
| Unauthenticated company edit/delete | P0 | B02: PATCH 200; DELETE 200; disposable company file removed | Anyone reaching these handlers can alter/delete company storage. Require Owner + company scope; replace operational deletion with protected archival. Do not exercise this against original companies. |
| Cashier creates Owner | P0 | B01: HTTP 200, created role OWNER | Restrict user administration and privileged role assignment server-side. |
| Role switching bypasses login/role boundary | P0 | Source: switch-role handler gets `prevUser` but never rejects null or unauthorized actors before issuing target JWT | Require actual authentication. Remove unrestricted switching from operational deployments or isolate an explicitly protected demo mode. Runtime HTTP exploit not executed. |
| Public demo seed fabricates posted history | P0 | B03: anonymous 200; POS orders 0→15; journal count stays 1 | Disable/protect operational demo seeding. Fixtures must stay isolated; never use fake posted documents to populate business reporting. |
| Missing module authorization | P0 | A02 Cashier creates quotation; B05 creates product; B07 creates lead; B11 creates/validates transfer | Centralize permissions at handler and domain boundaries; test all roles and reads as well as writes. POS/return/transfer engines lack appropriate role/ownership checks. |
| Implicit product/stock creation | P0 | A03 invalid POS session returns400 while stock616→816; product creation also accepts initial stock | Validate SKU, actor and document first. Master creation must not mint physical stock; use a balanced opening/adjustment transaction. |
| Direct stock PATCH has no valuation transaction | P0 | B04 changes RICE-CHICK-S WH40→41; zero new movements; ledger1030 staysRp12,214,000 | A logged balance edit is not a stock adjustment transaction. Create movement, reason and balanced valuation entry atomically. |
| Opening A/R can be created without ledger | P0 | B06 new contact openingAR123456 while ledger remainsRp1,500,000 | Remove opening balance fields from ordinary CRUD; use approved migration/accounting entry. |
| Invalid values and invalid vendor type accepted | P0 | B05 product price−100/cost−50, customerC01 as vendor; B08 quantity−2 confirmed, reserved6→4 | Enforce finite nonnegative money, positive integer quantities, enum/reference types and document invariants on every entry point. |
| Edited discount bypasses create policy | P0 | B09 Cashier edits draft discount to50% | Enforce role,0–20%, approval invalidation and totals transactionally for draft edits. |
| Oversubscription and consumption of reservations | P0 | B16 confirms35 for C03, WH40/reserved41/available−1; B10 POS uses CAFE session to sell WH35, leaving onHand5/reserved6 | Reserve against available stock with per-order allocation; bind POS to session location; reject consuming other reservations. |
| POS duplicate SKU creates negative stock | P0 | A04 two15-unit Hot lines accepted against24; final−6 | Validate cumulative SKU/location demand within the transaction. |
| Delivery overrun / invalid lifecycle | P0 | A12 accepts9 for8 ordered; A13 draftSO delivery38 leaves onHand2/reserved−32 | Validate confirmed parent, exact line/SKU identity, cumulative remaining quantity and actual owned reservations. |
| Over-receipt through repeated line IDs | P0 | B14 same8accepted/2rejected item twice: WH20→36 | Reject repeated line IDs and enforce cumulative demand/accepted quantities atomically. |
| Customer over-invoicing | P0 | A10 five delivered, two invoice lines5+5 posted | Validate cumulative entitlement at draft creation and posting, using stable source line IDs. |
| Vendor quantity/price mismatch | P0 | B13 accepted8 billed16/Rp192000; A06 PO12000 bill99000 accepted/Rp792000 | Aggregate all billed lines and paid/posted history, enforce PO prices and accepted receipts, then recheck inside posting transaction. |
| Excessive return credits | P0 | A07 discounted unit credit52800 vs47520; A08 five invoiced returned twice/credit528000 vs264000 | Cap cumulative accepted returns and credits, reverse original net/tax/cost snapshots, lock inspection after posting. |
| Draft invoices reduce credit exposure | P0 | A09 exposureRp1,622,400→Rp1,358,400 without posting/payment | Transfer exposure only at a valid posting boundary; no gap or double counting. |
| POS duplicate-request handling missing | P0 | B12 identical key/body accepted twice; two paid orders | Persist request identity and result with unique constraint, bound to company/actor/operation. Same key with changed payload must fail. |
| Dashboard A/P double counts posted bills | P0 | B15 ledgerRp1,096,000; dashboardRp1,192,000 | `postVendorBill` increases contact.openPayable and dashboard also adds bill outstanding. Choose one canonical opening-plus-documents calculation. |
| Real zero Bank replaced with seed amount | P0 | B17 account balance0 displaysRp20,000,000 | Replace truthiness defaults with explicit missing-data handling; inspect other A/R/A/P/inventory/reservation defaults. |
| Vendor payment missing | P1 | A14 bill payment returns400 demandinginvoiceId | Implement vendor allocation, Bank/A/P entry, outstanding, partial/full payment and overpayment/retry controls. |
| Missing permanent stock movements | P1 | A05 paidPOS leaves StockMove0; source transfer/return engines also do not insert movements | Persist actor/time/source/destination/quantity/reason/document/valuation links for all stock-changing flows. |
| POS retry close summary changes | P1 | A11 cash difference first0, retry−33000 | Reuse persisted close summary or recalculate cash-only totals consistently. |
| CRM create bypasses stage validation | P1 | B07 Proposition with zero revenue and implicitC01 accepted | Apply stage invariants at both create and update; never silently attach an unrelated customer. |

### Additional source-review findings needing targeted execution

- `prisma.ts` catches incompatible array-transaction usage and awaits operations sequentially. This fallback is not atomic. Either use a genuine transaction on the selected client or reject unsupported calls.
- Many state/credit/quantity checks occur before the transaction. Unique document numbers do not guarantee one successful state transition when two requests race. `getNextSequence` reads the highest document rather than a transactionally allocated counter; payment numbering uses the last four timestamp digits. Concurrent modifications and collisions require explicit tests.
- JournalEntry.documentRef is indexed, not unique. There is no database guarantee of a single posting per source event. A unique document number alone is not a duplicate-request identifier.
- Contact/User/Product have no active/archive/version fields. JWT roles are not reloaded from a current user record, so a future disable/role change would not immediately invalidate issued tokens.
- Company selection trusts a mutable cookie. Tokens have no company membership, and invalid company/path resolution falls back to the default database. Fail closed instead of silently selecting another company's data. New companies copy baseline users and potentially live data from the default DB; clean mode retains users/accounts while clearing journals/documents. Review these semantics before adding company administration.
- StockMove has no actor/reason or direct journal FK. Location fields on several documents are plain strings; FK validation is inconsistent outside StockLevel. Document child relations use cascade deletion, including JournalItem. There is currently no ordinary posted-ledger DELETE route, but future deletion must not inherit unsafe cascade behavior.
- Financial amounts use Float. Define integer Rupiah/fixed-point representation, safe ranges, rounding and serialization before extending amounts; do not silently change historical values.
- Return cost is captured from the current product master rather than the original delivery valuation. Inspection can change state without a completed-document lock. These are source findings, not separately executed valuation/reinspection probes.
- Financial reconciliation's A/R subledger uses only contact opening receivables, omitting live invoice/payment/credit-note balances. Reporting metadata/sourceTrail remains baseline-specific. Chart sales/profit combines gross confirmed orders and POS, rather than recognized net revenue/COGS; label it as order analytics until corrected.
- Customer payment UI reads `remainingBalance`, while the engine/API returns `newOutstanding` / `updatedInvoice`. Some QA calls also reference nonexistent `/api/inventory/delivery` and `/api/products/[sku]/stock` paths. Passing CLI tests do not prove these buttons work.
- Runtime exceptions can be returned as raw error messages. Invalid enums/type values sometimes become500 responses rather than field-specific400 errors. Login uses demo password aliases; there is no visible login throttling or account/session management.
- Module GET endpoints often require login only; dashboard endpoints do not authenticate. Cashier restrictions on GL alone do not establish protection of invoices, balances, audit data or other users' POS sessions.

### Source anchors

| Area | Current source |
| --- | --- |
| Company authorization/deletion | [companies API](../../src/app/api/companies/route.ts), [company manager](../../src/lib/companyManager.ts) L250 |
| User privilege escalation | [users API](../../src/app/api/users/route.ts) L34 |
| Role switch / JWT | [switch-role](../../src/app/api/auth/switch-role/route.ts) L7, [auth](../../src/lib/auth.ts) L7–62 |
| Demo posting bypass | [seed API](../../src/app/api/seed/demo-charts/route.ts), [demo generator](../../scripts/seed_demo_charts.ts) |
| Contact data / balances | [contact API](../../src/app/api/contacts/route.ts) L49, [schema](../../prisma/schema.prisma) L100 |
| Product administration / direct stock edit | [create API](../../src/app/api/products/route.ts) L62, [stock PATCH](../../src/app/api/products/[sku]/route.ts) L75 |
| Sales / reservations / draft edit | [sales engine](../../src/lib/salesEngine.ts) L88, L204, L329; [sales normalization](../../src/app/api/sales/orders/route.ts) |
| Delivery quantities | [delivery engine](../../src/lib/deliveryEngine.ts) L12–150 |
| Receipt / three-way match | [purchase engine](../../src/lib/purchaseEngine.ts) L186, L377, L503 |
| Invoice / payment | [accounting engine](../../src/lib/accountingEngine.ts) L12, L143, L275 |
| Returns | [return engine](../../src/lib/returnEngine.ts) L29, L121, L204 |
| POS / transfers | [POS engine](../../src/lib/posEngine.ts) L38, L92, L317; [transfer engine](../../src/lib/transferEngine.ts) |
| Reporting | [dashboard](../../src/lib/dashboardEngine.ts) L91, L135, L141, L231, L267, L281; [credit control](../../src/lib/creditControl.ts) |
| Storage/transactions | [Prisma proxy](../../src/lib/prisma.ts) L28, L61, L90; [serverless init](../../src/lib/dbInit.ts) L6; [audit](../../src/lib/audit.ts) L20 |

## 5. UI/UX audit

Review uses the design-critique framework and current source. No rendered application screenshot or live keyboard/contrast test was performed; visual judgments are therefore limited to declared styles/structure. The PDF permits blue/purple branding; its mandatory element is document/navigation structure, not the grayscale palette.

### Overall impression and what works

The interface already declares a blue/indigo/violet theme, structured responsive sidebar, rounded cards, consistent Lucide icons, breadcrumbs, status indicators, create dialogs and charts. Reusable DialogFrame implements Escape, focus containment/restoration and background inertness. Skip navigation, table header scopes, focus styling, reduced-motion support, labeled controls and chart data-table alternatives are useful foundations. Preserve these components and validate them in the browser after the workflows are completed.

### Usability and hierarchy

| Finding | Severity | Recommendation |
| --- | --- | --- |
| Core state transitions are available only in fixed QA scenarios | Critical | Put context-sensitive Confirm/Approve/Validate/Post actions on the selected record; show prerequisites and the result. |
| Vendor can be created but the contact screen queries only CUSTOMER | High | Separate customer/vendor lists or a visible type filter, with real detail/edit/archive actions. |
| CRM cards look clickable but have no detail/stage action | High | Use actual keyboard-accessible links/buttons opening lead detail and a stage form. |
| Master records lack Edit/Archive/Delete controls | High | Add permitted actions consistently, based on server-computed capabilities and dependencies. |
| Form/dropdown document selectors replace scalable list views on many pages | Moderate | Standardize searchable, sortable, filtered, paginated list/detail patterns; keep selected record in URL. |
| Browser alerts substitute for recoverable field/state feedback | Moderate | Inline validation, loading/success/error states, conflict messages and retry controls. |
| Product/payment search/pagination exists but is not consistent across modules | Moderate | Reuse table controls; move large-list filtering/pagination to server queries. |
| Displayed fixture labels/status claims can be mistaken for operational truth | Moderate | Derive company, reporting date, dataset and document states from active context. Do not label all contacts Active without archive state. |
| QA tools can mutate the active company's business records | High | Put test tools behind isolated fixture environments and explicit privileged controls. |

Reading order should be: document identity and status, permitted primary action, partner/location context, editable lines/totals, related documents/history. Preserve the Odoo app switcher, List/Kanban/Form conventions and status bars. A status badge is not a workflow control. Developer/rubric language should not compete with the normal business task.

### Consistency and accessibility

Use shared create/edit forms with required labels, helpful validation, pending-submit lock and explicit Save/Cancel. Add dirty-form warnings before navigation, Escape, backdrop dismissal and Cancel. Several existing dialogs dismiss immediately; no general unsaved-change mechanism was found. Do not rely on a disabled Save button for server-side idempotency.

Restrict delete/archive controls to authorized users, explain dependencies in a confirmation dialog, and distinguish safe permanent deletion, archival, draft cancellation, and posted reversal. Keep document history after archive. Source styling frequently uses 10–12px text; assess readability at 200% zoom. Touch-target adequacy, actual contrast, focus order, nested dialog behavior, mobile layouts and screen-reader announcements are **NOT VERIFIED**. Run desktop/mobile checks and accessibility tooling after implementation; this report does not claim WCAG conformance.

## 6. Deployment, deliverables and maintenance

No active public deployment was verified. Existing checklist still says public deployment pending. Preserve SQLite if deployed on durable storage with backup/restore and a supported single-writer arrangement; deployment architecture must account for concurrency and multi-company files. Do not use embedded baseline restoration as operational backup.

Existing README, architecture, diagrams, Decision Log and historical test reports are useful, but some SR/wireframe mappings and workflow-completeness claims contradict the PDF/current source. README has generic M1–M4 assignments, not proof of named Role Assignment Sheet, full Team Agreement, contribution table or member commits. Screenshots/video/presentation/public URL need current evidence rather than inferred completion. Disclose Codex audit/implementation assistance when updating AI disclosure later.

No npm dependency install, build, schema push, migration, original seed/reset, commit, deployment, or browser mutation was performed. TypeScript passed on the copied project using installed dependencies. Continue only after approval of the linked implementation plan, as explicitly required by the user's master prompt.
