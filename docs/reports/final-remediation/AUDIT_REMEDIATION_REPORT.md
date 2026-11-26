# Remediasi akhir ARVO ERP

**Ringkasan.** Build lokal dari checkout `2005b7b` dengan remediasi memenuhi 32 pengujian wajib pada fixture terisolasi. Profil demo penilaian memiliki 15 SKU, 15 daftar harga vendor, 616 unit, dan valuasi Rp12.214.000. Deployment publik untuk release ini **BLOCKED** sampai tersedia akses staging PostgreSQL, enam akun demo berwenang, dan persetujuan promosi.

Acuan adalah `Group03_24SI1_FnB_Audit.docx` dan handout `24SI1 - Group 03 - Food and Beverage.pdf`. [Matriks persyaratan](REQUIREMENT_TRACEABILITY_MATRIX.md) · [Decision Log](../DECISION_LOG.md) · [Arsitektur aktual](../../architecture/DOKUMENTASI_ALUR_DAN_ARSITEKTUR_SISTEM.md)

| Temuan | Sebelum | Sesudah | Status lokal |
| --- | --- | --- | --- |
| P1.1 Akses Owner | Direktori halaman per kelompok | Delapan kartu yang menuju rute yang sudah ada di Beranda dan App Switcher, terlihat pada desktop dan mobile. Cashier tetap ditolak dari GL. | PASS |
| P1.2 Data dan RFQ | Database kerja punya transaksi tambahan. Daftar harga vendor kosong dan fallback tidak berlabel. | Profil khusus grading tervalidasi. Harga RFQ mengikuti vendor, SKU dan tier kuantitas. Fallback biaya standar terlihat. Harga PO menjadi sumber bill. | PASS |
| P1.3 Deployment | Endpoint publik login tersedia. Identitas release belum tersedia. | Build marker teruji lokal. Halaman Vercel aktif dan masih mengembalikan 404 untuk build marker. PostgreSQL staging dan akun publik perlu verifikasi. | PARTIAL lokal · BLOCKED publik |
| P2.1 Otoritas diskon | Head Admin dapat menyetujui diskon di atas 10%. | Owner memberi keputusan dengan alasan, waktu, identitas dan versi. Perubahan draft menghapus persetujuan aktif. Harga terkunci setelah konfirmasi. | PASS |
| P2.2 Smoke Lead | Probe meminta hapus saat Lead aktif dan berhenti pada HTTP 409. | Probe memverifikasi 409, pembatalan, versi terbaru, hapus, audit, dan Lead baseline. Checkpoint lolos restart. | PASS |
| P2.3 Rekonsiliasi | Dua tenant memiliki stok tanpa jurnal 1030 yang mendukung. | Empat tenant diaudit. Profil grading cocok. Tampilan simulasi T-32 dan tautan jurnal diuji. Dua kasus tenant menunggu dokumen pembuka yang sah. | PARTIAL untuk koreksi tenant |

## Transaksi dan bukti

Lihat [validasi enam masalah](BUSINESS_PROBLEM_VALIDATION.md), [laporan pengujian](TEST_EXECUTION_REPORT.md), [bukti baseline](evidence/demo-baseline.json), dan [rekonsiliasi](DATABASE_RECONCILIATION_REPORT.md). Hasil mempertahankan perbedaan antara suite backend, penerimaan browser, dan pemeriksaan deployment anonim.

## Perubahan source

| Area | Berkas dan alasan |
| --- | --- |
| Navigasi | `src/app/page.tsx`, `AppSwitcherModal.tsx`, `Topbar.tsx`, dan `src/app/pos/page.tsx` memakai tujuan rute yang sudah berizin. POS Owner memiliki judul untuk layar baca historinya. |
| Harga dan invoice | `purchasePricing.ts`, `purchaseEngine.ts`, `CreatePurchaseOrderModal.tsx`, `DocumentControls.tsx`, `documentWorkflow.ts`, `invoiceChoices.ts`, dan `CreateInvoiceModal.tsx` menyatukan saran harga dan membuat sumber harga/qty terlihat. |
| Diskon dan margin | `discountPolicy.ts`, `discountApproval.ts`, `salesEngine.ts`, route sales orders dan approve-discount, halaman sales orders, `operationalOverview.ts` serta `uxFlows.ts` memberlakukan kebijakan Owner. Route invoice/delivery menyaring estimasi margin quotation berdasarkan role. |
| Akses dan runtime | `apiAuthorization.ts` mencatat penolakan terautentikasi. `prisma.ts` menghilangkan fallback database berdasarkan basename. `next.config.mjs`, `.env.example` dan `/api/version` menyediakan penanda build. |
| Data dan QA | `prepare_grading_demo.py`, `seed_grading_demo.ts`, dan `seedData.ts` membuat fixture mandiri. `reconcile_inventory.py`, `smoke_http.py`, `verify_grading_browser.mjs` dan suite regresi membuktikan penerimaan. |

## Database, keamanan, dan persiapan rilis

Backup SQLite empat tenant dan registri dibuat di folder lokal yang diabaikan Git. Hash semua database kerja dan registri cocok dengan awal verifikasi. Metadata keputusan memakai `AuditLog.afterState` serta kolom SO yang sudah ada. Remediasi tidak memerlukan perubahan schema SQLite atau migrasi transaksi historis. Draft lama dengan persetujuan yang tidak memiliki jejak keputusan Owner yang lengkap perlu ditinjau lagi.

Pemeriksaan tenant menggunakan dua database pada server salinan. Sesi lama menjadi 401 saat tenant berganti. Sesudah login pada tenant tujuan, pelanggan dari tenant lain tidak terlihat pada kedua arah. Cakupan pengujian keamanan adalah kontrol akses dan keramahan error pada alur yang diperiksa.

## Checklist presentasi

- [x] Demo grading terisolasi tersedia, enam akun lokal terverifikasi dan baseline lulus.
- [x] Perintah start, langkah bisnis, kasus wajib dan rujukan bukti tersedia.
- [x] Akses Owner, Cashier dan penanda build diuji lokal.
- [ ] Validasi enam akun, kecocokan build dan persistensi release pada Vercel staging.
- [ ] Finance mengumpulkan dokumen pembukaan dua tenant MISMATCH untuk menilai koreksi.
- [ ] Konfigurasi lint CI dan uji beban pada database PostgreSQL.

[Alur demo](DEMO_WALKTHROUGH.md) · [Deployment dan rollback](DEPLOYMENT_READINESS.md)
