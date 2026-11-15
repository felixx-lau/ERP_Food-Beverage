# Perbaikan audit dan hasil verifikasi

Tanggal: 15 November 2026 (WIB). Target showcase: 21 November. Aplikasi lokal: http://127.0.0.1:3000. Langflow proyek tetap di port 7870, dengan model lokal gratis yang sudah terpasang.

## Perbaikan yang diterapkan

| Area | Perilaku setelah perbaikan |
|---|---|
| E01 — dashboard | Controller grafik line/bar/doughnut terdaftar. Kegagalan panel mendapat pesan alternatif dan tidak menghilangkan seluruh halaman. Grafik dan pergantian periode diperiksa lewat browser. |
| E02 — batas kasir | CASHIER hanya dapat membuka sesi dan menjual dari CAFE-JKT. Sesi gudang yang sudah ada juga tidak dapat dipakai untuk melewati batas ini. Owner tetap mengikuti akses yang sudah dimiliki. |
| E03 — restock | Pasokan dihitung dari sisa penerimaan aktif menuju lokasi yang direncanakan, dengan ETA dalam horizon. Penerimaan lokasi lain tidak mengurangi kebutuhan gudang ini. Sisa PO membatasi hitungan agar tidak ganda. Opsi stok lokasi lain ditampilkan sebagai pilihan transfer yang belum dialokasikan. |
| Penjualan beberapa gudang | Saat konfirmasi SO, pengguna memilih satu lokasi pemenuhan. Reservasi dan DO mengikuti lokasi itu; stok tersedia, kredit, diskon, pengulangan tindakan, dan transaksi atomik tetap diperiksa. |
| Pembelian beberapa gudang | Saat konfirmasi PO, pengguna memilih lokasi penerimaan. Tanggal rencana PO diteruskan ke penerimaan serta backorder penerimaan. |
| Persediaan | Filter lokasi membaca daftar lokasi aktif, termasuk gudang ketiga. Fisik, reserved, dan tersedia ditampilkan terpisah. Peringatan menggunakan stok tersedia per lokasi; batas awal bersama 20, target perencanaan 30, horizon 14 hari. |
| Pembaruan data | Persediaan, POS, dan prioritas beranda memperbarui data tiap 15 detik ketika halaman terlihat, saat fokus kembali, serta melalui pemberitahuan transaksi antar-tab perusahaan yang sama. Ini polling, bukan sinkronisasi gudang offline atau layanan push. |
| Pusat pekerjaan | Beranda menampilkan jumlah dan tautan tindak lanjut sesuai peran: pengiriman, penerimaan, invoice lewat tempo, diskon menunggu Owner, stok rendah, barang terkirim belum ditagih, invoice draft, serta sesi kasir sendiri. Tim penghubung dan alasan ditampilkan; belum ada penugasan personal atau SLA tersimpan. |
| Formulir SO/PO | Pelanggan/vendor dan produk dimulai kosong; jumlah awal 1. Pencarian menerima SKU, nama unik, atau label varian. Nama ambigu perlu pilihan varian. Harga mengikuti master/vendor yang sesuai, ID input unik, dan isian dibekukan saat penyimpanan. |
| POS | Tidak menampilkan nomor/nama sesi contoh ketika sesi belum tersedia. Kategori mengikuti master produk, termasuk kategori kosong, bukan dugaan berdasarkan nama menu. Kegagalan pembaruan ditampilkan. |
| Finance | Laba/rugi dapat dipilih per tanggal WIB dari jurnal posted, tanpa jurnal pembukaan. Neraca saldo, piutang dan utang tetap kumulatif dan diberi keterangan. Tidak mengubah rumus pajak atau membuat jurnal penyeimbang. |
| AI | Menambahkan tool daftar pekerjaan dan keuangan agregat per periode, dengan pemeriksaan peran. Konteks halaman/dokumen diverifikasi terhadap perusahaan aktif. Rincian tool dibatasi agar sesuai model lokal. Percakapan dipulihkan dalam tab browser, terikat perusahaan, pengguna, peran, dan versi sesi, dengan batas delapan jam/30 pesan. Logout membersihkan cache chat lokal ini. |
| Keandalan jawaban keuangan | Untuk permintaan yang hanya membaca ringkasan keuangan, angka dan periode jawaban diformat dari hasil tool yang terverifikasi. Waktu sumber ditampilkan oleh UI. Jawaban model umum tetap perlu ditinjau. |
| Desain | Teks asisten dan petunjuk dibuat lebih terbaca; panel chat lebih lega. Animasi dipercepat dan reduced motion dipertahankan. Font sistem menghilangkan ketergantungan Google Fonts. Header dokumen disesuaikan agar tidak melebar di ponsel. Tombol simulasi rekonsiliasi dipindahkan ke panel pemeriksaan yang dapat dibuka. |
| Status | Diskon sampai 10% tidak lagi ditandai menunggu persetujuan tambahan. Daftar dokumen utama membedakan pemuatan dari hasil kosong. |

