# Rancangan demo CEO — target 21 November 2026

Dokumen ini adalah **usulan skenario**. Perbaikan prioritas sudah diterapkan dan diuji; lihat [hasil implementasi](PERBAIKAN_DAN_VERIFIKASI.md). Dataset khusus expo di bawah belum dibuat di perusahaan pengguna. Durasi tujuh menit tetap merupakan asumsi perencanaan.

Pesan produk: **“Pemilik mengetahui pekerjaan yang tersendat, tim menemukan sumber masalah, dan tindakan operasional dapat ditinjau serta ditelusuri sampai dokumen akhirnya.”**

## Cerita tunggal

Pelanggan memesan delapan produk. Gudang utama kosong, tetapi gudang kedua mempunyai stok. Tim memakai stok yang sudah dimiliki, memindahkannya ke gudang pemenuhan, mengirim pesanan, lalu mencatat invoice. AI membantu pemeriksaan dan draft; aturan ERP memvalidasi transaksi.

Skenario ini memakai transfer menuju WH-JKT untuk memperlihatkan koordinasi gudang. Alternatif yang kini tersedia: pilih WH-BDG saat konfirmasi SO untuk memenuhi seluruh pesanan dari gudang itu. Pemecahan otomatis satu pesanan ke beberapa gudang belum tersedia.

## Prasyarat data simulasi

Siapkan pada perusahaan/database expo khusus, terpisah dari transaksi perusahaan pengguna. Gunakan nama dan kontak fiktif.

| Data | Nilai contoh |
|---|---|
| Pelanggan | Pelanggan Expo, kredit mencukupi, tanpa piutang awal yang mengganggu skenario |
| Produk | SKU `DEMO-LATTE`, satuan cup, harga jual Rp30.000, biaya standar Rp12.000 |
| Gudang utama | WH-JKT: on-hand 0, reserved 0 |
| Gudang kedua | WH-BDG: on-hand 12, reserved 0 |
| Gerai | CAFE-JKT terdaftar, saldo sesuai skenario terpisah |
| Permintaan | 8 cup; diskon 0; PBJT mengikuti skenario aplikasi 10% |
| Penawaran | Draft yang siap diperlihatkan; belum dikonfirmasi ketika gudang utama kosong |

Nilai ekspektasi untuk SKU ini: sesudah transfer 8, WH-JKT 8 dan WH-BDG 4; total tetap 12. Sesudah pengiriman 8, gudang utama 0, gudang kedua 4. Penjualan net Rp240.000, PBJT Rp24.000, invoice bruto Rp264.000. Angka laba laporan keseluruhan bergantung seluruh jurnal pada dataset; jangan menganggap satu pesanan sama dengan laba seluruh perusahaan.

## Alur tujuh menit

| Menit | Apa yang diperlihatkan | Kalimat presenter | Bukti yang diperiksa |
|---|---|---|---|
| 0:00–0:40 | Masalah bisnis dan tiga langkah lintas tim | “Masalahnya bukan hanya stok kosong. Sales menunggu gudang, gudang menunggu keputusan, dan Finance menunggu bukti pengiriman.” | Nyatakan data simulasi dan ruang lingkup pilot F&B. |
| 0:40–1:20 | Ringkasan prioritas/stock dan draft SO | “Gudang pemenuhan kosong, sementara gudang lain masih mempunyai 12.” | Tampilkan available per lokasi; jangan hanya total perusahaan. |
| 1:20–2:20 | Chat memeriksa stok semua lokasi dan menyiapkan draft transfer | “Asisten mencari data dan membantu menyiapkan tindakan yang bisa diperiksa.” | Sumber SKU/lokasi dan kartu tinjauan muncul dari tool, bukan teks janji semata. |
| 2:20–3:10 | Tinjau dan simpan draft; lanjutkan ke validasi transfer di modul gudang | “Pengguna tetap melihat lokasi, kuantitas, dan dokumen sebelum tindakan.” | Asal 12→4, tujuan 0→8; total tetap 12; nomor dokumen dan jejak aktivitas tersedia. |
| 3:10–4:20 | Konfirmasi SO dan validasi pengiriman | “Sales dapat melanjutkan setelah persediaan di gudang pemenuhan siap.” | Reservasi dan pengiriman sesuai SKU/kuantitas. Tidak ada stok negatif. |
| 4:20–5:15 | Invoice berdasarkan barang terkirim, lalu sumber laporan keuangan | “Finance menerima dokumen sumber tanpa mengetik ulang seluruh pesanan.” | Invoice 8 unit, jumlah benar, tautan ke pengiriman/pesanan dan jurnal. |
| 5:15–6:00 | Satu bukti guard dan jejak aktivitas | “Peran, stok, dan pengulangan tindakan dikendalikan sistem.” | Gunakan contoh yang sudah diuji; jangan menjalankan tombol QA yang mereset/mengubah data di tengah presentasi. |
| 6:00–7:00 | Manfaat terukur dan rencana pilot | “Kami mengukur waktu kerja dan koreksi pengguna; kemampuan multi-staf akan diuji dalam pilot.” | Tampilkan hasil benchmark yang benar-benar tersedia, tiga prioritas pengembangan, dan ajakan pilot yang terarah. |

