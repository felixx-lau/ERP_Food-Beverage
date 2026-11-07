# Assignment compliance matrix

> Laporan historis sebelum implementasi. Pengguna telah menyetujui rencana; lihat [hasil implementasi dan verifikasi terbaru](../implementation-2026-11-06/IMPLEMENTATION.md). Temuan/status di bawah tidak otomatis menggambarkan kode terbaru.

Date: 6 November 2026. Source: the complete 34-page `24SI1 - Group 03 - Food and Beverage (1).pdf`, SHA-256 recorded in [AUDIT.md](AUDIT.md). Page numbers below are printed PDF pages. All current-source findings and executions refer to this working tree, not an assumed clean Git revision.

Must, Should and Optional below are the PDF's exact priorities. **F-04 and F-20 are Should; F-23 is Optional; the other 20 features are Must. All T-01–T-32 still have to be executed.** Additional dynamic CRUD requested in the master prompt is a separate P1 requirement; it is not presented as a retroactive change to PDF priority.

Status describes current coverage, not an acceptance certificate. Legacy assertions pass, but normal website workflows and adversarial probes expose gaps. All raw executions are in TEST_REPORT/evidence.

## F-01 through F-23

| ID / PDF feature | Exact priority | Source SR | PDF tests | Status and evidence | Required next work |
| --- | --- | --- | --- | --- | --- |
| F-01 Navigasi dan otorisasi | Must | SR-15 | T-01, T-02 | PARTIAL. Eight-app configuration/GL role guard exist; A01 denies Cashier GL, A02/B01/B02/B11 expose other bypasses. | Enforce operation/company/ownership permissions across all handlers and engines, then browser login/navigation. |
| F-02 Kontak dan ketentuan kredit | Must | SR-09 | T-03, T-04 | PARTIAL. Baseline limits/headroom pass; contact create/read persists, user CRUD incomplete. | Edit/archive/delete, contact fields, live balances, authorized credit changes. |
| F-03 Produk dan variant SKU | Must | SR-17 | T-05, T-06 | PARTIAL. Independent15SKU baseline passes; by-name normalization and unsafe master/stock writes violate variant integrity. | Explicit SKU selection, metadata administration and valid source-backed adjustments. |
| F-04 CRM pipeline | Should | SR-16 | T-07, T-08 | PARTIAL. Create/read/PATCH exist; cards lack user stage/detail/quotation flow; B07 bypasses validation at creation. | Lead detail/stage editing and linked quotation creation. |
| F-05 Quotation ke Sales Order | Must | SR-16, SR-09 | T-09, T-10 | PARTIAL. Persistent quotation/confirmation engine; normal UI cannot confirm selected quotation; invalid quantities accepted. | Normal multi-line edit/confirm/cancel, role checks, validations, source links. |
| F-06 Diskon dan price lock | Must | SR-07, SR-08 | T-09, T-10 | PARTIAL. Basic approval/confirmed price-lock tests pass; B09 sets50% via edit. | Consistent0–20% validation, Owner approval UI, atomic totals and immutable confirmed prices. |
| F-07 Reservation dan available stock | Must | SR-04 | T-11, T-12 | FAIL. A13/B08/B10/B16 violate reservation invariants. | Owned reservation allocations, available checks, cancellation/release and concurrency protection. |
| F-08 Partial delivery dan backorder | Must | SR-10 | T-11, T-12 | PARTIAL / unsafe. Basic5-of8/backorder3 works; A12 allows9-of8; A13 invalid draft consumes reservations. | Lifecycle, line identity, cumulative remaining bounds, normal quantity-entry UI. |
| F-09 Delivery-based invoicing | Must | SR-01, SR-02 | T-19, T-20 | FAIL under repeatedSKU input. A10 posts10 against5 delivered. | Aggregate by source line and recheck billable entitlement atomically at posting. |
| F-10 Credit control | Must | SR-09 | T-03, T-04, T-09 | PARTIAL / unsafe. Baseline controls pass; A09 draft invoice creates false headroom. | Correct posted/open exposure calculation, transactional confirmation and draft lifecycle. |
| F-11 RFQ dan Purchase Order | Must | SR-05, SR-13 | T-15, T-16 | PARTIAL. Engine/create works without immediate stock movement; draft editing and normal confirm absent. | Normal selected-record draft edit/confirm/cancel, validation and retry controls. |
| F-12 Receipt dan accepted quantity | Must | SR-06 | T-17, T-18 | PARTIAL / unsafe. Basic8accepted/2rejected works; B14 repeated item adds16. | Normal QC form, cumulative demand, stable PO-line references, movement/audit completeness. |
| F-13 Vendor Bill dan three-way match | Must | SR-05, SR-06 | T-21, T-22 | FAIL under price/repeatedSKU inputs. A06 bills99000 vsPO12000; B13 bills16 vsaccepted8. | PO price + accepted + prior billing match at create/post; normal bill UI. |
| F-14 Ledger dan COGS | Must | SR-13 | T-25, T-26 | PARTIAL. Basic journals balance; stock creation/adjustments bypass valuation; source events can be invalid. | Source-backed posting, fixed monetary rules, reversal workflow, unique source event and movement links. |
| F-15 Partial payment | Must | SR-19 | T-23, T-24 | PARTIAL. Customer partial payment/overpay engine checks pass; vendor payment missing (A14). | Customer UI contract/retries and vendor payments through settlement. |
| F-16 Point of Sale restoran | Must | SR-03, SR-04, SR-18 | T-27, T-28 | FAIL on adversarial inputs. A03/A04/B10/B12 mint stock, go negative, consume reservations or duplicate sale. | StrictSKU/session/available checks, persistent movements, receipt/refund and request identity. |
| F-17 POS session closing | Must | SR-14, SR-13 | T-27, T-28 | PARTIAL. Repeat close avoids second posting in basic tests; A11 summary changes on retry. | Role/ownership/location checks and stable stored closure summary. |
| F-18 Return dan Credit Note | Must | SR-11 | T-29, T-30 | FAIL on discounted/cumulative returns (A07/A08); basic inspection guard passes. | Original net/tax/cost reversal caps, completed-inspection locking, role separation and permanent moves. |
| F-19 Internal Transfer | Must | SR-12, SR-04 | T-13, T-14 | PARTIAL. Basic movement conserves company totals; B11 unauthorized mutation and no StockMove insertion. | Warehouse authorization, proper location/master validation, movements and draft cancel/edit. |
| F-20 Dashboard operasional | Should | SR-20 | T-31, T-32 | PARTIAL / inaccurate dynamically. Baseline passes; B15 double-counts A/P, B17 replaces genuine zero Bank. | Canonical balances, accurate metadata/PBJT/POS, direct source drill-down and protected reads. |
| F-21 Audit trail dan document relations | Must | SR-13, SR-15, SR-20 | T-02, T-32 | PARTIAL. Audit records exist; many before/after states absent, failures swallowed, sourceTrail static. | Atomic audit for sensitive writes and protected entity/document trails; no fake reconciliation posting. |
| F-22 PBJT F&B | Must | SR-18 | T-19, T-27 | PARTIAL. Basic10% per-net-line tests pass; discounted return reversal is wrong. | Validate positive inputs, preserve original rounded tax in reversals and correct ledger reporting. |
| F-23 Promosi loyalitas digital | Optional | SR-20 | Additional tests beyond T-01–T-32 | MISSING / permitted deferral. Not required before Must completion. | Consider only after P0/P1 acceptance; coupons must preserve tax/retry controls. |

