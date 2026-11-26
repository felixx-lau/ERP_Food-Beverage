# Laporan pelaksanaan pengujian

Tanggal 25 November 2026. Kode berasal dari checkout `2005b7b` dan perubahan kerja yang diberi penanda `2005b7b-dirty`. Semua transaksi tes memakai salinan database. Pengujian browser dan HTTP dilakukan pada build Next.js lokal. [Revisi yang dijalankan](evidence/browser-results.json)

| Pemeriksaan | Expected | Actual | Status |
| --- | --- | --- | --- |
| T-01–T-32 | Semua kasus lulus dari fixture masing-masing | 32/32 lulus. Detail expected/actual dan penolakan ada pada register. | PASS · [Register JSON](evidence/pdf-cases.json) |
| Full regression | Semua suite keluar dengan kode 0 | 22 suite, 259 pemeriksaan PASS, 0 FAIL. | PASS · [Ringkasan JSON](evidence/regression.json) |
| TypeScript dan build | Exit 0 | Keduanya exit 0. | PASS · [Ringkasan JSON](evidence/regression.json) |
| T-01 Chrome | Delapan pintasan Owner dan tujuan benar | 8 kartu pada Beranda dan dialog. Semua tujuan diklik. Pemeriksaan mobile 390 px dan pembukaan dialog lulus. | PASS · [Desktop](evidence/01-owner-home.png) · [Dialog](evidence/02-owner-switcher.png) · [Mobile](evidence/03-owner-mobile.png) |
| T-02 Chrome dan API | Cashier ditolak, aktor tercatat | Tampilan menolak akses. Endpoint 403 dan AuditLog ACCESS_DENIED tersimpan. | PASS · [Layar](evidence/04-cashier-gl-denied.png) · [Audit](evidence/browser-database-verification.json) |
| Role, layar dan workflow browser | Enam login, 16 rute, 3 alur end-to-end | 6 role, 16 rute, O2C dan P2P lunas. Retur Rp52.800 dan POS Rp88.000 selesai. | PASS · [Chrome JSON](evidence/browser-results.json) |
| Approval, negative dan boundary | Owner-only dan revisi mengulang approval | 9,99%/10% dapat lanjut. 10,01% perlu approval. 403 untuk Sales/Head Admin, 409 versi basi, price lock, alasan dan status sesuai. | PASS · [Suite baru](evidence/regression.json) · [Browser](evidence/13-owner-discount-approved.png) |
| Smoke HTTP | Lead aktif ditolak sebelum dibatalkan, baseline tetap | 14 kelompok lulus. 409, CANCEL dan DELETE_UNUSED ditemukan di audit. | PASS · [Smoke JSON](evidence/http-smoke.json) |
| Persistensi lokal | Checkpoint tetap ada setelah stop/start dan login baru | Checkpoint terbaca. Browser juga mempertahankan pembayaran setelah refresh/login ulang. | PASS · [Restart JSON](evidence/http-restart.json) |
| Isolasi tenant | Autentikasi ulang saat pindah dan record hanya terlihat di database sendiri | Sesi lama ditolak, dua tenant masing-masing 404 terhadap pelanggan tenant lawan, record tenant asal tetap terbaca. | PASS · [HTTP tenant JSON](evidence/http-tenant.json) |
| Batch posting, retry dan pencocokan saldo | Stock move/jurnal dan payment unik untuk skenario uji | Browser memutus respons vendor dan mengulang dengan idempotency key yang sama. Final DB memiliki empat pembayaran yang diharapkan, 12 jurnal unik seimbang, saldo 1040 nol, dan valuasi fisik sama dengan 1030. | PASS · [Database Chrome](evidence/browser-database-verification.json) |
| Isolasi fixture dan backup | Baseline sesuai dan hash kerja tetap | 15 SKU, 616 unit, 15 daftar harga vendor, D/K Rp33.714.000 pada jurnal pembuka. Empat hash SQLite dan satu registri cocok. Validator menolak root kerja. | PASS · [Baseline](evidence/demo-baseline.json) · [Hash count](evidence/regression.json) |
| Lint | Linter repo dapat berjalan noninteraktif | `npm run lint` meminta konfigurasi ESLint pertama kali. Tidak ada hasil lint otomatis. | NOT TESTED |
| Verifikasi deployment | Release dan enam role pada staging publik | HTTPS 200 untuk login, 401 sesi anonim. Endpoint versi 404. Pemeriksaan berautentikasi memerlukan staging dan kredensial. | BLOCKED · [Kesiapan](DEPLOYMENT_READINESS.md) |

## Tangkapan layar

Semua berkas berasal dari Chrome lokal. [Beranda](evidence/01-owner-home.png), [App Switcher](evidence/02-owner-switcher.png), [mobile](evidence/03-owner-mobile.png), [GL ditolak](evidence/04-cashier-gl-denied.png), [dashboard baseline](evidence/05-dashboard-seed.png), [rekonsiliasi](evidence/06-reconciliation.png), [jurnal pembukaan](evidence/07-source-journal.png), [jurnal faktur](evidence/07b-sales-invoice-journal.png), [reservasi](evidence/08-reservation.png), [delivery/backorder](evidence/09-delivery-backorder.png), [invoice quantity](evidence/10-invoice-quantity-validation.png), [pembayaran customer](evidence/11-customer-payment-refresh.png), [approval pending](evidence/12-owner-discount-pending.png), [approved](evidence/13-owner-discount-approved.png), [price lock](evidence/14-confirmed-price-lock.png), [RFQ/pricelist](evidence/15-vendor-pricelist-rfq.png), [receipt QC](evidence/16-receipt-qc.png), [three-way bill](evidence/17-three-way-vendor-bill.png), [pembayaran vendor](evidence/18-vendor-payment-refresh.png), [pemulihan timeout](evidence/18a-vendor-payment-timeout-recovery.png), [retur](evidence/19-return-credit-note.png), [keranjang POS](evidence/20-pos-basket.png), [struk](evidence/21-pos-receipt.png), dan [tutup sesi](evidence/22-pos-close.png).

## Cakupan

Laporan menyatakan hasil untuk fixture dan alur yang dieksekusi. Skenario concurrency, validasi hak dan pemulihan mencakup probe terdaftar di suite, termasuk req key yang sama dengan payload berbeda. Pengujian stres, load, dan penerimaan publik tersendiri masih terbuka. [Panduan pengulangan](DEMO_WALKTHROUGH.md)
