# Laporan pengujian akhir

Semua suite berikut benar-benar dieksekusi pada salinan proyek/database. Log dan expected/actual tersedia di folder evidence. PASS layanan/API bukan PASS visual/browser atau deployment.

| Suite | Hasil | Kegagalan | Bukti |
|---|---:|---:|---|
| test_phase2_3 | 23 pemeriksaan/kelompok | 0 | [test_phase2_3.log](evidence/test_phase2_3.log) |
| test_phase4 | 27 pemeriksaan/kelompok | 0 | [test_phase4.log](evidence/test_phase4.log) |
| test_phase5 | 14 pemeriksaan/kelompok | 0 | [test_phase5.log](evidence/test_phase5.log) |
| test_phase6 | 12 pemeriksaan/kelompok | 0 | [test_phase6.log](evidence/test_phase6.log) |
| test_phase7 | 19 pemeriksaan/kelompok | 0 | [test_phase7.log](evidence/test_phase7.log) |
| test_phase8 | 17 pemeriksaan/kelompok | 0 | [test_phase8.log](evidence/test_phase8.log) |
| test_charts | 16 pemeriksaan/kelompok | 0 | [test_charts.log](evidence/test_charts.log) |
| test_crud | 8 pemeriksaan/kelompok | 0 | [test_crud.log](evidence/test_crud.log) |
| test_pdf_cases | 32 pemeriksaan/kelompok | 0 | [test_pdf_cases.log](evidence/test_pdf_cases.log) |
| test_integrity | 10 pemeriksaan/kelompok | 0 | [test_integrity.log](evidence/test_integrity.log) |
| audit-expectations | 14 pemeriksaan/kelompok | 0 | [audit-probes.json](evidence/audit-probes.json) |
| typecheck | 0 pemeriksaan/kelompok; exit 0 | 0 | [typecheck.log](evidence/typecheck.log) |
| build | 0 pemeriksaan/kelompok; exit 0 | 0 | [build.log](evidence/build.log) |

Legacy regression: **128 assertion PASS**. CRUD baru: **8 kelompok PASS**. T PDF independen: **32 kasus PASS**. Integritas: **10 kelompok PASS**. Probe audit A: **14 PASS**. Typecheck/build: **exit 0**. Ukuran unit berbeda, sehingga jumlah kelompok tidak diiklankan sebagai jumlah seluruh assertion.

HTTP server hasil build: **13 kelompok PASS**; restart/login baru: **3 kelompok PASS**, termasuk membaca record yang dibuat sebelum proses berhenti. Browser host unavailable/Chrome timeout: **NOT VERIFIED**. Hosting publik: **NOT VERIFIED**.

## Expected / actual T01–T32

Prasyarat diulang dari baseline baru per kasus. T01 memeriksa konfigurasi/token, bukan klik navigasi. T02 memanggil handler GL, bukan simulasi audit. Semua nilai numerik lebih lengkap ada pada [JSON](evidence/pdf-cases-results.json).