## SR-01 through SR-20

SR rows are stakeholder requests, not all simultaneously implementable policies. Preserve the rejected requests in Decision Defense. Existing Decision Log chooses SR-02 over SR-01, SR-04 over SR-03, SR-06 over SR-05, and controlled SR-08 approval over unconditional SR-07 discount freedom. This audit retains those choices; it does not silently rewrite the original SR meanings.

| ID | Original measurable request, paraphrased | Policy / current assessment | Trace |
| --- | --- | --- | --- |
| SR-01 | Invoice100% of confirmedSO before delivery. | Conflicts with SR-02. Record deliberate rejection in favor of delivered-only invoicing; retain prepayment/deposit as a separately designed option, not a fake goods invoice. | F-09; T-19/T-20; Decision LogD-01. |
| SR-02 | Goods invoice quantity cannot exceed valid delivered quantity; do not bill backorders. | Chosen policy; cumulative quantity control failsA10. | F-09; T-19/T-20. |
| SR-03 | Allow POS completion despite insufficient CAFE available stock. | Conflicts with SR-04; deliberately reject negative/reserved consumption. Mitigation is authorized transfer/replenishment, not auto-created stock. | F-16/F-17; T-27/T-28; D-02. |
| SR-04 | Delivery/POS/transfer never make on-hand negative or consume another transaction's reservation. | Chosen policy; failsA04/A12/A13/B10; oversubscriptionB16. | F-07/F-08/F-16/F-19; T-11–T-14/T-28. |
| SR-05 | Bill the entire ordered quantity immediately afterPO confirmation. | Conflicts with SR-06; deliberately reject billing unaccepted units. Preserve supplier trade-off/mitigation. | F-11/F-13; T-15/T-18/T-21/T-22; D-03. |
| SR-06 | Bill at most DONE-receipt accepted units not already billed, atPO unit price. | Chosen policy; base quantity check exists; priceA06 and duplicateSKU quantityB13 fail. | F-12/F-13; T-17/T-18/T-21/T-22. |
| SR-07 | Sales may discount0–20% without additional approval. | Retain0–20% range but reject unconditional freedom above 10% under SR-08. Edit path currently accepts50% (B09). | F-06; T-09/T-10; D-04. |
| SR-08 | Discounts above 10% require recorded Owner approval; confirmedSO price/discount locked. | Basic approval/price lock passes; normal approval UI and consistent draft-edit guards incomplete. | F-06; T-10. |
| SR-09 | Exposure=openA/R+gross confirmed-uninvoiced orders; new order cannot exceed limit. | Base limit tests pass; draft invoice exposure gapA09; concurrent confirmation not verified. | F-02/F-05/F-10; T-03/T-04/T-09. |
| SR-10 | Partial delivery creates only remaining backorder; stock/reservation updates occur once. | Basic5-of8 works; over-delivery/lifecycle/duplicate requests need repair. | F-08; T-11/T-12/T-26. |
| SR-11 | Only inspected-accepted returns restock; credit capped to returned value with tax/COGS reversal. | Basic pending guard works; discounts and cumulative limits failA07/A08; original cost snapshot and inspection lock incomplete. | F-18; T-29/T-30. |
| SR-12 | Transfer equalSKU/quantity/value out/in; company total constant. | Basic conservation tests pass; authorization and permanent movement evidence missing. | F-19; T-13/T-14. |
| SR-13 | Unique document numbers; repeated validation/posting cannot repeat stock/journals; every journal balances. | Basic retries pass; B12 repeatedPOS creates two postings; documentRef lacks unique source constraint; races not tested. | F-11/F-14/F-17/F-21; T-16/T-22/T-26/T-28. |
| SR-14 | POS order has session/method; session close summarizes transactions; retry does not repost. | Data present, but summary changesA11 and session ownership/location validation absent. | F-17; T-27/T-28. |
| SR-15 | Six roles with separate responsibilities; status changes retain actor/time/action/document/core before-after. | GL check worksA01; escalationB01/B02 and module writesA02/B05/B11 fail; audit incomplete. | F-01/F-21; T-01/T-02. |
| SR-16 | Lead has name/customer/value/New–Qualified–Proposition–Won; quotation links to lead. | PATCH validation partial; B07 create bypass; normal stage/quotation UI absent. | F-04/F-05; T-07–T-10. |
| SR-17 | EachSKU has independent price/cost/unit/location stock; never merge variants automatically. | Schema separates variants; name matching and auto-provisioning are unsafe; metadata CRUD incomplete. | F-03; T-05/T-06. |
| SR-18 | PBJT10% of discounted net per line, nearestRupiah; vendor fixture tax0%. | Base calculation tests pass; return reverses undiscounted taxA07; current general tax compliance is outside this fictional assignment audit. | F-22; T-19/T-27/T-29. |
| SR-19 | Invoice/bill payment reduces outstanding and moves Bank; reject overpayment. | Customer basic flow works; vendor settlement missingA14; duplicate-request/concurrent payment coverage missing. | F-15; T-23/T-24 and separateP2P settlement acceptance. |
| SR-20 | Dashboard stock/valuation/A/R/A/P/openorders/PBJT/POS traces to valid sources without double posting. | Baseline/simulated mismatch checks pass; A/P/zeroBank source defectsB15/B17, static trails and unauthenticated seed/reporting undermine dynamic truth. | F-20/F-21; T-31/T-32. |

