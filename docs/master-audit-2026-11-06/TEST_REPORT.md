# Audit execution report and acceptance plan

> Laporan historis sebelum implementasi. Pengguna telah menyetujui rencana; lihat [hasil implementasi dan verifikasi terbaru](../implementation-2026-11-06/IMPLEMENTATION.md). Temuan/status di bawah tidak otomatis menggambarkan kode terbaru.

Executed on 6 November 2026 (Asia/Jakarta) against a temporary copy of the current source and disposable SQLite database. Application code, schema, installed dependencies, original databases and company registry were not altered.

## Executed checks

| Check | Actual result | Evidence / interpretation |
| --- | --- | --- |
| Existing phase 2/3 suite | 23 assertions passed,0 failed | [log](evidence/test_phase2_3.log); baseline/users/module-policy checks, not browser screenshots. |
| Existing phase 4 suite | 27 assertions passed,0 failed | [log](evidence/test_phase4.log); customer/CRM/sales/delivery engine checks. |
| Existing phase 5 suite | 14 assertions passed,0 failed | [log](evidence/test_phase5.log); purchase/receipt/vendor bill checks. |
| Existing phase 6 suite | 12 assertions passed,0 failed | [log](evidence/test_phase6.log); invoice/payment/ledger/retry checks. |
| Existing phase 7 suite | 19 assertions passed,0 failed | [log](evidence/test_phase7.log); transfer/POS/return checks. |
| Existing phase 8 suite | 17 assertions passed,0 failed | [log](evidence/test_phase8.log); baseline dashboard/reconciliation checks. |
| Existing chart/API suite | 16 assertions passed,0 failed | [log](evidence/test_charts.log); chart calculations and handler filters. |
| Total legacy regression | **128 passed /0 failed** | [machine results](evidence/regression-results.json). No suite process failed. |
| Re-executed compliance probesA01–A14 | **1 passed /13 failed** | [results](evidence/probe-results.json), [log](evidence/probe.log). Fresh baseline before each probe. |
| Additional CRUD/security probesB01–B17 | **0 passed /17 failed** | [results](evidence/crud-probe-results.json), [log](evidence/crud-probes.log). Fresh baseline before each probe. Contact disk-persistence subcheck independently passed. |
| Targeted probe total | **1 passed /30 failed;0 probe errors** |31 probes. FAIL indicates an observed missing control, not a crashed probe. |
| TypeScript compilation | PASS; exit0, no diagnostics | `node node_modules/typescript/bin/tsc --noEmit --incremental false` in copied project; [log](evidence/typecheck.log). |
| Original database structure | Four quick_check results `ok`; zero FK violations | [read-only results](evidence/original-database-readonly-checks.json). Not proof of financial correctness. |
| Original file preservation |134 hashed files unchanged | [before/after hashes](evidence/preservation.json), including all four original databases and company registry. |
| PDF review |34 pages read;16 wireframe pages rendered | [first contact sheet](evidence/pdf-wireframe-contact-1.png), [second contact sheet](evidence/pdf-wireframe-contact-2.png). |

No build, dependency installation, original seed/reset, migration, live HTTP server, browser interaction, public deployment or concurrent-request test was run. Prior build/browser statements in older documentation are not new execution evidence. Test TypeScript helpers operated within a disposable source copy, not the normal active company context.

## Why128 passing assertions do not mean32 accepted PDF cases

The legacy suites are organized by phase and often reset once per suite, not once per independent T-case. Some tests invoke the domain function or repeat a policy condition directly rather than exercise the real UI/API. For example, the legacy T-12 fixture follows prior stock-consuming cases; the fresh-baselineA13 probe reproduces the reserved-stock flaw that the accumulated stock state hides. T-08's incomplete-lead setup does not prove a normal user can move a CRM card; a normal stage control is absent. T-27 does not assert durable StockMove rows, duplicateSKU quantities or duplicate checkout requests.

The numbered T-case acceptance results below therefore remain **PARTIAL / NOT VERIFIED**, except specific contrary evidence is markedFAIL. Passing assertions are reported exactly as executed and are not inflated into unperformed browser acceptance. Correct fixtures, screenshots, protected API behavior, journal/movement records and source links are required for final acceptance.

## All32 required PDF cases: expected behavior, observations and remaining verification

Fixture rule: each independent test starts from fresh seed. Explicit `AfterT-xx` means recreate the named prerequisite(s) on that test's own baseline, not reuse the result of unrelated tests. For T-18, set up its stated accepted8/rejected2 receipt on its independent fixture. For edge cases with stakeholder conflicts, use the documented chosen policy from the Decision Log and compare actual behavior to it.

