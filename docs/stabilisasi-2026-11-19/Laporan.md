# Stabilisasi ERP Rasa Aruna · 19 November 2026

A2, A1 dan A6 lulus pengujian transaksi serta browser pada database terisolasi. A3 selesai sampai investigasi dan dry run empat perusahaan. Pemilik proyek menunda koreksi data. Pada A4, build produksi dan persistensi lokal sudah diuji. Pemilik proyek mengonfirmasi bahwa staging publik belum tersedia. Phase B menunggu kelulusan Phase A.

Pekerjaan berangkat dari working tree lokal `8d4d60c` beserta perubahan pengguna yang sudah ada. Tiga dokumen audit tetap menjadi baseline historis. [Laporan audit](../../../Audit%20Rasa%20Aruna%202026-11-19/Laporan%20Audit.md) · [Matriks PDF](../../../Audit%20Rasa%20Aruna%202026-11-19/Matriks%20PDF.md) · [Register baseline](../../../Audit%20Rasa%20Aruna%202026-11-19/Register%20Pengujian.md)

## Perubahan dan keputusan per kelompok

| Kelompok | File utama dan perilaku yang berubah | Bukti, risiko tersisa dan tindak lanjut |
|---|---|---|
| A2 · Pembayaran vendor | `VendorPaymentForm.tsx`, halaman payments, route payments dan `test_integrity.ts`. Satu konfirmasi mendapat satu kunci. Form menyimpan permintaan yang belum mendapat respons menurut perusahaan dan pengguna di tab tersebut. Setelah berhasil, pembayaran baru dengan nominal sama mendapat kunci baru. API menolak pembayaran vendor tanpa kunci (400) dan pemakaian ulang kunci dengan isi berbeda (409). | Finance membayar tagihan Rp96.000 dua kali masing-masing Rp30.000. Saldo menjadi Rp66.000 lalu Rp36.000. Dua pembayaran dan dua jurnal, Bank dan A/P turun Rp60.000. Retry paralel menghasilkan satu posting untuk satu kunci. Pada pelunasan Rp36.000, respons sengaja diputus sesudah server menyimpan transaksi. Setelah refresh, form menunjukkan nomor transaksi, tagihan lunas dan total tetap tiga pembayaran serta tiga jurnal. Pemulihan dari form memakai tab yang sama. Integrasi lain wajib menyimpan kunci sampai menerima hasil. [Uji Finance](bukti/vendor-browser.json) · [Layar pemulihan](bukti/vendor-recovery.png) |
| A1 · Hak Owner | `accessPolicy.ts`, `auth.ts`, navigasi, halaman delapan modul, route approval, `DocumentControls.tsx` dan `salesEngine.ts`. Owner mendapat akses baca dan persetujuan diskon. Head Admin tetap mengelola pengguna dan master. | Owner membuka delapan pintasan di browser dan menyetujui diskon 20%. Audit mencatat Maya Prasetyo. Finance dan Kasir diuji dengan akun masing-masing. Owner ditolak saat mengelola pengguna atau membuat master customer. Kasir ditolak membuka GL. Pertahankan uji izin saat menambah modul. [Bukti Owner](bukti/owner-browser.json) · [Beranda](bukti/owner-home.png) · [Approval](bukti/owner-approved.png) |
| A6 · SO/PO terkonfirmasi | `salesEngine.ts`, `purchaseEngine.ts`, `documentWorkflow.ts`, `DocumentControls.tsx` dan `test_integrity.ts`. Sales dapat menyiapkan DO dari reservasi yang sudah dimiliki baris SO. Procurement dapat menyiapkan receipt dari sisa PO. | S00006 menghasilkan satu draft untuk 6 unit dan P00006 satu draft untuk 10 unit. Percobaan paralel mempertahankan stok fisik, reservasi, mutasi dan jurnal. Setelah Gudang memvalidasi pengiriman parsial dan penerimaan parsial, retry mempertahankan backorder yang sudah dibuat. Data impor dengan alokasi yang tidak cocok memerlukan pemeriksaan Gudang. [Bukti browser](bukti/workflow-browser.json) · [Uji transaksi](bukti/test_integrity.log) |
| A3 · Inventory dan GL | `reconcile_inventory.py`, `dashboardEngine.ts`, halaman reports dan `InventoryReconciliation.tsx`. Laporan membandingkan stok fisik, saldo tersimpan dan akun 1030 dari jurnal posted, serta membuka jurnal sumber. | Dua perusahaan cocok dan dua membutuhkan dokumen pembukaan. Koreksi ditunda. Simulasi +1 unit tersedia sebagai operasi baca. Prosedur untuk menyiapkan dan mengotorisasi usulan koreksi dicatat terpisah. Rincian rekonsiliasi tersedia pada laporan privat di workspace. |
| A4 · Audit, PDF dan deployment | `atomic.ts`, `audit.ts`, `apiResult.ts`, engine Sales/Accounting/CRM, runner PDF, `verify_isolated.py`, `smoke_http.py`, `package.json`, dashboard dan halaman jurnal. Penolakan bisnis yang diaudit dicatat sesudah rollback pada database perusahaan yang sama. Runner memakai snapshot SQLite untuk setiap perusahaan dan probe yang masih dipelihara. | T04, T08, T10, T20 dan T24 menyimpan pelaku, dokumen, waktu dan alasan. T12 mencoba validasi DO oleh Warehouse. T27 memeriksa QRIS/Bank. Owner mengikuti dashboard → rekonsiliasi → nomor jurnal dengan simulasi +1. Staging publik menjadi pemeriksaan rilis berikutnya. [Observasi T01–T32](bukti/pdf-cases-results.json) · [Layar simulasi](bukti/a4-simulasi.png) · [Jurnal tujuan](bukti/a4-jurnal.png) |

