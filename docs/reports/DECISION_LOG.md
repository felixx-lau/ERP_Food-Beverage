# Decision Log Rasa Aruna Kitchen

Keputusan mengikuti konflik dan kontrol pada handout Group 03. Bukti lebih lengkap tersedia di [matriks persyaratan](final-remediation/REQUIREMENT_TRACEABILITY_MATRIX.md).

| Aturan | Opsi dan keputusan | Dampak dan bukti |
| --- | --- | --- |
| SR-01 dan SR-02 | Tagih saat konfirmasi atau saat barang terkirim. ERP menagih kuantitas terkirim yang masih tersedia untuk invoice. | Owner menunda penagihan Rp158.400 atas 3 unit yang belum dikirim. F-09, S-10, T-19/20. |
| SR-03 dan SR-04 | Kasir boleh memakai stok minus atau dibatasi stok tersedia. ERP menjaga stok dan reservasi per lokasi. | Kasir dapat menawarkan varian lain atau meminta transfer melalui Gudang. F-07/16/19, S-06/07/14, T-12/14/28. |
| SR-05 dan SR-06 | Bayar PO penuh atau hanya barang yang lolos QC. ERP mencocokkan PO, receipt diterima dan bill. | Vendor menunggu Rp24.000 atas 2 unit yang ditolak. F-12/13, S-09/11, T-17/18/21/22. |
| SR-07 dan SR-08 | Bebaskan diskon 0–20% atau tinjau di atas 10%. Owner memutuskan dengan alasan dan ERP mengunci harga setelah konfirmasi. | Sales menunggu keputusan untuk menjaga margin. Revisi isi draft meminta keputusan ulang. F-06, S-05, T-09/10. |
| SR-09 | Hitung limit dari A/R saja atau tambahkan gross order confirmed yang belum terbit invoice. ERP memeriksa exposure saat konfirmasi. | Sales menyesuaikan pesanan jika plafon habis. F-02/10, S-02/05, T-03/04/09. |
| SR-10 | Tahan semua pengiriman atau kirim sebagian. Pilih pengiriman sebagian dengan backorder dan reservasi sisa. | Gudang mengelola dokumen sisa. F-07/08, S-06, T-11/12. |
| SR-11 | Beri kredit langsung atau tunggu hasil inspeksi. ERP menunggu QC dan membalik stok, HPP, pendapatan, PBJT serta piutang. | Pelanggan menunggu QC. Nilai memakai transaksi historis. F-18, S-15, T-29/30. |
| SR-12 dan SR-17 | Gabung saldo atau lacak SKU dan lokasi. ERP memindah stok antar lokasi tanpa mengubah valuasi perusahaan. | Gudang memasukkan lokasi dan varian tepat. F-03/19, S-03/07, T-05/06/13/14. |
| SR-13 dan SR-15 | Hindari duplikasi dengan validasi state, transaksi, replay, akses berbasis peran, dan audit. | Retry menggunakan identitas operasi yang sama. Peran yang ditolak dapat diperiksa di audit. F-01/14/21, S-01/13/16, T-02/16/22/26/28. |
| SR-14 | Posting ulang saat tutup atau susun ringkasan sesi. Tutup sesi menghitung kas fisik, mempertahankan ringkasan dan menghindari posting ganda. | QRIS/Bank diakui sebagai metode non-tunai. F-17, S-14, T-27/28. |
| SR-16 | Izinkan stage CRM bebas atau wajibkan data untuk tahap penawaran. Syarat data dan hubungan Lead–SO dipertahankan. | Sales melengkapi data prospek sebelum Proposition. F-04, S-04, T-07/08. |
| SR-18 | Gunakan gross atau net setelah diskon. ERP mengenakan PBJT fixture 10% pada net per baris dan pajak pembelian fixture 0%. | Finance menjaga dasar pembulatan serta reversal. F-22, S-10/14, T-19/27/29. |
| SR-19 | Terima pembayaran di atas tagihan atau batasi ke sisa. ERP mendukung bayar sebagian dan menolak overpayment. | Finance mengalokasikan nilai tepat. F-15, S-12, T-23/24. |
| SR-20 | Auto-post selisih atau investigasi dokumen sumber. ERP memunculkan selisih dan tautan jurnal tanpa memposting jurnal penyeimbang. | Owner dan Finance memeriksa sumber asli sebelum mengusulkan koreksi. F-20/21, S-16, T-31/32. |
| Cakupan | Dahulukan alur asli PDF. Loyalitas, BoM dan produksi tersedia sebagai fitur tambahan. Gateway QRIS eksternal memerlukan pengujian dan integrasi tersendiri. | Demo kasir mencatat metode QRIS secara internal. F-16/23, S-14, T-27/28 dan suite loyalitas. |