| Test / PDF page | Correct fixture and expected behavior | Actual executed observation / current gap | PDF acceptance status |
| --- | --- | --- | --- |
| T-01 /16 | Fresh baseline; Owner sees eight apps and PT Rasa Aruna Bersama. Screenshot and role identity. | Legacy session/module assertions pass; screen configuration inspected. No real login/browser screenshot executed. | NOT VERIFIED for full screen acceptance. |
| T-02 /16 | Fresh baseline; Cashier GL denied, audit event includes actor/time/document. | Legacy role/audit assertions pass; A01 journal API returns403. GeneralLedger denial source inspected; browser evidence absent. | PARTIAL. |
| T-03 /17 | Fresh baseline; C01 limit3m/A/R1.2m/headroom1.8m; C02 limit350k/A/R300k/headroom50k. | Legacy engine assertions reproduce both balances. Normal contact form/source ledger link not browser-verified. | PARTIAL. |
| T-04 /17 | Fresh baseline; C02 twoRICE-CHICK-S gross105600 exceeds50k headroom; confirmation rejected; balances unchanged, audit. | Legacy checks block confirmation and preserve headroom. Role bypass exists elsewhere; no full browser evidence. | PARTIAL. |
| T-05 /18 | Fresh baseline; RICE-CHICK-S price48000/cost26000; WH40/reserved6/available34; CAFE12; total52. | Baseline/product assertions pass. Product form/stock cards not browser-verified. | PARTIAL. |
| T-06 /18 | Fresh baseline; change Hot stock only; Iced prices/stock remain independent. Adjustment must retain source trace under new requirement. | Legacy variant checks pass. UI targets nonexistent `/stock` route; B04 valid stockPATCH has no valuation/movement. | PARTIAL; normal website adjustment incomplete. |
| T-07 /19 | Fresh baseline; LD0003 inQualified, C03 contact, opportunity1.2m; trace contact. | Legacy lead data assertions pass; Kanban source exists. No clicked detail/contact browser journey. | PARTIAL. |
| T-08 /19 | Fresh baseline; lead missing customer/value cannot move toProposition; validation+audit. | Legacy validation check passes; PATCH validates. B07 can instead create Proposition with implicitC01/value0; stage UI absent. | PARTIAL / create-path failure. |
| T-09 /20 | Fresh baseline; C01 quotation4small+2large; net316000/PBJT31600/gross347600/cost172000; exposure1547600/headroom1452400. | Legacy engine checks pass. Normal quotation cannot be confirmed through a selected-record action; role/negative-quantity probes fail. | PARTIAL. |
| T-10 /20 | Fresh baseline; Sales20% on2small requiresOwner; net76800/tax7680; approved price locks after confirmation; audit before/after. | Legacy approval/price-lock assertions pass. Normal approval/confirm/edit UX absent; B09 edits50% asCashier. | PARTIAL / draft guard failure. |
| T-11 /21 | Fresh baseline; confirm8small then deliver5; BO3; WH35/reserved9/available26; COGS130000; eligiblegross264000. | Legacy engine checks pass. Normal delivered quantity/validate form missing; full movement/audit/browser links not accepted. | PARTIAL. |
| T-12 /21 | Fresh baseline40onHand/6reserved/34available; attempt38; reject consuming anotherSO reservation. | Legacy cumulative-fixture check passes; A13 on fresh baseline accepts draft delivery38, onHand2/reserved−32. Invalid parent must be rejected. | FAIL for fresh-fixture reservation control. |
| T-13 /22 | Fresh baseline; transfer4Iced WH25→21/CAFE18→22; company43 unchanged; value52000; durable move/source evidence. | Legacy conservation assertions pass; transfer lacksStockMove; B11 Cashier validates it. | PARTIAL. |
| T-14 /22 | Fresh baseline; transfer28Iced fromWH25 rejected; both locations unchanged. | Legacy basic shortage rejection passes. Normal permission/company/movement evidence not accepted. | PARTIAL. |
| T-15 /23 | Fresh baseline; RFQ10Hot@12000; confirmPO net/total120000/tax0; stock unchanged. | Legacy engine assertions pass; ordinary selectedPO confirm missing. | PARTIAL. |
| T-16 /23 | Fresh fixture with samePO; retryconfirm produces no newreceipt/journal/sequence and retains trace. | Legacy sequential retry checks pass. Concurrent/repeatedHTTP behavior and browser action not executed. | PARTIAL. |
| T-17 /24 | Fresh baseline; PO10Hot, accepted8/rejected2; WH20→28; valuation/GRNI96000. | Legacy engine assertions pass. B14 repeated line accepts16; normal acceptance form absent. | PARTIAL / duplicate-line failure. |
| T-18 /24 | Independent fixture with8accepted/2rejected; bill10 rejected by three-way match; source/decision evidence. | Legacy normal excess-quantity guard passes. B13 repeatedSKU bill16 still posts; normal bill UX missing. | PARTIAL. |
| T-19 /25 | Fresh baseline+T-11; postinvoice5small, net240000/tax24000/gross264000; DrA/R264000/CrRevenue240000/CrPBJT24000. | Legacy engine assertions reproduce totals/journal. Normal create/post exists but browser/source drill-down not executed; A10 cumulative path fails. | PARTIAL. |
| T-20 /25 | Fresh baseline+T-11; invoice8 when5delivered rejected, leave3unbilled; audit. | Legacy direct excess guard passes; A10 sends5+5 and posts10. | PARTIAL / cumulative entitlement failure. |
| T-21 /26 | Fresh baseline+T-17; bill8Hot=96000/tax0; DrGRNI96000/CrAP96000; receiptGRNI cleared. | Legacy basic posting checks pass. A06 price mismatch/B13 duplicate quantities/B15 dashboardAP fail; no normal bill creation/post UI. | PARTIAL. |
| T-22 /26 | Fresh baseline+T-17+T-21; reject duplicatebilling of same8accepted; AP/GRNI/doc counts unchanged. | Legacy sequential duplicates rejected. B13 internal duplicateSKU bypass and concurrent posting remain unresolved. | PARTIAL. |
| T-23 /27 | Fresh baseline+T-19; customerBankpayment100000; paid100000/outstanding164000; Bank+100000/AR−100000. | Legacy engine assertions pass. Payment UI expects `remainingBalance`, API supplies `newOutstanding`; browser flow not executed. | PARTIAL. |
| T-24 /27 | Fresh baseline+T-19; rejectpayment300000 against264000; before/after balances and audit. | Legacy engine overpay checks pass. UI QA filters incompatibleCONFIRMED invoice status; retries/concurrentpayments not tested. | PARTIAL. |
| T-25 /28 | Fresh baseline+T-11+T-19; delivery DrCOGS=CrInventory130000; invoice DrAR264000=CrRevenue240000+CrPBJT24000; combined394000. | Legacy journal checks pass. Complete stock valuation/source trail and browserGL evidence absent. | PARTIAL. |
| T-26 /28 | Fresh baseline+T-11+T-19; repeatdelivery/invoiceposting; no additional stock/COGS/A/R/journals. | Legacy sequential retry assertions pass. State read occurs beforetransaction; concurrent posting not executed. | PARTIAL. |
| T-27 /29 | Fresh baseline; POS01,2Hot+1Cookie, QRIS; net80000/tax8000/paid88000/COGS33000; CAFEHot24→22/Cookie20→19; Bank+88000; receipt/moves/journal/payment. | Legacy financial/stock assertions pass. A05 zero durableStockMoves; A04 negative stock and B12 duplicate checkout; receipt output absent. | PARTIAL; required movement/receipt evidence incomplete. |
| T-28 /29 | Fresh baseline; POS25Hot against24 denied; repeatedclose no repost and correct cash summary. | Legacy shortage/retry assertions pass. A11 retry cash difference0→−33000; A04/B10 expose other stock paths. | PARTIAL / retry-summary failure. |
| T-29 /30 | Fresh baseline+T-11+T-19; return1small accepted; WH35→36; costreverse26000; creditnet48000/tax4800/gross52800; AR−52800. | Legacy undiscounted engine check passes. A07 discounted credit wrong/A08 cumulative over-return; no permanent returnStockMove. | PARTIAL. |
| T-30 /30 | Fresh baseline+T-11+T-19; return2small not yetaccepted; no restock/credit; inspection/source evidence. | Legacy pending guard passes. Role and completed-inspection lifecycle coverage missing; browser journey not executed. | PARTIAL. |
| T-31 /31 | Fresh baseline only; stock616/value12214000/AR1500000/AP1000000/Bank20000000;1lead/1confirmedSO/reserved6/1PO/POS0; smart-links. | Legacy baseline checks pass. B15 liveAP double-count/B17zeroBank fallback; metadata/source links incomplete. | PARTIAL. |
| T-32 /31 | Fresh baseline; display-only simulated+1unit; mismatch warning, source trail/audit; never mutate posted transaction or auto-post. | Legacy simulation/no-extra-journal assertions pass. Fixed sourceTrail and incomplete audit/source links remain; browser evidence absent. | PARTIAL. |

