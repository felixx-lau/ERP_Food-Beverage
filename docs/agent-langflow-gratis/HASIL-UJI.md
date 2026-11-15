# Hasil verifikasi lokal — 14 November 2026

Implementasi akhir menggunakan ERP port 3000, Langflow khusus proyek port 7870, dan Ollama port 11434. Model: `qwen3:4b-instruct-2507-q4_K_M`.

| Pemeriksaan | Hasil |
|---|---|
| Build produksi Next.js dan pemeriksaan TypeScript | Lulus |
| Suite `test_agent` pada database sementara | 12 kelompok pengujian lulus; tidak ada kegagalan |
| Pemeriksaan HTTP autentikasi/otorisasi pada salinan ERP | 9 lulus: akses anonim, peran kasir, akses proposal, dan penolakan origin lain |
| Logo robot, animasi pembukaan, fokus kolom pesan | Lulus pada browser pengujian terpisah |
| Ukuran layar 390 × 844 | Panel berada dalam viewport |
| Escape menutup panel dan mengembalikan fokus | Lulus |
| Model asli → tool ERP → kartu tinjauan → klik Simpan draft | Tepat satu quotation DRAFT dibuat di salinan database |
| Tautan kartu tersimpan | Membuka order yang sesuai |
| Chat ERP utama → Langflow khusus proyek → stok perusahaan aktif | Lulus; tool inventory dipanggil; waktu satu sampel sekitar 6 detik |
| Hash database bisnis asli saat uji baca terakhir | Seluruhnya tetap sama |
| Flow privat dan ekspor tanpa capability/API key | Lulus |
| File mulai menyalakan layanan di latar belakang | Lulus; layanan utama tetap berjalan setelah proses mulai selesai |

Suite transaksi juga memeriksa SKU/kuantitas tidak valid, duplikasi item, pembatasan peran, pemisahan perusahaan, pencabutan sesi saat membaca dan menyimpan, sidik data, kepemilikan proposal, pembatalan, kedaluwarsa, perubahan master, penyimpanan ulang tanpa dokumen ganda, perhitungan PBJT, serta stok dan jurnal yang tetap saat menyimpan draft. RFQ dan transfer diuji melalui mesin bisnis yang sama pada database sementara.

Percobaan awal menemukan ketidakcocokan argumen teks JSON; komponen akhir memakai objek `DictInput`. Layanan Langflow lama juga pernah berhenti/menghasilkan broken pipe; konfigurasi akhir memakai layanan terpisah dengan database, secret, dan log di folder proyek. Layanan Langflow milik pengguna yang lain tidak dipakai oleh integrasi akhir.

Log dan gambar pemeriksaan ada di `.local/logs/` dan tidak masuk Git. Pemeriksaan visual dilakukan dengan Chrome headless pada profil sementara; bukan profil browser pribadi. Server ERP pengujian dan browser pengujian ditutup sesudah pemeriksaan. Hasil ini adalah verifikasi lokal, bukan uji kapasitas untuk banyak staf sekaligus.
