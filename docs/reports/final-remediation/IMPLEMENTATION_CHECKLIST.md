# Checklist remediasi ERP

Titik awal adalah commit `2005b7b`. Acuan audit adalah `Group03_24SI1_FnB_Audit.docx` dan handout F&B Group 03. Database kerja disalin dengan backup SQLite dan diperiksa dalam mode baca.

| Urutan | Temuan dan akar masalah | Implementasi dan verifikasi |
| --- | --- | --- |
| P1.1 | Home dan dialog berbagi direktori halaman per kelompok, tanpa grid modul | Gunakan satu katalog untuk delapan pintasan Owner dan uji rute, identitas serta penolakan GL bagi Cashier |
| P1.2 | Database kerja mengandung transaksi aktual dan pricelist kosong. Form RFQ saat ini memakai fallback biaya tanpa label, dan jalur draft/API belum seragam | Siapkan profil demo terpisah, validasi fixture, dan gunakan aturan saran harga yang sama di UI dan engine |
| P1.3 | Checkout SQLite lokal dan build publik tidak dapat disamakan dari halaman login | Periksa konfigurasi, database, sesi, isolasi dan build. Tambahkan penanda build serta runbook staging dan rollback |
| P2.1 | Engine mengizinkan Head Admin dan menyimpan approval berupa boolean serta nama | Batasi keputusan ke Owner, simpan keputusan dan alasan, validasi revisi, dan uji approval serta price lock |
| P2.2 | Smoke menghapus Lead yang sudah di-restore sebagai record aktif | Uji 409, batalkan, hapus dan cek audit serta persistensi setelah restart |
| P2.3 | Dua tenant tidak memiliki jurnal pembuka 1030 yang mendukung valuasi stok | Rekonsiliasi baca-saja dengan referensi dokumen, rekomendasi dan uji simulasi T-32 |
| Validasi akhir | Hasil layanan lama belum membuktikan perbaikan UI dan deployment | Jalankan kembali T-01 sampai T-32 serta alur O2C, P2P, POS pada salinan. Simpan matriks, hasil, dan bukti |