The expected numerical results above are the assignment's fictional simulation requirements, not current tax/legal advice. Do not total the PARTIAL rows as passes. A final32/32 acceptance statement requires new case-by-case execution evidence after implementation.

## Future CRUD, security and integration acceptance criteria

For every master module: valid create, required/invalid/type/range checks, duplicate identity conflicts, persisted read from a new connection, allowed edit, unauthorized/sensitive edit rejection, stale-version conflict, safe unused delete, referenced-record archive, restore and actor/before-after audit. Check customer/vendor email/address/phone persistence, vendorSKU prices, independentvariant stock/price/cost, and selectors reflecting new/archived records.

For documents: draft edit/cancel, state/line identity validation, confirmed/posted locks, reservation ownership/release, cumulative delivered/accepted/invoiced/billed/returned quantities, original rounding/valuation reversal, partial/full payment and overpayment protection. Every financial entry must balance and reconcile to valid source quantities and account movements; equality of debit/credit alone is insufficient.

For all sensitive APIs: six-role allow/deny matrix, unauthenticated401, unauthorized403, company membership, record/session ownership, no forbidden business mutation on denial, and audit. Test replay with a stable request key, changed payload under the same key, simultaneous confirmations, two different requests competing for the same stock/credit/remainingbill quantity, concurrent draft edits, and retry after a timeout. Current audit did not execute concurrent requests.