Metrik grafik “stok fisik total rendah” tetap merupakan agregat perusahaan dan kini diberi nama yang menjelaskan cakupannya. Keputusan restock memakai persediaan tersedia per lokasi pada beranda/tool, bukan metrik total fisik itu.

## Bukti pengujian

- Pengujian menyeluruh: **214 keluaran PASS**, seluruh suite berhasil, termasuk 14 ekspektasi probe kepatuhan. Pemeriksaan tipe dan build produksi berhasil.
- Kasus regresi baru: transfer tiga lokasi, perlindungan reserved, konfirmasi/pengiriman dari gudang ketiga, tujuan penerimaan, ETA, penerimaan parsial, pembatasan kasir, hari WIB, varian ambigu, peran/konteks halaman, dan laporan jurnal per periode.
- Contoh restock: WH-BDG tersedia 2, target 30, inbound 20 menuju WH-JKT → kebutuhan **28**. Inbound 20 menuju WH-BDG dalam horizon → **8**. Setelah menerima 5: tersedia 7, sisa inbound 15 → tetap **8**.
- Browser menggunakan salinan database: membuat draft SO, menolak konfirmasi saat lokasi tidak memiliki stok, lalu berhasil dari lokasi yang cukup stok; laporan 1 Februari menghasilkan Rp123.456 sesuai fixture; grafik berubah periode; filter gudang ketiga; riwayat chat pulih setelah navigasi/reload; formulir ponsel 390 × 844; dua baris produk tanpa ID ganda.
- Pengujian mutasi dijalankan melalui `verify_isolated.py`, dengan database salinan dan pemeriksaan hash database asli sebelum/sesudah. Tidak menjalankan seed atau transaksi uji pada database perusahaan pengguna.

Pemeriksaan tambahan setelah penyempurnaan jawaban keuangan: 37 keluaran PASS dari suite AI, regresi audit, dan grafik; pemeriksaan tipe juga lulus. [Bukti lanjutan](evidence/improvements-final-followup.json). Pemeriksaan browser dirangkum dalam [catatan verifikasi tampilan](evidence/improvements-browser-verification.json). Login demo terakhir pada aplikasi utama hanya menambah audit autentikasi normal.

Bukti mesin: [hasil menyeluruh](evidence/improvements-verification-results.json), [kasus regresi](evidence/improvements-regressions.json). Bukti gambar: [dashboard](evidence/dashboard-after.jpg), [formulir ponsel](evidence/sales-form-mobile-after.jpg), [beranda terbaru](evidence/home-after.jpg), [laporan AI](evidence/ai-finance-after.jpg). Bukti audit awal tetap tersedia dan menggambarkan kondisi sebelum perubahan.

## Batas versi ini dan langkah berikutnya

- Belum ada pembagian otomatis satu SO ke beberapa gudang, gudang offline, transfer dispatch → in transit → penerimaan terpisah, atau transfer antar-perusahaan.
- Minimum/target stok masih kebijakan awal bersama, belum konfigurasi per SKU/lokasi berbasis permintaan dan lead time. Lokasi aktif yang belum memiliki saldo produk diperlakukan tersedia nol.
- Model lokal masih melayani satu permintaan AI pada satu waktu. Permintaan bersamaan mendapat pesan sibuk. Ini belum pengujian kapasitas banyak staf atau sistem produksi untuk seluruh cabang.
- Riwayat browser bukan arsip percakapan lintas perangkat. Model tetap dapat salah memahami instruksi; pengguna meninjau jawaban dan kartu sebelum menyimpan. Penyimpanan tetap hanya DRAFT, sedangkan konfirmasi/posting berada di modul ERP.
- Resep/BOM, batch/expiry/FEFO, produksi/waste, HR/payroll, assignment personal, SLA, dan notifikasi otomatis merupakan pengembangan lanjutan.
- Dataset showcase khusus, benchmark penghematan waktu, wawancara staf, uji aksesibilitas menyeluruh, dan gladi bersih bersama presenter belum dilakukan. [Panduan demo](DEMO_CEO_21_NOVEMBER.md) menjelaskan persiapannya.

Perubahan tidak membutuhkan perubahan skema database. Jalankan ulang aplikasi lewat file “Mulai Asisten ERP.command” jika layanan lokal berhenti. Suite baru juga masuk perintah pengujian standar proyek.
