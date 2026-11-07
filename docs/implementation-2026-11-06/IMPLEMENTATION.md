# Hasil implementasi ERP dinamis

Tanggal: 6 November 2026. Implementasi dilakukan setelah pengguna menyetujui audit dan rencana. Ini memperbarui temuan pada [audit awal](../master-audit-2026-11-06/AUDIT.md); laporan awal tetap disimpan sebagai bukti kondisi sebelum perbaikan.

## Hasil utama

Website sekarang mempunyai form dan API database-backed untuk pelanggan, vendor, produk/varian SKU, kategori, satuan, lokasi, akun, harga vendor, serta lead. Master menggunakan pola list, pencarian/filter/sort/paginasi, detail/relasi/riwayat, tambah, edit, arsip, pemulihan, dan hapus aman. Hak aksi berasal dari server. Record yang digunakan transaksi tidak dapat dihapus permanen. Akun sistem dan lokasi inti dilindungi.

Dokumen transaksi mempunyai tindakan normal sesuai tahapnya: edit draft, konfirmasi/approval, validasi delivery/QC receipt, posting, pembayaran pelanggan/vendor, pembatalan yang memenuhi syarat, reversal, retur/credit note, dan refund POS. Dokumen yang telah diposting tidak diedit atau dihapus melalui CRUD master.

Build produksi dan typecheck berhasil. Legacy 128 assertion, CRUD 8 kelompok, T01–T32 32 kasus, integritas 10 kelompok, dan probe audit A 14 kasus semuanya lolos; lihat [laporan uji](TEST_REPORT.md). Pengujian layanan/API dan HTTP berhasil. **Penerimaan visual/interaksi JavaScript melalui browser belum terverifikasi**: browser access host tidak tersedia dan akses aplikasi Chrome mengalami timeout. **Deployment publik dan ketahanan storage hosting belum terverifikasi.** Hasil ini bukan sertifikasi bahwa seluruh persyaratan penyerahan tugas sudah selesai.

## Arsitektur dan integritas

Next.js/React/TypeScript, Prisma, SQLite, enam role, route aplikasi, dan domain engine yang ada dipertahankan. Schema diperluas secara aditif, tanpa reset perusahaan. Penambahan mencakup data komunikasi kontak, metadata master/arsip/versi, kategori/satuan/harga vendor, alokasi reservasi per SO line/lokasi, sequence, request identity, session version, dan referensi reversal/refund.

Mutasi domain menggunakan transaksi atomik. SQLite writer lock diperoleh sebelum pembacaan entitlement/status; engine bertingkat berbagi transaksi yang sama. Sequence, stok, jurnal, saldo, dan audit ikut dalam transaksi. Request identity mengikat actor, operasi, key, dan fingerprint payload; retry dengan key sama mengembalikan hasil awal, sedangkan payload berbeda ditolak. Form utama mencegah submit bersamaan. Edit master dan draft utama menggunakan versi untuk menolak stale write.

Validasi mencakup SKU eksplisit, duplicate line, kuantitas bulat positif, uang Rupiah bulat dalam rentang, diskon 0–20%, customer/vendor aktif, sumber dokumen, kuantitas kumulatif, dan lifecycle. Diskon di atas 10% membutuhkan Owner. Biaya standar/satuan SKU dengan stok atau riwayat dikunci untuk mempertahankan valuasi historis; perubahan biaya stok yang sudah ada membutuhkan rancangan revaluasi tersendiri.

JWT membutuhkan secret produksi unik minimal 32 karakter dan algoritma HS256. Pengguna aktif, role, session version, dan perusahaan diperiksa kembali dari database. Secret lokal lama yang dikenal publik diganti tanpa mencetak nilainya; secret tersimpan di `.env.local` yang diabaikan Git, sedangkan `.env` terlacak tidak lagi menyimpan signing secret. Role switch tanpa password, public demo seed, reset operasional, fallback ke database perusahaan lain, dan penghapusan database perusahaan dinonaktifkan. Owner dapat mengelola akun, role/status/password; pembaruan mencabut sesi lama dan Owner aktif terakhir dilindungi. Password/hash tidak masuk respons atau audit.

Stock adjustment menghasilkan movement dengan alasan, actor, dan jurnal valuasi. Delivery/POS/transfer melindungi reserved stock. Receipt hanya memasukkan accepted quantity dan menyiapkan sisa penerimaan; rejected quantity tidak menjadi hak billing. Vendor Bill mencocokkan harga PO dan accepted quantity; selisih terhadap standard cost diposting ke purchase variance. Payment, return, refund dan reversal menjaga sumber asli serta keseimbangan jurnal. Dashboard tidak membuat jurnal penyeimbang otomatis.