| Kasus | Expected | Actual | Hasil |
|---|---|---|---|
| T01 | Owner apps: 8; valid owner token: "string" | 8; "string" | PASS |
| T02 | real GL handler denial: 403; denied audit persisted: 1 | 403; 1 | PASS |
| T03 | C01: [3000000, 1200000, 1800000]; C02: [350000, 300000, 50000] | [3000000, 1200000, 1800000]; [350000, 300000, 50000] | PASS |
| T04 | gross: 105600; credit confirmation: "rejected"; headroom unchanged: 50000 | 105600; "rejected"; 50000 | PASS |
| T05 | variant stock and cost: [48000, 26000, 40, 6, 34, 12, 52] | [48000, 26000, 40, 6, 34, 12, 52] | PASS |
| T06 | Hot/iced independent: [25, 25]; inventory adjustment ledger: 12274000 | [25, 25]; 12274000 | PASS |
| T07 | qualified lead: ["C03", "Klinik Harmoni", "QUALIFIED", 1200000] | ["C03", "Klinik Harmoni", "QUALIFIED", 1200000] | PASS |
| T08 | Proposition requires revenue: "rejected"; stage unchanged: "NEW" | "rejected"; "NEW" | PASS |
| T09 | quotation: [316000, 31600, 347600, 172000]; confirmed exposure: [1547600, 1452400] | [316000, 31600, 347600, 172000]; [1547600, 1452400] | PASS |
| T10 | discount: [76800, 7680, false]; unapproved confirmation: "rejected"; confirmed price lock: "rejected" | [76800, 7680, false]; "rejected"; "rejected" | PASS |
| T11 | independent physical/reserved/available: [35, 9, 26]; backorder: 3; COGS and invoice eligibility: [130000, 264000] | [35, 9, 26]; 3; [130000, 264000] | PASS |
| T12 | 38 exceeds available 34, sufficient customer credit: "stock guard rejected"; physical/reserved protected: [40, 6] | "stock guard rejected"; [40, 6] | PASS |
| T13 | location/company totals: [21, 22]; valuation unchanged: 12214000; permanent transfer moves: 1 | [21, 22]; 12214000; 1 | PASS |
| T14 | transfer over available: "rejected"; stock unchanged: 25 | "rejected"; 25 | PASS |
| T15 | PO quantity price tax total: [10, 12000, 0, 120000]; RFQ has no physical effect: 20 | [10, 12000, 0, 120000]; 20 | PASS |
| T16 | same receipt: "cmw5237u701hzozf6xwptdtlb"; one receipt: 1; no stock effect: 20 | "cmw5237u701hzozf6xwptdtlb"; 1; 20 | PASS |
| T17 | accepted stock/value/GRNI: [28, 12310000, 96000]; rejected replacement backorder: 2 | [28, 12310000, 96000]; 2 | PASS |
| T18 | bill cannot include rejected units: "rejected"; no bill posted: 0 | "rejected"; 0 | PASS |
| T19 | invoice: [240000, 24000, 264000]; AR ledger: 1764000 | [240000, 24000, 264000]; 1764000 | PASS |
| T20 | invoice cannot exceed 5 delivered: "rejected"; no invoice: 0 | "rejected"; 0 | PASS |
| T21 | matched bill: [96000, 0, 1096000]; AP not double counted: 1096000 | [96000, 0, 1096000]; 1096000 | PASS |
| T22 | duplicate billed quantities: "rejected"; no duplicate posting: {"journals": 3, "moves": 1, "payments": 0} | "rejected"; {"journals": 3, "moves": 1, "payments": 0} | PASS |
| T23 | partial payment: [164000, 20100000, 1664000] | [164000, 20100000, 1664000] | PASS |
| T24 | overpayment 300000: "rejected"; no partial payment effects: {"journals": 3, "moves": 1, "payments": 0} | "rejected"; {"journals": 3, "moves": 1, "payments": 0} | PASS |
| T25 | two source journals: 2; balanced WH/OUT/0007: 0; balanced INV/2026/0007: 0; journal debit 130000 + 264000: 394000 | 2; 0; 0; 394000 | PASS |
| T26 | repeat validation/post unchanged: {"journals": 3, "moves": 1, "payments": 0} | {"journals": 3, "moves": 1, "payments": 0} | PASS |
| T27 | POS totals: [80000, 8000, 88000, 33000]; cafe stock: [22, 19]; bank: 20088000; permanent source moves: 2 | [80000, 8000, 88000, 33000]; [22, 19]; 20088000; 2 | PASS |
| T28 | 25 Hot exceeds cafe24: "rejected"; close retry preserves summary: 0; close retry no posting: {"journals": 1, "moves": 0, "payments": 0} | "rejected"; 0; {"journals": 1, "moves": 0, "payments": 0} | PASS |
| T29 | credit net tax gross cost: [48000, 4800, 52800, 26000]; restock and AR: [36, 1711200] | [48000, 4800, 52800, 26000]; [36, 1711200] | PASS |
| T30 | pending QC cannot post: "rejected"; no stock/ledger credit effects: {"journals": 3, "moves": 1, "payments": 0}; stock protected: 35; no credit note: 0 | "rejected"; {"journals": 3, "moves": 1, "payments": 0}; 35; 0 | PASS |
| T31 | untouched dashboard: [616, 12214000, 1500000, 1000000, 20000000, 1, 1, 6, 1, 0] | [616, 12214000, 1500000, 1000000, 20000000, 1, 1, 6, 1, 0] | PASS |
| T32 | simulated mismatch: ["MISMATCH", true]; no automatic correction: {"journals": 1, "moves": 0, "payments": 0}; actual stock unchanged: 616 | ["MISMATCH", true]; {"journals": 1, "moves": 0, "payments": 0}; 616 | PASS |

## Cakupan bukti HTTP

HTTP memakai source snapshot gwivqb9z. Handler master/workflow/auth yang diuji sama dengan build akhir ld2pqvug; konsolidasi legacy CRM setelahnya diuji melalui handler pada test_crud dan build akhir. Pengujian HTTP mengirim cookie secure secara eksplisit ke loopback; perilaku cookie browser tetap memerlukan HTTPS/browser acceptance. Tidak ada bukti screenshot yang dibuat-buat.

Database perusahaan asli tidak direset oleh suite. Hash sebelum/sesudah setiap run dicantumkan di results.json. Bukti preservasi migrasi memeriksa baris lama secara terpisah.