For persistence: create records through the website, refresh, navigate, logout/login, restartbrowser and restartdeployed service; inspect the same database-backed identities/totals. Test backups/restores on a separate environment. No destructive seed/reset on existing company data.

## Reproduction notes

Installed dependencies were reused without downloading packages. Source and scripts were copied into a temporary project; SQLite's backup API read the original baseline with `mode=ro` and created a disposable schema/data copy. Each suite/probe used an absolute `DATABASE_URL` inside that temporary project, an ephemeral JWT secret, and no Vercel/Lambda environment variables. Executions used `node --import tsx` and no network HTTP server. Legacy suites retain their original within-suite fixture limitations, documented above; eachA/Bprobe explicitly reseeded its disposable fixture.

Executed probe sources are preserved as `.ts.txt` evidence to avoid treating them as normal application tests. **Do not run these mutating seed/probe scripts in the original project or point them at an operational database.** A safe maintained harness with path guards is part of Phase A. Logs/JSON are the record of actual execution; future corrected tests must retain failing fixtures and add browser/concurrency coverage instead of relaxing expectations.

## Targeted probe register

The following tables are generated from the actual execution JSON, including expected and actual values. TheB06 persistence subcheck passed independently while the requested fields/balance-integrity checks failed. No PASS is inferred from a code review.

### Re-executed compliance probes

| Probe | Expected | Actual | Result |
| --- | --- | --- | --- |
| **A01** Cashier can access alternate journal API | 403 | 403 | PASS |
| **A02** Cashier can create Sales quotation through API | 403 | 200 | FAIL |
| **A03** Unknown POS product creates stock before session validation | Rejected request leaves stock unchanged | {"http": 400, "before": 616, "after": 816, "body": {"error": "Sesi POS invalid-session tidak aktif atau sudah ditutup."}} | FAIL |
| **A04** POS duplicate SKU lines must not produce negative stock | Reject 30 units when stock is 24 | {"blocked": false, "onHand": -6} | FAIL |
| **A05** POS paid event must provide durable stock-movement evidence | Durable movement records for T-27 evidence | {"before": {"moves": 0, "payments": 0}, "after": {"moves": 0, "payments": 0}} | FAIL |
| **A06** Vendor bill price must match Purchase Order | Reject 99000 when PO unit price is 12000 | {"blocked": false, "postedAmount": 792000, "billPrice": 99000} | FAIL |
| **A07** Return must reverse original discounted selling value | {"net": 43200, "pbjt": 4320, "gross": 47520} | {"net": 48000, "pbjt": 4800, "gross": 52800} | FAIL |
| **A08** Cumulative returns must not exceed quantity originally invoiced | Only 5 total units may be returned against a 5-unit invoice | {"blocked": false, "creditedDocuments": 2, "totalCredited": 528000, "originalGross": 264000} | FAIL |
| **A09** Draft invoice must not reduce credit exposure | Exposure unchanged until invoice posting | {"before": 1622400, "after": 1358400} | FAIL |
| **A10** Customer invoice duplicate SKU lines must not exceed delivered quantity | Reject total 10 when only 5 delivered | {"blocked": false, "invoiced": 10} | FAIL |
| **A11** POS cash difference remains consistent on repeated closure | Same zero cash difference on both close calls | {"first": 0, "retry": -33000} | FAIL |
| **A12** Delivery quantity must not exceed its ordered quantity | Reject delivery 9 for order 8 even when stock exists | {"blocked": false} | FAIL |
| **A13** Exact T-12 fresh-seed reserved-stock protection | {"blocked": true, "onHand": 40, "reserved": 6, "available": 34} | {"blocked": false, "onHand": 2, "reserved": -32} | FAIL |
| **A14** Procure-to-Pay requires settling the posted vendor bill | Vendor bill can be paid, reducing Bank and AP | {"http": 400, "body": {"error": "invoiceId dan amount pembayaran wajib disertakan."}} | FAIL |

