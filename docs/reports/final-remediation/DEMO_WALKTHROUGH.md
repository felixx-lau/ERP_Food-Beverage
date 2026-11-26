# Demo dan pengujian ulang

## Persiapan lokal

Dari root repo jalankan:

```sh
python3 scripts/prepare_grading_demo.py
```

Masuk ke folder `.local/rasa-aruna-grading-*` yang dicetak. Folder tersebut memiliki build source, database, registri tenant, env, dan kredensialnya sendiri. Password acak ada di `demo-credentials.txt` dalam folder demo. Enam username adalah `owner`, `sales`, `procurement`, `warehouse`, `finance`, serta `cashier`, semuanya memakai domain `@rasaaruna.com`. Akun tambahan Head Admin memakai `admin@rasaaruna.com`.

```sh
npm run dev -- --hostname 127.0.0.1 --port 3110
```

Buka `http://127.0.0.1:3110/login`. Gunakan konteks browser terpisah per role atau logout sebelum berganti akun. Untuk latihan berikutnya buat folder demo baru. Validasi baseline yang belum dipakai dengan `python3 scripts/prepare_grading_demo.py --validate <folder-demo>`.

## Urutan presentasi

1. Owner membuka Beranda dan dialog Daftar modul. Tunjukkan delapan pintasan, identitas perusahaan, dan Dashboard Operasional. Baseline adalah 616 unit dan Rp12.214.000.
2. Sales membuka peluang Klinik Harmoni dan membuat Quotation 8 × RICE-CHICK-S. Konfirmasi dari WH-JKT dan lihat reservasi. Gudang mengirim 5 unit, sehingga backorder 3 dan stok tersedia WH 26.
3. Finance membuat invoice qty 5, melihat penolakan untuk qty 8, dan memposting Rp264.000. Bayar Rp100.000, rekam sisa Rp164.000 setelah refresh/login ulang, lalu lunasi.
4. Procurement membuat RFQ 10 × COF-LATT-HOT untuk V03 pada Rp12.000. Gudang mencatat 8 diterima dan 2 ditolak karena kemasan rusak. Finance posting bill Rp96.000 dan bayar Rp30.000. Rekam sisa Rp66.000 sebelum melunasi.
5. Pada draft terpisah, Sales membuat 2 nasi ayam dengan diskon 20%. Owner meninjau margin 32,29% dan menyimpan alasan keputusan. Sales mengonfirmasi dan memperlihatkan price lock.
6. Gudang membuat retur untuk 1 unit dari invoice posted dan menyelesaikan inspeksi. Finance memproses Credit Note Rp52.800, lalu telusuri jurnal dan mutasi.
7. Cashier membuka sesi CAFE-JKT dan menjual 2 Latte Hot serta 1 Cookie Single. Pilih QRIS untuk pencatatan metode pembayaran Rp88.000, tunjukkan struk, tutup sesi dengan kas fisik Rp0. 
8. Owner membuka Laporan Keuangan, simulasikan +1 unit, lalu buka jurnal sumber. Peragaan menampilkan selisih tanpa menulis stok atau jurnal.

## Regresi dan bukti

```sh
ERP_BUILD_REVISION="$(git rev-parse --short HEAD)-dirty" npm test -- --build
```

Runner mencetak folder sementara melalui baris `Evidence:`. Sebelum smoke atau browser, muat seed dari **dalam** folder tersebut. Gunakan pemeriksaan path sebelum mengaktifkan seeder.

```sh
case "$PWD" in
  */rasa-aruna-verification-*) ;;
  *) printf '%s\n' 'Jalankan di folder verifikasi terisolasi'; exit 1 ;;
esac
export DATABASE_URL="file:$PWD/prisma/erp.db"
export JWT_SECRET="isolated-verification-secret-not-for-production-2026"
ALLOW_BASELINE_REPLACE=I_UNDERSTAND_THIS_REPLACES_DATA node --import tsx scripts/seed.ts
node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3107
```

Dari terminal kedua di folder salinan, jalankan `python3 scripts/smoke_http.py --temporary-project . --host 127.0.0.1`. Restart server dengan database yang sama, ulangi dengan `--verify-restart`, kemudian jalankan `--verify-tenant-isolation`. Muat ulang fixture salinan sebelum browser. Dari root repo jalankan `node scripts/verify_grading_browser.mjs "<folder Evidence>"`. Script menggunakan Playwright. Tetapkan `ERP_PLAYWRIGHT_MODULE` ke path modul yang terpasang dan `ERP_CHROME_EXECUTABLE` ke Chrome lokal bila menggunakan runtime luar repo.

Untuk setiap T-xx, `scripts/test_pdf_cases.ts` membuat fixture independen dan menyiapkan prasyarat yang memang berlaku pada kasus. Lihat [laporan tes](TEST_EXECUTION_REPORT.md).