Satu presenter dapat memakai Owner untuk demonstrasi lintas modul, dengan penjelasan tugas masing-masing tim. Demonstrasi pembatasan staf dapat dilakukan terpisah. Jika memakai beberapa peran secara langsung, siapkan alur login yang sudah dilatih; tab dengan cookie yang sama tidak otomatis menjadi sesi peran yang terpisah.

## Contoh prompt yang spesifik dan bisa diperiksa

1. “Periksa stok `DEMO-LATTE` di semua lokasi. Saya perlu memenuhi 8 cup dari WH-JKT. Tampilkan on-hand, reserved, dan available masing-masing lokasi.”
2. Setelah data sesuai: “Siapkan draft transfer 8 cup `DEMO-LATTE` dari WH-BDG ke WH-JKT.”
3. Setelah proses manual selesai: “Tampilkan sales order terbaru untuk Pelanggan Expo dan statusnya.”

Ringkasan laba/rugi per periode kini tersedia dari jurnal posted melalui chat dan laporan. Daftar prioritas berizin tersedia di beranda dan melalui asisten. Jangan menjanjikan “tangani semua masalah perusahaan otomatis”; tunjukkan data sumber serta tindakan yang dapat ditinjau.

## Menjawab pertanyaan CEO

| Pertanyaan | Jawaban yang sesuai kondisi saat ini |
|---|---|
| “Bisa untuk banyak gudang?” | Data dan transfer tiga lokasi sudah diuji. SO dapat memilih satu lokasi pemenuhan; PO dapat memilih tujuan penerimaan. Pemecahan otomatis pesanan dan transfer dengan status perjalanan terpisah belum tersedia. |
| “Apakah AI bebas mengubah transaksi?” | Tool yang tersedia menyiapkan proposal. Pengguna meninjau dan menyimpan draft; validasi/konfirmasi berada di modul ERP sesuai peran. |
| “Bisa dipakai semua staf sekarang?” | Versi ini pilot lokal dengan model 4B dan satu run AI pada satu waktu. Akses jaringan, antrean dan kapasitas multi-pengguna belum diuji. |
| “Bisa dipakai tanpa API berbayar?” | Inferensi menggunakan model lokal yang sudah diunduh. Komputer, listrik, pemeliharaan dan operasi tetap memerlukan sumber daya. |
| “Sudah menghemat berapa persen?” | Sampaikan pengukuran yang sudah dilakukan. Jika belum, jelaskan rancangan benchmark dan target pilot sebagai target, bukan hasil. |
| “Pembayaran QRIS sudah terintegrasi?” | Pencatatan metode bayar tersedia. Integrasi gateway/callback dan rekonsiliasi harus dibuktikan terpisah sebelum diklaim. |
| “Siap untuk dapur dan bahan baku?” | Produk, stok dan alur transaksi sudah ada. Resep/BOM, konversi satuan, batch/expiry, dan FEFO merupakan cakupan lanjutan. |

## Persiapan gladi bersih 20 November

- Perbaiki tiga penghambat P0 dan ulangi kasus uji terkait. Dashboard harus diuji melalui browser, bukan hanya build yang lulus.
- Siapkan perusahaan/data expo fiktif dan titik awal skenario yang dapat dipulihkan dengan aman. Pisahkan prosedur penyiapan dari tombol yang diklik saat presentasi.
- Jalankan file mulai asisten, pastikan ERP 3000, Langflow proyek 7870, dan Ollama 11434 aktif. Panaskan model dengan satu tugas baca sebelum sesi, tanpa mengarang hasil cadangan.
- Coba perangkat dan resolusi yang akan dipakai, ukuran teks dari jarak audiens, mode pengurangan gerak, serta perilaku font ketika jaringan lambat/tidak tersedia.
- Tutup antrean AI yang tidak relevan, beri waktu untuk satu pesan selesai, dan hindari permintaan serentak selama demo lokal.
- Rekam satu versi demo berhasil. Jika memakai rekaman, nyatakan bahwa itu rekaman; jika AI bermasalah, proses ERP manual tetap dapat dijelaskan.
- Minta 2–3 orang mencoba tugas inti tanpa dibimbing setiap klik. Catat titik bingung dan perbaiki masalah terbesar.

## Setelah expo: tawarkan pilot yang memiliki ukuran keberhasilan

Mulai dari satu proses yang mahal secara waktu, misalnya replenishment dua gudang atau penawaran penjualan. Tentukan pengguna, perusahaan/lokasi, data yang dibutuhkan, aturan persetujuan, baseline waktu kerja, dan definisi keberhasilan. Perluasan ke departemen lain mengikuti hasil pilot, bukan jumlah fitur di daftar menu.