## S-01 through S-16

Each screen needs the PDF's core fields/document identity, applicable status/view controls, search/filter/group-by, related documents, Log Notes, and Audit/History. Color/branding/styling are free. The mandatory screen/test evidence has not been accepted merely because a route exists.

| PDF screen / page | Route | Present | Missing or incomplete normal user behavior |
| --- | --- | --- | --- |
| S-01 Beranda dan App Switcher /16 | `/` | Eight modules, company/user, app/list layout. | Enforced permissions beyond client navigation, correct user default location, browser screenshots and denial/audit evidence. |
| S-02 Contact Form dan Credit Exposure /17 | `/sales/contacts` | Customer identity/terms/limit/headroom and create modal. | Vendor list, communication fields, full liveA/R/history, edit/archive/delete, list controls; labels incorrectly call thisS-03. |
| S-03 Product dan VariantSKU /18 | `/inventory/products` | IndependentSKU/location read, table/detail/create, search/sort/pagination. | Metadata edit/archive/categories, valid adjustment UX, dynamic locations; T-06 UI calls nonexistentstock suffix. |
| S-04 CRM Pipeline Kanban /19 | `/crm/leads` | Four stages, cards, values, lead creation. | Clickable detail, keyboard stage management, validation atcreate, quotation-from-lead action; label incorrectlyS-02. |
| S-05 Quotation dan Sales Order Form /20 | `/sales/orders` | Customer/terms/pricing, totals/status/price-lock display, create modal. | Selected-record approval/confirm, full draft edit/cancel and related links; QA tests are not operational forms. |
| S-06 Delivery Order dan Backorder /21 | `/inventory/delivery` | SelectedDO/source/SO/ordered/delivered/backorder display. | Normal input/validation for selectedDO, line bounds, linked backorder/source navigation, real movement trail. |
| S-07 Stock Overview dan Internal Transfer /22 | `/inventory/transfers` | Draft create and validate, source/destination/lines. | Warehouse permissions, draft edit/cancel, dynamic location selectors, permanent movement/history details. |
| S-08 RFQ dan Purchase Order /23 | `/purchase/orders` | Vendor/date/lines/status and create modal. | Normal selectedPO confirm, draft edit/cancel, vendor price lists and linkedreceipt flow. |
| S-09 Receipt dan Quality Acceptance /24 | `/inventory/receipts` | Demand/accepted/rejected/reason fields displayed. | User-editable acceptance/rejection lines and selectedreceipt validation; QA creates fixedPO/receipt. |
| S-10 Customer Invoice Form /25 | `/accounting/invoices` | Normal create/post, customer/SO/lines/PBJT, payment link. | Draft edit/cancel, cumulative quantity checks, protected capabilities, direct source details and printable output. |
| S-11 Vendor Bill dan Three-Way Match /26 | `/accounting/vendor-bills` | Selectedbill/PO/vendor/match/journal display. | Normal create/post/edit draft, prices and aggregated matching, vendor payment action. |
| S-12 Register Payment /27 | `/accounting/payments` | Customer payment form/history, amount/method, filtering/sort/pagination. | Vendor allocation, consistent response/outstanding feedback, retries, payment date handling and reversal history. |
| S-13 Journal Entries dan General Ledger /28 | `/accounting/journal-entries` | Protected journal view, Dr/Cr, source strings/filter. | Full source drill-down, dedicated permittedCoA administration, authorized reversal/reporting, traceable valuations. |
| S-14 Point of Sale Restoran /29 | `/pos` | Cartediting, dine-in/takeaway, paymentmethod, open/close, transaction history. | Empty initialbasket, SKU/session ownership/available checks, exactly-once checkout, durable stockmoves, actualreceipt/refund workflow. |
| S-15 Return Inspection dan Credit Note /30 | `/inventory/returns` | Create/inspect/process forms; invoice/credit detail. | Correct discounted/cumulative/historical valuation, Warehouse/Finance permissions, completedlocks, persistent movements. |
| S-16 Dashboard dan Rekonsiliasi /31 | `/dashboard` | BaselineKPI, charts, filters, simulatedmismatch and no-auto-post flag. | Correct livebalances/company/date/dataset, explicitPBJT/POS reporting, source-specific links, authenticated reads and source-integrity evidence. |

All sixteen screens require browser verification at desktop and narrow widths after changes. Existing generic drawer/history navigation is not automatically equivalent to per-record Log Notes and direct document relations.

## Baseline and submission requirements

Baseline totals and core fixture identities were reproduced by executed regression assertions. Vendor-price-list, tax-rate and payment-term dataset semantics are currently represented incompletely by defaults/enums/hardcoded formulas rather than administered records. The absence of a vendor-price-list table must not be concealed by matching standard costs.

Required public URL, refresh/restart persistence, six authenticated role demonstrations, current32case evidence, named team/ownership agreements, contribution history, video≤10minutes, presentation15minutes+10minutesQ&A and Decision Defense remain separate deliverables. Existing reports/checklists are not proof those items were executed or delivered. The master prompt's new CRUD requirements extend the implementation without changing original assignment priorities.