## Hasil otomatis dan penerimaan PDF

| Jenis bukti | Hasil | Batas interpretasi |
|---|---|---|
| Unit, integrasi dan regresi | 21 suite, 248 hasil PASS yang dilaporkan runner, nol kegagalan. TypeScript dan Next.js production build berhasil. | Satu suite dapat memeriksa beberapa aturan dalam satu hasil PASS. Angka ini mencakup 32 kasus PDF. [Hasil runner](bukti/results.json) · [Build](bukti/build.log) |
| T01–T32 | 32/32 lulus dengan fixture baru per kasus. Observasi berisi expected/actual, serta alasan dan dokumen pada pemeriksaan penolakan terkait. | Bukti layanan dan handler. Pemeriksaan layar untuk area yang diperbaiki dicatat terpisah. [Register otomatis](bukti/pdf-cases-results.json) |
| Browser | Form pembayaran Finance, delapan pintasan dan approval Owner, aksi Sales/Procurement, serta penelusuran posting S16 berhasil. | Pengujian Chrome desktop dengan akun seed. Bukti mobile dan studi pengguna pemula belum diperbarui pada tahap ini. [Pembayaran](bukti/vendor-browser.json) · [Owner](bukti/owner-browser.json) · [S16 dan A6](bukti/workflow-browser.json) |
| HTTP dan restart | 14 kelompok lulus pada server build lokal. Setelah proses dihentikan dan dijalankan lagi, login baru membaca record checkpoint yang sama. | Uji lokal menggunakan disk persisten pada salinan. URL publik, HTTPS, volume dan restart host staging menunggu tersedianya lingkungan tersebut. [HTTP](bukti/http-smoke-results.json) · [Restart](bukti/http-restart-results.json) |

Perubahan hash database default di antara sesi kerja diperiksa melalui perbandingan isi 54 tabel dengan snapshot awal. Dua baris tambahan adalah LOGOUT Warehouse dan LOGIN Sales. Seluruh tabel bisnis cocok. Hash tiga database perusahaan lainnya serta registri sama dengan awal pekerjaan. Setiap run akhir juga memeriksa hash sebelum dan sesudah. [Pemeriksaan database](bukti/pemeriksaan-database.json)

## Menjalankan ulang dan rollback

Dari root aplikasi, jalankan `npm test -- --build`. Runner mencetak direktori sementara setelah selesai. Untuk bukti HTTP, jalankan build dari direktori sementara itu dengan database di bawah `prisma/` salinan dan secret khusus pengujian. Gunakan dua terminal pada direktori sementara yang sama.

```sh
# Terminal 1, di dalam direktori sementara hasil runner
export DATABASE_URL="file:$PWD/prisma/erp.db"
export JWT_SECRET="isolated-verification-secret-not-for-production-2026"
node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3107
```

```sh
# Terminal 2, di direktori sementara yang sama
python3 scripts/smoke_http.py --temporary-project . --host 127.0.0.1
# Hentikan proses Terminal 1 dan jalankan kembali perintah start dengan environment yang sama.
python3 scripts/smoke_http.py --temporary-project . --host 127.0.0.1 --verify-restart
```

Patch mencakup delta source, skrip, konfigurasi pengujian dan README dari snapshot pra-A2. Pemeriksaan `git apply --check --reverse docs/stabilisasi-2026-11-19/perubahan.patch` berhasil. Jika rollback kode diperlukan, ulangi pemeriksaan pada checkout tujuan sebelum menerapkan patch terbalik. Transaksi yang sudah diposting mempunyai lifecycle reversal tersendiri. [Daftar berkas lengkap](Berkas.md) · [Patch rollback](perubahan.patch)

Sebelum Phase B, tindak lanjut A4 adalah pengujian pada URL staging dengan database khusus uji dan volume persisten. Status A3 mengikuti keputusan pemilik proyek untuk menunda koreksi.