## Matriks CRUD saat ini

`WORKING` di tabel ini berarti server/API telah dieksekusi dan form website tersedia dalam build. Verifikasi interaksi browser tetap **NOT VERIFIED** untuk semua form.

| Modul | Create | Read | Update | Delete/Archive | Persistence | Status |
|---|---|---|---|---|---|---|
| Pelanggan | WORKING | WORKING | WORKING; limit kredit Owner | WORKING untuk unused; arsip/pulihkan untuk terkait | WORKING | WORKING |
| Vendor | WORKING | WORKING | WORKING | WORKING dengan dependency guard | WORKING | WORKING |
| Produk dan varian | WORKING; stok awal nol | WORKING | WORKING; biaya/satuan historis RESTRICTED BY BUSINESS RULE | WORKING untuk unused; arsip/pulihkan | WORKING | WORKING |
| Kategori dan satuan | WORKING | WORKING | WORKING | WORKING dengan dependency guard | WORKING | WORKING |
| Gudang/lokasi | WORKING | WORKING | WORKING | RESTRICTED BY BUSINESS RULE untuk lokasi inti/terkait | WORKING | WORKING |
| Chart of Accounts | WORKING | WORKING | WORKING untuk akun yang diizinkan | RESTRICTED BY BUSINESS RULE untuk akun sistem/terkait | WORKING | WORKING |
| Harga vendor | WORKING | WORKING | WORKING | WORKING; arsip/pulihkan | WORKING | WORKING |
| Lead/opportunity | WORKING | WORKING | WORKING; validasi tahap/nilai | WORKING untuk unused; arsip/pulihkan | WORKING | WORKING |
| Quotation/SO, RFQ/PO | WORKING | WORKING | WORKING pada draft | RESTRICTED BY BUSINESS RULE; cancel sesuai pemenuhan/reservasi | WORKING | WORKING |
| Delivery/receipt/transfer | WORKING dari sumber/form | WORKING | WORKING pada tahap yang sesuai | RESTRICTED BY BUSINESS RULE; riwayat fisik dipertahankan | WORKING | WORKING |
| Invoice/Vendor Bill | WORKING dari sumber valid | WORKING | WORKING pada draft | RESTRICTED BY BUSINESS RULE; cancel draft/reversal posted | WORKING | WORKING |
| Pembayaran pelanggan/vendor | WORKING, parsial/penuh | WORKING | RESTRICTED BY BUSINESS RULE setelah posting | RESTRICTED BY BUSINESS RULE; reversal dengan alasan | WORKING | WORKING |
| Retur/Credit Note | WORKING; Warehouse QC, Finance proses | WORKING | RESTRICTED BY BUSINESS RULE setelah selesai | RESTRICTED BY BUSINESS RULE | WORKING | WORKING |
| POS/sesi/struk/refund | WORKING | WORKING; sesi kasir sendiri | WORKING untuk keranjang, RESTRICTED BY BUSINESS RULE setelah checkout | RESTRICTED BY BUSINESS RULE; full refund sekali | WORKING | WORKING |
| Pengguna | WORKING untuk Owner | WORKING untuk Owner | WORKING; sesi lama dicabut | RESTRICTED BY BUSINESS RULE; nonaktifkan akun | WORKING | WORKING |
| Perusahaan | WORKING untuk Owner | WORKING | WORKING untuk Owner | RESTRICTED BY BUSINESS RULE; tidak ada delete database | WORKING pada disk lokal | WORKING; hosting NOT VERIFIED |

## Pengujian dan bukti

Perintah pengujian utama adalah `npm test`. `scripts/verify_isolated.py` menyalin proyek/database ke temporary directory, menggunakan package terpasang, menjalankan suite, memeriksa kegagalan assertion, dan memverifikasi hash database/registry asli tetap sama selama pengujian. Mutating test baru menolak target di luar proyek sementara. `--build` menambahkan build produksi pada salinan tersebut.

Lihat [ringkasan eksekusi](evidence/results.json), [T01–T32 expected/actual](evidence/pdf-cases-results.json), [CRUD](evidence/test_crud.log), [integritas](evidence/test_integrity.log), [probe audit](evidence/audit-probes.json), dan [build](evidence/build.log). T01 membuktikan konfigurasi delapan aplikasi/token; T02 benar-benar memanggil handler GL dengan akun Cashier. T03–T32 menggunakan baseline baru per kasus, termasuk setup prasyarat delivery/receipt/invoice yang relevan. Kasus stok menggunakan pelanggan dengan headroom mencukupi agar penolakan benar-benar melewati guard stok.

