    # Kelengkapan F&B Aruna — 17 November 2026

Pengembangan ini mengikuti permintaan pengguna untuk melengkapi tabel evaluasi, termasuk fitur dapur yang melampaui lingkup barang jadi pada PDF **24SI1 - Group 03 - Food and Beverage.pdf**. Fitur telah diimplementasikan pada aplikasi lokal; dokumen ini membedakan implementasi dari batasannya.

## Halaman dan alur baru

| Evaluasi | Implementasi sekarang | Cara membuka / batasan |
| --- | --- | --- |
| POS, stok, dan akuntansi | Pembayaran memotong stok fisik tersedia dan mencatat kas, penjualan, PBJT serta HPP dalam transaksi atomik. | `/pos`; stok reservasi tidak dapat dipakai ulang. |
| Resep / BoM | Komposisi beberapa bahan, jumlah hasil, versi resep dan dua cara pemenuhan. | `/operations/production`; satuan dasar integer seperti gram/ml, belum konversi satuan otomatis. |
| HPP resep dan selisih bahan | Menu mode BACKFLUSH memotong bahan saat POS dan menghitung HPP dari biaya standar masing-masing bahan. Produksi menyimpan pemakaian aktual dan selisih terhadap resep untuk jumlah hasil aktual. | Hasil produksi stok dinilai dengan biaya standar produk hasil; beda nilai bahan dan hasil masuk akun 8010. Belum metode biaya rata-rata aktual per batch. |
| Batch, kedaluwarsa, FIFO/FEFO | Batch per SKU/lokasi; konsumsi memilih kedaluwarsa terdekat, lalu waktu penerimaan sebagai pemecah urutan. Batch kedaluwarsa ditolak saat POS, pengiriman dan transfer. Transfer mempertahankan identitas batch. | `/operations/lots`; FEFO aktif setelah SKU didaftarkan ke batch, bukan sakelar metode FIFO terpisah. |
| Beberapa lokasi | Owner menugaskan kasir ke satu atau beberapa outlet; sesi, penjualan, stok dan KDS mengikuti lokasinya. Detail produk menjumlah semua lokasi. Dashboard mempunyai filter lokasi. | `/operations/outlets`; tanpa penugasan eksplisit kasir tetap CAFE-JKT. Harga master tetap bersama seluruh outlet. |
| Master data | Produk, satuan, kategori, vendor/harga, lokasi dan resep dapat dikelola. | Bahan contoh tambahan tidak menggantikan 15 SKU PDF. |
| Pengadaan otomatis | Aturan minimum/target membuat Purchase Request setelah perubahan bisnis; Owner menyetujui, Procurement memilih vendor untuk membuat RFQ draft. Penerimaan terbuka diperhitungkan dan pengajuan aktif tidak digandakan. | `/operations/purchase`; penolakan menjeda aturan sampai diaktifkan kembali. Pemeriksaan juga tersedia lewat tombol; belum scheduler ketika aplikasi tidak menerima operasi. Lokasi penerimaan harus dipilih sesuai pengajuan saat konfirmasi PO. |
| Penerimaan dan QC | Alur diterima/ditolak tetap berjalan. Barang diterima didaftarkan ke batch dengan referensi penerimaan/QC dan tanggal kedaluwarsa. | Registrasi batch adalah langkah terpisah setelah penerimaan; tidak menambah stok kedua kali. Pemeriksaan kondisi fisik tetap tugas petugas. |
| Three-way matching | Alur PO–penerimaan–tagihan lama dipertahankan dan diuji ulang. | Bukan audit independen atas bukti barang fisik. |
| Produksi dapur / MO | Rencana produksi menyimpan snapshot resep; petugas mengisi bahan aktual dan hasil, lalu menyelesaikan atau membatalkan draft. Penyelesaian mengurangi bahan, menambah hasil dan membuat jurnal. | `/operations/production`; belum penjadwalan workstation, produksi bertingkat otomatis, atau pembatalan hasil produksi yang sudah posted. |
| QR ordering dan KDS | Owner membuat meja/QR; pelanggan mengirim pesanan tanpa login; dapur menjalankan status menunggu → diterima → dimasak → siap → selesai. POS juga membuat satu tiket dapur. | `/operations/kitchen`; halaman pelanggan dari tautan QR. Tiket QR belum memotong stok atau membukukan pendapatan sampai pembayaran dicatat kasir. Ketersediaan/harga dikonfirmasi ulang. |
| Invoice dan pembayaran | Invoice barang terkirim dan unduhan PDF tersedia; POS menyediakan struk. | Modul invoice sebelumnya dipertahankan; QRIS/Bank merupakan pencatatan metode, belum integrasi payment gateway. |
| Sesi kasir | Modal awal, sesi per lokasi, transaksi, tutup sesi dan selisih kas. | Kasir hanya dapat menggunakan outlet yang ditugaskan. |
| Laporan keuangan | Laba/rugi periode, neraca saldo, piutang/utang, neraca dan arus kas berdasarkan jurnal POSTED. Neraca memasukkan laba berjalan; arus kas memisahkan saldo migrasi dalam periode. | `/accounting/reports`; klasifikasi arus kas menggunakan akun lawan dan jurnal campuran masuk Perlu ditinjau. Bukan paket laporan akuntansi tersertifikasi. |
| Departemen produksi dan waste | Role KITCHEN tersedia di Kelola Tim; prioritas dapur dan produksi tampil di Beranda. Waste menyimpan alasan, batch, jumlah, biaya, pergerakan stok dan jurnal. | `/operations/lots`; waste batch kedaluwarsa boleh dibuang, stok reservasi tetap dilindungi. |