### Additional CRUD, security and reporting probes

| Probe | Expected | Actual | Result |
| --- | --- | --- | --- |
| **B01** Cashier cannot create an Owner account | 403, no new account | {"http": 200, "createdRole": "OWNER"} | FAIL |
| **B02** Anonymous company edits and deletion are rejected | 401 for both requests, fixture file retained | {"editHttp": 200, "deleteHttp": 200, "fileExists": false} | FAIL |
| **B03** Anonymous demo seed cannot create posted documents | 401; database unchanged | {"http": 200, "before": {"orders": 0, "journals": 1}, "after": {"orders": 15, "journals": 1}} | FAIL |
| **B04** Stock adjustments create movement and valuation journal | Movement +1, Inventory +26000, balanced adjustment journal | {"http": 200, "before": {"moves": 0, "inventory": 12214000}, "after": {"moves": 0, "inventory": 12214000}} | FAIL |
| **B05** Cashier product creation cannot bypass operations permission | 403; no product | {"http": 200, "price": -100, "cost": -50, "vendor": "C01", "stock": [{"location": "CAFE-JKT", "onHand": 0}, {"location": "WH-JKT", "onHand": 7}]} | FAIL |
| **B06** Customer contact fields persist and opening balance cannot be minted | Contact details persist; opening receivable requires balanced migration workflow | {"http": 200, "reopenedName": "Audit Contact", "email": null, "phone": null, "address": null, "openingAR": 123456, "ledgerBefore": 1500000, "ledgerAfter": 1500000} | FAIL |
| **B07** CRM creation validates Proposition minimum fields | 403 for Cashier or 400 invalid lead | {"http": 200, "stage": "PROPOSITION", "customer": "C01", "revenue": 0} | FAIL |
| **B08** Negative sales quantities are rejected before reservation | Reject quantity -2; reserved remains 6 | {"blocked": false, "reserved": 4} | FAIL |
| **B09** Draft line edit enforces maximum discount of 20 percent | Reject unauthorized 50 percent discount | {"blocked": false, "discount": 50} | FAIL |
| **B10** POS respects session location and reserved inventory | Reject WH sale with CAFE session; WH stock40/reserved6 unchanged | {"http": 200, "onHand": 5, "reserved": 6} | FAIL |
| **B11** Cashier cannot validate warehouse transfers | 403 on create and validate | {"createHttp": 200, "validateHttp": 200} | FAIL |
| **B12** POS repeated request is posted exactly once | One order for repeated idempotency key | {"first": 200, "retry": 200, "orders": 2} | FAIL |
| **B13** Vendor bill aggregates repeated SKU quantities | Reject total16 billed for8 accepted | {"blocked": false, "gross": 192000} | FAIL |
| **B14** Receipt rejects repeated lines exceeding demand | Reject repeated receipt item; WH remains20 | {"blocked": false, "onHand": 36} | FAIL |
| **B15** Dashboard payable total agrees with posted bills and ledger | AP1096000 in dashboard and ledger | {"dashboard": 1192000, "ledger": 1096000} | FAIL |
| **B16** Sales confirmation cannot reserve beyond available stock | Block35 when40 onHand and6 reserved, or explicit waiting reservation policy | {"blocked": false, "onHand": 40, "reserved": 41, "available": -1} | FAIL |
| **B17** Dashboard preserves genuine zero bank balances | 0 | 20000000 | FAIL |