Pengujian HTTP tambahan dijalankan terhadap `next start` hasil build pada port 3107 dengan SQLite di temporary directory. Seluruh sembilan master melewati create, retry, read, edit, stale conflict, archive, restore, delete; login/anonymous denial, role denial dan draft SO edit/cancel juga diuji. [Hasil HTTP](evidence/http-smoke-results.json). Cookie secure produksi dikirim eksplisit hanya ke loopback pada harness; ini bukan bukti perilaku cookie browser/HTTPS. Setelah proses server dihentikan dan dimulai ulang, login baru tetap menemukan record checkpoint yang disimpan sebelumnya. [Hasil restart](evidence/http-restart-results.json).

Kasus integritas tambahan meliputi transaksi bersamaan, rollback, fingerprint idempotensi, cancellation/release reservasi, PO price variance, vendor payment, payment/invoice/bill reversal, refund POS/idempotensi, ringkasan sesi tertutup yang tetap, Log Notes/sumber dokumen, manual journal terbatas, pencabutan sesi pengguna, perlindungan Owner terakhir, dan isolasi snapshot perusahaan baru.

## Migrasi dan kondisi data lama

Migrasi `20261106_dynamic_erp` diuji pada salinan keempat database sebelum diterapkan. Backup sebelum migrasi tersedia di `backups/20261106T125057432425Z/manifest.json`. Pemeriksaan ulang [preservasi data](database-preservation.json) membandingkan 33 tabel asli per database, pada kolom asli, terhadap backup. Seluruh baris lama tetap tersimpan tanpa perubahan; database default memiliki tambahan dua event LOGIN. Keempat database: `quick_check=ok`, tanpa pelanggaran foreign key dan tanpa stok negatif/over-reserved.

**Temuan data lama yang masih memerlukan rekonsiliasi manusia:** PT Kuliner Nusantara dan PT Resto Nusantara Baru masing-masing mempunyai persediaan bernilai Rp225.000 tanpa jurnal persediaan awal. Ini sudah ada sebelum implementasi. Nilai/riwayat bisnis dipertahankan dan selisih ditampilkan; tidak dibuat jurnal pembuka fiktif. Saldo awal yang benar dan sumber buktinya perlu ditentukan Owner/Finance sebelum perusahaan tersebut digunakan untuk pelaporan keuangan. Perusahaan default dan PT Morie Matcha mempunyai valuasi persediaan dan ledger Rp12.214.000 yang cocok pada pemeriksaan ini.

## Batas penerimaan dan pekerjaan berikutnya

1. Uji browser desktop/mobile, keyboard/fokus, refresh/logout/browser restart, struk cetak, dan alur normal seluruh enam role masih NOT VERIFIED karena koneksi browser gagal. Build/typecheck dan HTTP tidak menggantikan pemeriksaan ini.
2. Hosting publik belum disiapkan/dibuktikan. SQLite harus memakai host tunggal dengan disk persisten; fallback salinan `/tmp` serverless telah dihapus agar CRUD tidak diam-diam hilang. Backup/restore operasional dan HTTPS perlu diterima pada host tujuan.
3. Rekonsiliasi saldo awal dua perusahaan lama membutuhkan dokumen bisnis yang sah. Implementasi tidak menebak koreksinya.
4. Optional F-23 loyalitas, import/export massal, image upload, reorder forecasting, notification center, dan pencarian global record belum diimplementasikan. Pencarian navigasi, low-stock chart, filter dashboard dan struk POS sudah tersedia; fitur tambahan bukan syarat untuk menyatakan master CRUD bekerja.
5. Matriks F/SR/S terbaru ada di [COMPLIANCE.md](COMPLIANCE.md). Rekomendasi nilai bisnis, kompleksitas, dependensi dan risiko seluruh 15 fitur tambahan tetap tersedia di [rencana yang disetujui](../master-audit-2026-11-06/IMPLEMENTATION_PLAN.md#recommendations-value-effort-dependencies-and-risks). Tahap selanjutnya adalah acceptance browser/staging dan rekonsiliasi; prioritas P3 menunggu hasil penerimaan itu.

Untuk mencoba hasil kode, jalankan/refresh server pengembang dan login ulang. Akun baseline menggunakan `Password123!`; akun bisnis yang sudah diubah tidak direset. Jangan menggunakan suite seed langsung pada database operasional.