## Memakai fitur

1. Buat bahan dan produk hasil melalui **Data Produk & Harga**. Gunakan gram/ml sebagai satuan dasar bila membutuhkan resep pecahan kilogram/liter.
2. Terima barang melalui alur penerimaan yang ada. Daftarkan nomor batch, jumlah, kedaluwarsa dan referensi QC di **Batch, FEFO & Waste**. Registrasi hanya mengalokasikan stok yang sudah tercatat.
3. Buat resep. Mode **Produksi stok lebih dahulu** menghasilkan barang fisik lewat MO. Mode **Potong bahan saat penjualan POS** langsung menggunakan bahan saat checkout.
4. Untuk produksi, pilih resep dan lokasi, buat rencana, isi pemakaian aktual dan hasil, lalu simpan. Hasil yang memakai batch membutuhkan kode batch dan kedaluwarsa.
5. Untuk QR, Owner membuat meja di **Antrean Dapur & QR**, lalu menampilkan atau mengunduh QR. Gunakan alamat website yang dapat diakses ponsel; localhost hanya dapat dipakai pada komputer yang sama.
6. Pesanan pelanggan muncul di KDS. Kasir meninjau harga, memilih sesi aktif di outlet yang sama, lalu mencatat pembayaran yang benar-benar diterima. Dapur tidak dapat menuntaskan pesanan belum dibayar.
7. Atur batas minimum dan target stok. Owner meninjau pengajuan; Procurement membuat draft, lalu melanjutkan alur PO, penerimaan dan tagihan yang sudah ada.

Refund menu resep tidak mengembalikan bahan yang telah dimasak. Retur SKU batch menjadi stok belum dialokasikan; petugas harus melakukan QC dan registrasi batch sebelum penjualan kembali. Penurunan manual stok SKU batch diarahkan melalui waste agar sumber batch tercatat.

## Data PDF dan contoh

Preview lokal `http://127.0.0.1:3001` memakai 15 SKU beserta harga jual/biaya PDF. Fixture T-27 dijalankan melalui mesin POS: 2 Latte Hot dan 1 Chocolate Cookie, net Rp80.000, PBJT Rp8.000, pembayaran Rp88.000, HPP Rp33.000; stok kafe menjadi 22 dan 19. Tanggal fixture menggunakan hari demonstrasi.

Empat SKU berawalan **DEMO-** ditambahkan hanya pada preview: susu ml, kopi gram, saus hasil produksi dan latte resep. Seluruhnya diberi nama “Contoh tambahan”; komposisi resep dan batch ini bukan data dari PDF. Tidak membuat transaksi tambahan hanya untuk memenuhi grafik produk terlaris; grafik menampilkan data transaksi yang benar-benar ada.

`seed_pdf_dashboard.ts` dan `seed_advanced_demo.ts` dibatasi direktori sementara `aruna-dashboard-demo-*` dan database di dalamnya. Seeder PDF mereset preview; seeder tambahan tidak mereset. Jangan menjalankan seeder transaksi langsung pada database perusahaan.

## Migrasi dan verifikasi

Migrasi `20261117_advanced_fnb` menambah tabel serta kolom trackLots default false. `scripts/migrate_advanced.py` memverifikasi salinan, lalu membuat backup sebelum penerapan. Data perusahaan tidak di-reset; tidak otomatis diubah menjadi produk resep atau wajib batch. Backup penerapan berada di `backups/advanced-20261117T082529124880Z`.

Untuk instalasi yang belum dimigrasi:

```sh
npm run db:migrate:check
npm run db:migrate
npx prisma generate
```

Jalankan pengujian pada salinan sementara melalui `python3 scripts/verify_isolated.py`, bukan langsung menjalankan suite yang memanggil executeSeed di database bisnis. Skrip memeriksa hash database asli sebelum dan sesudah pengujian.

Bukti hasil akhir disimpan dalam `docs/ux/evidence-advanced-fnb/`. Semua 17 rangkaian pengujian, TypeScript dan build lulus; fitur F&B mencakup 29 pemeriksaan dan PDF mencakup 32 kasus. Verifikasi browser desktop melihat kartu resep beserta estimasi biaya, dialog rencana produksi, panel KDS, modal QR meja dan menu pelanggan dari tautan QR. Pemeriksaan seluruh alur mutasi dilakukan melalui engine/API di database sementara; belum uji usability staf atau uji perangkat ponsel nyata.

## Batas operasional

KDS memakai polling 10 detik. Tautan QR dapat dinonaktifkan Owner, dibatasi 5 pesanan per menit dan 20 pesanan terbuka per meja, maksimum 30 varian dan 100 unit per varian. Menu publik tidak menampilkan biaya atau data pelanggan. Token meja bertindak sebagai tautan pemesanan; orang yang memiliki tautan dapat mengirim pesanan dan dapur tetap perlu mengonfirmasi.

Kemampuan baru ini tidak otomatis menjadi alat mutasi chatbot. AI tetap mengikuti daftar alat dan izin backend yang sudah ada; pengoperasian produksi, batch, KDS dan persetujuan dilakukan melalui halaman masing-masing.
