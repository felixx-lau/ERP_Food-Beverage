# Alur demo ERP Kelompok 03

Tanggal pemeriksaan 7 November 2026. Alur mengikuti skrip single presenter Rasa Aruna Kitchen yang diberikan pengguna.

## Navigasi sesuai modul

Tombol alur tambahan Proses backorder, Pengiriman selesai, dan Buat invoice pada Sales Order telah dihapus sesuai permintaan. Pemrosesan dilakukan melalui menu modul masing-masing. Dokumen terkait dan riwayat tetap tersedia pada bagian aktivitas.

- Sales menangani quotation dan konfirmasi pesanan.
- Inventory menangani pengiriman, backorder, dan penerimaan barang.
- Invoicing menangani invoice pelanggan serta vendor bill.
- Finance menangani pembayaran, jurnal, dan Chart of Accounts.

Tindakan dokumen tetap ditampilkan di bagian atas. Daftar pengiriman dan penerimaan dapat dicari berdasarkan nomor SO atau PO. Form pengiriman tetap mendukung jumlah sebagian dan menampilkan sisa backorder. Status POSTED, Register Payment, nominal tagihan, dan ringkasan penutupan POS tetap diperbaiki.

## Penjualan dalam skrip

1. Sales → Pesanan Penjualan. Buat atau pilih quotation RICE-CHICK-S sebanyak 8 unit dengan harga Rp48.000 tanpa diskon. Catat nomor SO.
2. Konfirmasi quotation. Reservasi stok dan Delivery Order dibuat otomatis.
3. Inventory → Pengiriman. Cari nomor SO tersebut pada pencarian daftar, pilih Detail pada dokumen DRAFT atau CONFIRMED yang sesuai.
4. Klik Validasi pengiriman. Ubah Dikirim menjadi 5, periksa sisa backorder 3, lalu validasi.
5. Pengiriman menjadi DONE. Backorder dibuat sebagai dokumen tersendiri untuk 3 unit.
6. Invoicing → Faktur Tagihan → Buat Invoice Baru. Pilih nomor SO yang sama; kuantitas yang dapat ditagih otomatis 5. Simpan draft.
7. Periksa net Rp240.000, PBJT Rp24.000, gross Rp264.000. Posting invoice lalu Register Payment.
8. Pembayaran Rp100.000 menghasilkan outstanding Rp164.000. Untuk pelunasan penuh, gunakan nominal outstanding.

Quotation DRAFT belum memiliki pengiriman. Dokumen DONE tidak dapat divalidasi lagi; gunakan backorder untuk mengirim sisanya. Stok dan headroom kredit harus mencukupi.

## Pembelian dalam skrip

1. Purchase → Pesanan Beli Baru. Pilih V03 PT Kopi Minum Prima, COF-LATT-HOT, jumlah 10, harga Rp12.000.
2. Simpan dan Konfirmasi. Catat nomor PO.
3. Inventory → Penerimaan Barang. Cari nomor PO, buka Detail pada receipt yang sesuai.
4. Validasi penerimaan dengan Diterima 8, Ditolak 2, dan alasan penolakan.
5. Invoicing → Tagihan Vendor → Buat tagihan. Pilih PO yang sama, tagih accepted 8 unit dengan nilai Rp96.000. Posting.
6. Bayar tagihan vendor. Bill dan outstanding dipilih otomatis melalui tautan pembayaran. Pembayaran penuh menghasilkan outstanding Rp0.

## Akun baru dan jurnal debit kredit

Owner dan Finance dapat menambah akun melalui Data Master → Chart of Accounts → Tambah Chart of Accounts. Isi kode unik, nama, dan tipe akun yang sesuai. Saldo awal akun baru nol dan saldo berjalan diperbarui dari jurnal.

Keuangan → Buku Besar dan Jurnal → Jurnal umum menyediakan form debit kredit. Akun baru juga dapat dibuat melalui tombol Akun baru pada form tersebut, kemudian langsung tersedia dalam pilihan akun. Isian jurnal yang sedang dikerjakan tetap dipertahankan saat membuat akun.

Contoh pembayaran listrik Rp250.000: akun Beban Listrik bertipe EXPENSE di sisi debit Rp250.000, akun 1010 Kas dan Bank di sisi kredit Rp250.000. Isi keterangan transaksi, periksa selisih Rp0 dan status Seimbang, lalu Posting jurnal. Jurnal baru langsung dipilih pada daftar. Baris dapat ditambah atau dihapus; setiap baris harus memakai satu sisi dan total debit wajib sama dengan kredit.

