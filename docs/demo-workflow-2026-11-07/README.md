23# Alur demo ERP Kelompok 03

Tanggal pemeriksaan 7 November 2026. Alur mengikuti skrip single presenter Rasa Aruna Kitchen yang diberikan pengguna.

## Perbaikan

- Sales Order dan Purchase Order sekarang menampilkan langkah berikutnya beserta tombol dokumen terkait di atas daftar dokumen. Tautan membawa ID dokumen yang benar, bukan sekadar membuka daftar Inventory.
- Konfirmasi SO tetap menggunakan engine yang mereservasi stok dan membuat Delivery Order otomatis. Konfirmasi PO tetap membuat penerimaan otomatis.
- Form validasi pengiriman menjelaskan pengiriman sebagian, memberi batas jumlah input, dan menampilkan perkiraan backorder sebelum validasi. Perhitungan dan validasi akhir tetap di server.
- Setelah delivery selesai, pengguna bisa membuka backorder atau membuat invoice dengan SO sumber terpilih otomatis dan kuantitas delivered yang belum ditagih.
- Setelah penerimaan selesai, pengguna bisa membuat vendor bill dengan PO sumber terpilih otomatis dan jumlah accepted.
- Tombol Register Payment dan indikator invoice memakai status POSTED sesuai database. Halaman pembayaran menampilkan totalGross dan ID pelanggan yang benar, serta mempertahankan pilihan invoice setelah pembayaran agar saldo hasilnya terlihat.
- Tombol pembayaran vendor memilih bill dan nominal outstanding sesuai tautan sumber.
- POS menampilkan pemilih sesi dan ringkasan sesi tertutup, jumlah transaksi, total penjualan, serta kas penutupan. Hasil penutupan langsung juga menampilkan expected cash dan selisih dari respons server. Sesi yang dipilih dipertahankan saat data diperbarui. Tombol buka/tutup sesi dilindungi dari klik berulang.

## Cara menjalankan penjualan dalam skrip

Gunakan akun Owner untuk demonstrasi seluruh modul, atau login dengan role sesuai operasinya. Sales dapat mengonfirmasi pesanan, Warehouse memvalidasi pengiriman, dan Finance membuat serta memposting invoice dan pembayaran.

1. Sales → Pesanan Penjualan. Pilih quotation yang sudah dibuat, pastikan baris RICE-CHICK-S berjumlah 8 dengan harga Rp48.000 tanpa diskon.
2. Jika masih DRAFT, klik Konfirmasi pada Tindakan dokumen, lalu konfirmasi dalam dialog. Sistem tetap memeriksa stok dan batas kredit pelanggan.
3. Klik Proses pengiriman untuk surat jalan milik SO tersebut.
4. Klik Validasi pengiriman. Ubah Dikirim menjadi 5. Perkiraan sisa backorder tampil 3 unit. Klik Validasi pengiriman dalam dialog.
5. Dokumen pengiriman menjadi DONE; tersedia dokumen backorder untuk 3 unit. Jangan memvalidasi backorder saat ingin mendemonstrasikan invoice hanya untuk 5 unit.
6. Klik Buat invoice dari barang terkirim. SO dan jumlah 5 sudah terpilih. Klik Simpan draft invoice.
7. Verifikasi subtotal Rp240.000, PBJT Rp24.000, dan total Rp264.000. Klik Posting atau Confirm / Post Invoice.
8. Klik Register Payment. Pilih metode dan nominal, lalu Konfirmasi Pembayaran. Contoh pembayaran Rp100.000 menyisakan Rp164.000.

Jika memilih dokumen DONE, tombol validasi tidak ditampilkan karena pengiriman itu sudah selesai. Gunakan dokumen DRAFT atau CONFIRMED, atau buka backorder untuk mengirim sisa pesanan. Quotation yang belum dikonfirmasi belum mempunyai surat jalan.

## Cara menjalankan pembelian dalam skrip

1. Purchase → Pesanan Beli Baru. Pilih V03 PT Kopi Minum Prima dan SKU COF-LATT-HOT, jumlah 10, harga Rp12.000.
2. Simpan RFQ, lalu Konfirmasi. Klik Proses penerimaan pada PO tersebut.
3. Klik Validasi penerimaan. Isi Diterima 8, Ditolak 2, dan alasan penolakan; validasi.
4. Klik Buat tagihan dari barang diterima. PO dan jumlah 8 sudah terpilih. Simpan draft tagihan, verifikasi Rp96.000, lalu Posting.
5. Klik Bayar tagihan vendor. Bill dan nominal outstanding terpilih otomatis. Catat pembayaran vendor; pembayaran penuh menghasilkan sisa Rp0.

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