Akun piutang, utang, persediaan, GRNI, dan PBJT tetap diproses melalui transaksi sumber agar subledger dan stok konsisten. Pengujian handler pada salinan terisolasi membuktikan create akun EXPENSE → daftar akun → posting debit/kredit Rp250.000 → saldo beban naik Rp250.000 dan kas turun Rp250.000, retry tidak membuat jurnal ganda, dan jurnal tidak seimbang ditolak.

## Cara menjalankan POS dalam skrip

1. Buka POS dan pilih sesi OPEN atau klik Buka Sesi Kasir Baru.
2. Tambahkan COF-LATT-ICE dua kali dan COOKIE-CHO-1 sekali. Harga master yang diperiksa menghasilkan subtotal Rp86.000, PBJT Rp8.600, dan total Rp94.600.
3. Pilih QRIS dan klik Bayar Sekarang. Struk PAID menampilkan jumlah dan pajak.
4. Tutup struk. Periksa Inventory CAFE-JKT dan jurnal dengan source POS yang sama.
5. Tutup Sesi, masukkan kas fisik aktual, lalu konfirmasi. QRIS tidak menambah uang tunai di laci. Jika modal awal Rp500.000 dan semua penjualan memakai QRIS, kas fisik Rp500.000 menghasilkan selisih Rp0.
6. Ringkasan sesi tampil setelah penutupan. Sesi yang sudah CLOSED dapat dipilih kembali melalui pemilih sesi. Buka Dashboard untuk melihat perubahan operasional dan rekonsiliasi.

## Hasil pemeriksaan

Pengujian browser dilakukan melalui Chrome pada salinan aplikasi dan database di /tmp/erp-video-demo, port 3108. Source aplikasi utama diperbarui; transaksi uji tidak dimasukkan ke database aplikasi utama. Tidak dilakukan reset atau seed pada database pengguna.

| Alur | Hasil browser dan pembacaan database |
| --- | --- |
| Pengiriman sebagian SO S00009 | WH/OUT/0008 DONE, dikirim 5 dari 8; WH/OUT/0009 backorder 3 |
| Invoice | INV/2026/0007, net Rp240.000, PBJT Rp24.000, gross Rp264.000, POSTED |
| Pembayaran pelanggan | Dibayar Rp100.000, outstanding Rp164.000; saldo juga tampil benar pada halaman pembayaran |
| Pembelian | P00007 dikonfirmasi, COF-LATT-HOT 10 × Rp12.000 |
| Penerimaan | WH/IN/0007 DONE, accepted 8 dan rejected 2 |
| Tagihan dan pembayaran vendor | BILL/2026/0007 Rp96.000, PAID, outstanding Rp0 |
| POS | POS/2026/0001 QRIS PAID, dua Latte Iced dan satu Cookie, total Rp94.600; struk tampil |
| Penutupan sesi | POS01 CLOSED, 1 transaksi, total Rp94.600; pemilih sesi dan ringkasan berhasil diperiksa. POS02 juga ditutup saat memeriksa ringkasan langsung dan selisih kas |
| Accounting | JE/2026/0008 bersumber POS/2026/0001; debit dan kredit seluruh jurnal sama Rp34.649.600 |
| Dashboard | Persediaan MATCHED Rp12.121.000; AR Rp1.664.000 dan AP Rp1.000.000 cocok dengan ledger; nilai termasuk saldo awal perusahaan |

Seluruh suite test_phase2_3, test_phase4, test_phase5, test_phase6, test_phase7, test_phase8, test_charts, test_crud, test_pdf_cases, test_integrity, audit probes, typecheck, dan production build lulus pada salinan terisolasi. Runner memverifikasi hash database dan registry asli tetap sama. Ringkasan tersimpan pada test-results.json; pembacaan transaksi browser pada browser-database-readback.json.

Perintah verifikasi:

```sh
python3 scripts/verify_isolated.py --suites test_phase2_3 test_phase4 test_phase5 test_phase6 test_phase7 test_phase8 test_charts test_crud test_pdf_cases test_integrity --audit-probes --build
```

Pemeriksaan ini membuktikan alur utama skrip pada desktop dan data uji tersebut. Ini tidak mencakup semua kombinasi perangkat, role, maupun deployment publik. Untuk rekaman ulang, buat dokumen baru agar nomor serta stok hasil uji sebelumnya tidak dianggap kondisi awal.
