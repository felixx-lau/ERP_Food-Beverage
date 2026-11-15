# Audit AI, operasional, dan desain untuk Business & Design Showcase

Tanggal audit: **15 November 2026, Asia/Jakarta**. Target acara diasumsikan **21 November 2026**, sesuai jawaban “tanggal 21”. Durasi presentasi belum ditentukan; contoh demo terpisah menggunakan tujuh menit.

**Keputusan utama:** fokus enam hari ke depan pada keandalan, ketepatan stok, dan satu perjalanan kerja lintas departemen. Pusat pekerjaan yang menunjukkan masalah, penanggung jawab, serta tindakan berikutnya akan lebih bernilai untuk pemilik usaha daripada menambah banyak menu atau animasi.

Dokumen ini mempertahankan **temuan sebelum perbaikan**. Perbaikan prioritas kemudian diterapkan atas permintaan pengguna; lihat [hasil implementasi dan verifikasi](PERBAIKAN_DAN_VERIFIKASI.md). Bukti audit awal dipertahankan sebagai pembanding.

## 1. Dasar penilaian dan batas bukti

- Source yang diperiksa: model data, penjualan, pembelian, stok, transfer, POS, laporan, otorisasi, AI tools/proposal, navigasi, formulir, dan CSS.
- Browser langsung: login demo, beranda, dashboard, stok, penjualan, formulir penjualan desktop/390 × 844, POS, laporan keuangan, dan pembukaan chatbot.
- Probe pada fixture terisolasi: transfer tiga lokasi, stok reserved, konfirmasi penjualan dengan stok di gudang lain, restock per lokasi, serta batas lokasi kasir. Database perusahaan asli dilindungi pemeriksaan hash selama probe. Login browser mencatat audit autentikasi normal; transaksi bisnis uji hanya dibuat di salinan.
- Kesalahan dashboard direproduksi dua kali. Pemeriksaan kontras memakai warna teks yang terlihat dan nilai CSS.
- Belum dilakukan wawancara staf, penilaian seluruh layar dengan screen reader, uji semua kombinasi perangkat, atau uji banyak pengguna bersamaan. Masalah staf dalam matriks merupakan hipotesis operasional yang perlu divalidasi, bukan hasil wawancara.

Bukti: [ringkasan JSON](evidence/audit-summary.json), [probe operasional](evidence/operational-probes.json), [hasil eksekusi dan preservasi database](evidence/verification-results.json).

## 2. Fondasi yang sudah bermanfaat

1. Dokumen penjualan, pembelian, pengiriman, penerimaan, invoice, pembayaran, dan jurnal sudah berhubungan. Tautan dokumen serta riwayat aktivitas tersedia.
2. Transfer internal memvalidasi stok tersedia, melindungi stok reserved, memakai transaksi atomik, dan mencegah pengulangan validasi membuat perpindahan kedua.
3. Pemisahan perusahaan, peran, pemeriksaan sesi, serta tinjauan proposal AI sudah ada. AI dapat menyiapkan draft; penyimpanan melalui tindakan pengguna dan mesin bisnis.
4. Laporan laba/rugi dari jurnal posted, neraca saldo, piutang, dan utang sudah tersedia. Kebutuhannya adalah pemilihan periode, analisis penyebab, dan kemudahan tindak lanjut, bukan membangun semuanya dari nol.
5. Inter, warna biru–ungu, permukaan tabel terang, angka rata kanan, dialog, dan dukungan reduced motion merupakan fondasi desain yang dapat dipertahankan.

Kemampuan ini mendukung posisi produk sebagai **asisten operasional ERP F&B dengan tindakan yang dapat ditinjau**. Dukungan menyeluruh untuk HR, payroll, produksi/resep, semua cabang, atau seluruh jenis perusahaan belum dibuktikan.

## 3. Tiga temuan yang paling mendesak

| ID | Temuan aktual | Dampak | Perbaikan yang disarankan | Kriteria selesai |
|---|---|---|---|---|
| E01 · P0 | `/dashboard` menjadi halaman error. Console: `"line" is not a registered controller.` Komponen memakai generic Chart, tetapi registrasi hanya memuat elemen/skala, belum controller yang diperlukan. | Halaman utama pembuktian kepada CEO gagal dibuka. | Lengkapi registrasi controller line/bar/doughnut; tambahkan penanganan error per panel sehingga satu chart tidak menghilangkan seluruh dashboard. | Buka ulang dashboard, tampilkan semua jenis chart, ubah periode, periksa data kosong, dan navigasi ulang tanpa client exception. |
| E02 · P0 | Pada salinan, actor CASHIER dapat membuka sesi di WH-JKT dan menjual 1 unit dari gudang: stok 16 → 15. Ini bertentangan dengan SR-03 yang membatasi kasir ke CAFE-JKT. | Batas tanggung jawab kasir/gudang dapat dilewati melalui input server meskipun tampilan kasir mengarah ke gerai. | Terapkan pemeriksaan lokasi pada server saat buka sesi dan transaksi. Untuk prototype, pertahankan pembatasan CAFE-JKT sesuai aturan; pengembangan cabang berikutnya memakai daftar lokasi yang diizinkan per pengguna. | Permintaan CASHIER ke WH-JKT ditolak tanpa stok/jurnal berubah; transaksi CAFE-JKT yang sah tetap berjalan. |
| E03 · P0 | Restock WH-BDG: stok tersedia 2, target 30, PO terbuka 20 menuju WH-JKT. Tool mengusulkan 8, karena menghitung PO lintas lokasi. Untuk pengisian langsung WH-BDG tanpa rencana transfer, kebutuhan adalah 28. Tool memang memberi catatan lintas lokasi, tetapi belum menghasilkan rencana pasokan per lokasi yang lengkap. | Pengadaan dapat terlalu sedikit atau menganggap barang akan tiba di gudang yang salah. | Hitung inbound sesuai tujuan penerimaan, sisa kuantitas, status, dan ETA dalam horizon rencana. Jika pasokan lokasi lain digunakan, tampilkan transfer dan waktu kedatangannya secara eksplisit. | Kasus ini menghasilkan 28, atau rencana transfer 20 + pengadaan 8 yang sumber/ETA-nya benar-benar dapat dipenuhi. |

P0 adalah urutan prioritas, bukan pernyataan bahwa semua perbaikan sudah dilakukan. Probe terisolasi berhasil mengeksekusi pemeriksaan, tetapi **hasilnya mencatat dua GAP dan satu LIMITATION**, bukan seluruh produk lulus.

Perbaikan chart mengikuti [dokumentasi integrasi resmi Chart.js](https://www.chartjs.org/docs/latest/getting-started/integration.html).

## 4. Jawaban tentang dua gudang atau lebih

**Sudah ada dukungan data dan transfer banyak lokasi dalam satu perusahaan. Belum ada dukungan multi-gudang lengkap di seluruh alur pemenuhan pesanan.**

| Bagian | Status yang ditemukan |
|---|---|
| Master lokasi | Lokasi tambahan dapat didaftarkan; pasangan SKU + lokasi disimpan terpisah. |
| Transfer tiga lokasi | Teruji WH-JKT → WH-BDG → CAFE-JKT. Saldo akhir 16, 2, 2; total tetap 20. |
| Stok reserved | Transfer 14 ditolak ketika on-hand 16 dan reserved 3; tersedia hanya 13. Saldo tetap. |
| Validasi berulang | Tidak membuat perpindahan kedua pada dokumen yang sama. |
| Sales order | Reservasi dan DO masih dibuat dari WH-JKT. Probe: WH-JKT 0, WH-BDG 100, order 1 tetap ditolak; belum ada pilihan/alokasi otomatis dari gudang lain. |
| Purchase order | Konfirmasi membentuk penerimaan dengan tujuan WH-JKT. Tujuan belum menjadi pilihan yang konsisten dari awal alur pembelian. |
| Tampilan stok | Ringkasan memiliki kolom tetap WH-JKT/CAFE-JKT; detail produk membaca daftar lokasi. Gudang ketiga dapat masuk total tanpa muncul sebagai kolom tersendiri. |
| Dashboard | Total dan valuasi membaca seluruh stok; beberapa pemisahan metrik masih khusus dua kode lokasi. |
| Pembaruan layar | Perubahan database terpusat terjadi saat transaksi tervalidasi. Halaman lain mengambil ulang data saat dimuat/di-refresh; belum terlihat mekanisme push stok ke semua tab. |
| Perjalanan barang | Satu validasi langsung mengurangi asal dan menambah tujuan. Belum ada dispatch → in transit → penerimaan tujuan terpisah. |
| Perusahaan berbeda | Penyimpanan perusahaan terpisah. Transfer lokasi ini tidak membuktikan transfer antar-entitas/perusahaan. |

Untuk dua gudang milik badan usaha yang sama, gunakan dua **lokasi dalam perusahaan yang sama**. Jangan membuat perusahaan baru hanya untuk menampung gudang kedua.

Urutan pengembangan yang disarankan:

1. Pilihan lokasi dan kebijakan stok tersedia konsisten pada produk, SO, PO, DO, penerimaan, POS, laporan, dan AI.
2. Hak akses berdasarkan peran **dan lokasi**; gudang/cabang yang diizinkan harus diperiksa di server.
3. Pesanan dapat dipenuhi dari lokasi yang dipilih atau dipecah sesuai ketersediaan, sambil mempertahankan reservasi dan pencegahan stok negatif.
4. Transfer jarak jauh memiliki konfirmasi pengiriman/penerimaan terpisah, barang dalam perjalanan, serta penanganan selisih/rusak. Stok tujuan baru dapat dijual setelah diterima.
5. Tampilan mencantumkan waktu pembaruan dan menyegarkan data sesudah transaksi, kemudian pembaruan antar-tab/pengguna bila diperlukan.

Sebelum expo, tunjukkan transfer tiga lokasi yang sudah terbukti. Klaim alokasi penjualan otomatis dari semua gudang menunggu implementasi dan pengujian tambahan.

## 5. Hambatan setiap departemen dan hubungan kerjanya

| Tim | Hambatan yang perlu diatasi | Bantuan AI/website yang bernilai | Hubungan dengan tim lain | Ukuran keberhasilan |
|---|---|---|---|---|
| Owner/manager | Banyak angka dan menu; sulit mengetahui keputusan yang mendesak. | Ringkasan pengecualian: keterlambatan, risiko stok, penagihan, perubahan margin; setiap temuan memiliki alasan, sumber, PIC, dan tindakan. | Menerima eskalasi dan persetujuan dari seluruh tim. | Waktu menemukan masalah; umur antrean persetujuan. |
| Sales/CRM | Menjanjikan stok/tanggal yang belum pasti; mengulang input; menunggu diskon/limit kredit. | Penawaran dari permintaan pelanggan, verifikasi SKU/varian, stok tersedia per lokasi, estimasi pemenuhan yang bersumber, dan status persetujuan yang jelas. | Stok/pengiriman dari gudang; kelayakan kredit dan invoice dari Finance. | Waktu penawaran; koreksi pesanan; pesanan terlambat. |
| Procurement | Membeli padahal stok ada di lokasi lain; PO terlambat tidak ditindaklanjuti; minimum pembelian/vendor berbeda. | Transfer-versus-buy, reorder berdasarkan SKU/lokasi, perbandingan harga/lead time yang tersedia, serta daftar PO terlambat. | Permintaan gudang/dapur; QC penerimaan; jadwal pembayaran Finance. | Stockout; pembelian mendesak; ketepatan pemasok. |
| Warehouse/logistik | Stok fisik, reserved, tersedia, dan dalam perjalanan bercampur; picking/penerimaan tertunda. | Antrean pengiriman/penerimaan, lokasi sumber/tujuan jelas, barcode bila dibutuhkan, pemeriksaan selisih, serta transfer yang bisa ditelusuri. | Menjaga janji Sales, mencatat penerimaan Procurement dan bukti untuk Finance. | Akurasi stok; waktu picking; selisih transfer. |
| Finance | Follow-up dokumen tersebar; barang diterima belum ditagih; piutang terlambat; sumber saldo sulit ditelusuri. | Aging piutang/utang, penerimaan belum ditagih, pencocokan dokumen, draft tindak lanjut, serta ringkasan keuangan per periode. | Sales untuk piutang; Procurement/gudang untuk tagihan vendor; Owner untuk keputusan. | Jeda kirim→invoice; piutang jatuh tempo; pekerjaan rekonsiliasi terbuka. |
| Cashier | Sesi/lokasi tidak jelas, katalog berlebih, pembayaran/selisih kas perlu ditindaklanjuti. | Sesi aktif yang tegas, menu/varian mudah dicari, metode bayar jelas, stok gerai dan panduan tutup sesi. | Gudang menambah stok; Finance memeriksa setoran/selisih; Owner menyetujui pengecualian. | Waktu transaksi; pembatalan/koreksi; selisih sesi. |
| Dapur/produksi/QC | Penjualan menu belum menggambarkan pemakaian bahan, yield, waste, atau kedaluwarsa. | Tahap lanjutan: resep/BOM, konversi satuan, batch/expiry, FEFO dan catatan produksi/limbah. | Procurement merencanakan bahan; gudang menyimpan; Finance mengukur biaya. | Waste; akurasi bahan; margin menu. |

HR/payroll, maintenance, marketing campaign, dan dukungan pelanggan menyeluruh merupakan cakupan lanjutan. Untuk expo ini, tampilkan perjalanan operasional F&B yang utuh dan dapat diuji.

### Pusat tindak lanjut lintas departemen

Usulan paling bernilai adalah satu daftar pekerjaan, bukan notifikasi tanpa penanggung jawab. Setiap item memiliki **masalah → sumber dokumen → dampak → tim/PIC → tenggat → terhambat oleh siapa → tindakan berikutnya → bukti selesai**.

Contoh: “SO belum bisa dikirim: WH-JKT kekurangan 8. WH-BDG memiliki 12 tersedia. Gudang meninjau transfer 8; Sales diberi status menunggu transfer; Finance menerima invoice setelah pengiriman tervalidasi.”

Versi ringan sebelum expo dapat dimulai sebagai antrean pengecualian yang dihitung dari status dokumen, dengan tautan tindakan. Penugasan personal, SLA, eskalasi, dan notifikasi tersimpan dapat ditambahkan sesudahnya. Catatan dokumen dan riwayat yang sudah ada merupakan sumber pendukung, tetapi belum sama dengan sistem penugasan kerja.

## 6. Peningkatan AI yang paling berdampak

1. **Peka terhadap halaman dan dokumen.** Dari SO tertentu, “kenapa belum terkirim?” langsung merujuk SO itu. Konteks harus diverifikasi di backend sesuai perusahaan/peran/lokasi; angka penting tetap diambil dari database.
2. **Tool agregat untuk keputusan.** Tambahkan ringkasan keuangan per periode, risiko pemenuhan order, PO terlambat, aging invoice, dan penerimaan belum ditagih. Tool saat ini belum mencakup semua ini. Hasil pencarian 5–10 baris tidak boleh digunakan sebagai total seluruh bisnis.
3. **Prioritas dengan alasan dan sumber.** Tampilkan nomor dokumen, lokasi, periode, waktu data diperiksa, jumlah hasil, dan batas hasil. Pisahkan temuan faktual dari asumsi dan rekomendasi.
4. **Rencana kerja beberapa langkah yang dapat ditinjau.** Cari sumber pasokan → susun opsi transfer/pembelian → siapkan draft → serahkan kepada pengguna yang berwenang. Pembuatan draft dan konfirmasi transaksi tetap dibedakan.
5. **Satu kebijakan stok.** UI sekarang memakai ambang total 20; AI memakai default available ≤10 dengan target 30. Tetapkan kebijakan per SKU/lokasi dengan dasar permintaan, lead time dan safety stock; semua layar/tool membacanya.
6. **Riwayat percakapan yang berlanjut.** Widget menyimpan pesan dalam state halaman, sehingga perpindahan halaman dapat menghilangkan percakapan. Simpan thread terikat pengguna/perusahaan dan pulihkan konteks pekerjaan tanpa mencampur perusahaan.
7. **Pemantauan otomatis yang relevan.** Tahap berikutnya: aturan kejadian/jadwal mendeteksi stok atau dokumen bermasalah; AI merangkum sebab dan pilihan tindakan. Saat ini briefing masih diminta pengguna dan scheduler belum dikonfigurasi.
8. **Evaluasi tugas dan antrean.** Catat keberhasilan tool, akurasi pemilihan SKU, perbaikan pengguna, waktu respons dan waktu menunggu. Satu run global saat ini membuat permintaan lain ditolak sementara; belum tersedia antrean multi-staf.

Model 4B dan Mac 8 GB cukup untuk pilot terbatas. Menaikkan ukuran model atau menambah banyak agent bukan prioritas enam hari ini. Ketepatan tool, konteks, dan kualitas data lebih dahulu menentukan kualitas keputusan. Evaluasi dan pengawasan manusia selaras dengan [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework).

## 7. Desain: pertahankan identitas, perbaiki keterbacaan dan hirarki

| Aspek | Penilaian aktual | Usulan |
|---|---|---|
| Halaman Owner | Hero sambutan dan katalog modul mengambil area utama. Aksi Buka POS menonjol. | Di atas: KPI ringkas + “3 hal yang perlu perhatian” + satu tindakan utama. Katalog modul menjadi bagian berikutnya. Aksi utama mengikuti peran. |
| Font | Stack Inter sudah sesuai aplikasi data. Tabel memakai token 15px; header 13px. | Pertahankan satu keluarga font. Usulan desktop: body 16px, tabel 14–16px, label penting 13–14px, judul 24–28px, KPI 28–36px. Sesuaikan ruang dan uji proyektor. Ini pilihan desain, bukan minimum ukuran font WCAG. |
| Teks bantuan | Helper formulir terukur 10px, warna #94A3B8 di permukaan putih. Beberapa elemen chatbot 9–12px. | Helper penting 12–14px dan warna lebih gelap. Untuk demo jarak jauh, utamakan layar ringkas dengan label/angka yang lebih besar. |
| Kontras | #94A3B8 di putih sekitar **2,56:1**; #64748B di putih **4,76:1**; #4338CA di #F1EFFF **6,97:1**. | Ganti teks pucat yang bermakna; pertahankan pasangan yang lulus. Teks normal umumnya memerlukan ≥4,5:1 menurut WCAG, dengan pengecualian sesuai kriteria. |
| Warna | Biru–ungu sudah konsisten; permukaan data terang membantu baca angka. | Batasi aksen kuat untuk tindakan/penekanan utama. Hijau untuk selesai/baik, amber untuk perhatian, merah untuk hambatan; sertakan label dan ikon agar makna tidak bergantung warna. |
| Layout dokumen | Pemilih dokumen dan daftar dokumen sama-sama tampil, lalu rincian panjang di bawah. Dokumen terbaru dapat langsung terpilih walau cancelled. | Daftar → rincian dengan status dan tindakan berikutnya terlihat. Detail melalui drawer atau layar yang fokus. Bedakan dibatalkan dari tahapan aktif. |
| Input produk | Placeholder mengajak mengetik nama menu, tetapi pencocokan handler memakai SKU; saran juga berupa SKU. | Combobox mencari nama/SKU dan menampilkan varian, satuan, harga. Identitas tersimpan tetap SKU. Pesan instruksi sesuai kemampuan yang tersedia. |
| Form baru | Form penjualan langsung memilih pelanggan pertama, produk pertama, kuantitas 2. | Minta pilihan pelanggan/produk secara sadar, kecuali ada konteks awal yang sah, misalnya dari lead tertentu. Hindari data contoh tersimpan tanpa disengaja. |
| Label form berulang | ID input/label pada baris item memakai nama tetap di dalam loop. | Gunakan ID unik per baris agar label dan navigasi pembaca layar menunjuk input yang benar. |
| POS | Tanpa sesi terpilih, strip masih menampilkan “SESI AKTIF POS01”, sementara status CLOSED. | Tampilkan “Belum ada sesi aktif”; tindakan utama Buka sesi. Riwayat sesi tertutup menjadi tampilan berbeda. |
| Navigasi | Sidebar panjang; ada Produk & Menu serta Kelola Produk; bahasa Indonesia/Inggris dan kode rubrik bercampur. | Kelompokkan berdasarkan pekerjaan; pisahkan pengaturan/master. Gunakan istilah Indonesia konsisten dengan istilah teknis opsional. Pindahkan panel rubrik/T-xx/SR-xx ke area QA, tetap beri label data simulasi. |
| Pencarian | Command-K mencari halaman, belum mencari SO/invoice/SKU. | Tulis “Cari halaman” dengan jujur; tahap selanjutnya pencarian dokumen/produk dengan filter akses dan tautan langsung. |
| Animasi | Token masuk halaman 1000ms dan chart masuk 1600ms; dukungan reduced motion sudah ada. | Usulan: masuk halaman 180–250ms, respons klik/hover 120–180ms, chart 400–700ms saat pertama tampil. Update angka tidak perlu mengulang animasi besar. Pertahankan reduced motion. |
| Kecepatan/ketersediaan | Font dimuat lewat Google Fonts; halaman mengambil daftar penuh lalu memaginasi di browser. | Simpan font lokal untuk demo; perbesar data nanti dengan filter/paginasi server. Tampilkan loading, gagal memuat, dan kosong secara berbeda. |
| Status kerja AI | Panel kecil cocok untuk bantuan singkat; pekerjaan kompleks memerlukan rincian dan konteks. | Pertahankan launcher kecil. Sediakan panel lebih lebar/ruang asisten untuk rencana panjang, langkah nyata yang sedang berlangsung, sumber, dan kartu tindakan. Jangan membuat kemajuan palsu berbasis timer. |

Untuk sentuhan operator, ukuran sekitar 44px adalah rekomendasi kenyamanan. WCAG 2.2 AA untuk target minimum adalah 24 × 24 CSS px dengan ketentuan pengecualian/jarak, bukan kewajiban universal 44px. Lihat [kontras W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) dan [target sentuh W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Pemeriksaan ini bukan sertifikasi aksesibilitas penuh.

## 8. Masalah kecil yang bisa menjadi hambatan besar

- **Stok total tampak aman tetapi gerai hampir kosong.** Ringkasan kini memakai total perusahaan. Tampilkan tersedia/threshold per lokasi; jangan hanya total on-hand.
- **Barang ada tetapi sudah dijanjikan kepada pelanggan lain.** Gunakan available, bukan on-hand, dalam janji penjualan dan usulan transfer. Guard transfer sudah ada; tampilannya harus sama jelas.
- **Jam/tanggal tidak seragam.** Default tanggal chart dan tanggal prompt memakai ISO UTC. Saat audit sudah 15 November WIB, filter default sempat menunjukkan 14 November. Gunakan zona waktu bisnis yang konsisten dan cantumkan periode.
- **Pengguna melihat kosong ketika sebenarnya sedang memuat atau gagal.** Ada halaman yang awalnya menampilkan tidak ada data sebelum request selesai; beberapa fetch tidak menampilkan pesan gagal. Bedakan tiga keadaan ini.
- **Pemilihan produk membingungkan.** Menu sama dengan varian hot/iced harus jelas; label nama bebas tidak boleh menjanjikan pencarian nama bila yang diterima hanya SKU.
- **Persetujuan tidak jelas.** “Tidak perlu persetujuan” berbeda dari “Disetujui Owner”. Status dan siapa yang menyetujui sebaiknya mengacu bukti tindakan, bukan satu boolean saja.
- **Catatan tersebar tanpa penerima/tenggat.** Notes/audit berguna untuk jejak, tetapi belum mengantarkan tugas ke tim berikutnya.
- **Kategori POS tidak mengikuti master.** Filter masih memakai awalan SKU/nama untuk kopi/teh/dll. Gunakan kategori master agar menu baru seperti matcha tidak salah dikelompokkan.
- **QRIS sebagai label metode bayar disangka integrasi pembayaran.** Source yang diperiksa mencatat metode, belum membuktikan callback/rekonsiliasi payment gateway. Presentasikan sesuai kemampuan yang benar-benar terhubung.
- **Bahan baku dan produk jadi belum terhubung.** Model saat ini belum memiliki resep/BOM, batch dan expiry, atau rasio konversi satuan. Penjualan menu tidak otomatis membuktikan konsumsi seluruh bahan resep.

## 9. Rencana enam hari menuju 21 November

| Tanggal | Fokus realistis | Hasil yang harus bisa ditunjukkan |
|---|---|---|
| 15 Nov | Bekukan cakupan; tangani E01–E03; tentukan satu cerita demo dan dataset terpisah. | Dashboard terbuka; guard lokasi kasir; perencanaan stok tidak menyesatkan antar-lokasi. |
| 16 Nov | Uji negatif dan alur stok; satukan arti threshold/available; perbaiki input pelanggan/produk yang paling membingungkan. | Bukti sebelum/sesudah untuk 3 penghambat utama; tidak ada stok negatif atau dokumen ganda pada skenario demo. |
| 17 Nov | Ringkasan prioritas Owner dan tautan tindak lanjut berbasis data yang tersedia. | Owner tahu masalah, alasan, dan siapa yang perlu bertindak tanpa berpindah banyak menu. |
| 18 Nov | Integrasi asisten dengan satu tugas nyata, sumber yang jelas, dan kartu draft. | AI membantu memutuskan transfer/pembelian, pengguna meninjau, hasil bisa dibuka dan ditelusuri. |
| 19 Nov | Perbaikan desain terarah, label, font kontras, kecepatan animasi, loading/error; uji oleh 2–3 orang. | Tugas utama dapat diselesaikan orang lain tanpa penjelasan terus-menerus dari pembuat. |
| 20 Nov | Gladi bersih memakai perangkat/ukuran layar acara; ukur tugas dan siapkan rekaman cadangan. | Demo utama konsisten; layanan lokal, font, dan model siap; data simulasi tertata. |
| 21 Nov | Jalankan demo yang dibekukan. | Cerita bisnis, bukti proses, dan batas pilot tersampaikan dengan jelas. |

Ini usulan urutan, bukan jaminan semua pengembangan selesai dalam satu hari per baris. Jika E01–E03 memakan waktu lebih lama, kurangi pengembangan baru. Alokasi otomatis semua gudang, model lebih besar, scheduler lengkap, integrasi WhatsApp, HR, serta fitur produksi lengkap masuk pilot sesudah expo.

## 10. Bukti manfaat yang perlu diukur

| Ukuran | Cara ukur |
|---|---|
| Waktu menyiapkan penawaran/transfer/RFQ | Bandingkan tugas dan data yang sama melalui form dan bantuan AI; lakukan beberapa pengulangan, laporkan median dan jumlah sampel. |
| Tingkat koreksi | Catat SKU, kuantitas, harga, lokasi atau mitra yang diperbaiki sebelum simpan. |
| Keberhasilan AI | Tugas menghasilkan data/draft yang benar, mengikuti izin, dan selesai; jawaban teks meyakinkan saja tidak cukup. |
| Waktu tunggu | Pisahkan waktu model, antrean, dan langkah pengguna; ukur persentil 95 setelah sampel memadai. |
| Kecepatan antar-tim | Ukur waktu menunggu persetujuan, picking, penerimaan, invoice, dan pembayaran dari kejadian yang tercatat. |
| Stok dan pemasok | Kejadian stockout per lokasi, selisih opname, waste/expiry, serta keterlambatan pemasok. Beberapa memerlukan data baru. |

Contoh hitung manfaat untuk diskusi, **bukan hasil proyek**: 5 menit hemat per tugas × 20 tugas/hari × 22 hari = sekitar 36,7 jam/bulan. Nilai uang memerlukan biaya staf yang nyata dan asumsi adopsi yang dijelaskan. Hindari mengklaim persentase penghematan yang belum diukur.

## 11. Rujukan source untuk tindak lanjut

| Topik | Titik pemeriksaan |
|---|---|
| Registrasi/controller chart | `src/components/DashboardCharts.tsx:39`, `src/components/ui/AnimatedChart.tsx` |
| Batas lokasi kasir | `src/lib/posEngine.ts:42`, `src/lib/posEngine.ts:95`, route POST sesi/order POS |
| PO yang dikurangkan dari restock | `src/lib/agent/tools.ts:79` |
| Data banyak lokasi | `prisma/schema.prisma:172`, `prisma/schema.prisma:185` |
| Transfer atomik dan idempotensi | `src/lib/transferEngine.ts:106` |
| Reservasi tetap gudang utama | `src/lib/salesEngine.ts:283` |
| Tujuan receipt dari konfirmasi PO | `src/lib/purchaseEngine.ts:146` |
| Tabel stok dan status total | `src/app/inventory/products/page.tsx:290`, `src/app/api/products/route.ts:35` |
| Threshold chart 20 | `src/lib/dashboardEngine.ts:472` |
| Satu run AI global | `src/lib/agent/capabilities.ts:20` |
| Cakupan tool AI | `src/lib/agent/tools.ts`; belum ada tool ringkasan keuangan/PIC/SLA lengkap |
| Riwayat panel | `src/components/ChatbotWidget.tsx`, `messages` state dan `session` ref |
| Form contoh dan saran SKU | `src/components/CreateSalesOrderModal.tsx:55`, `:125`, `:310` |
| Tipografi/motion/font eksternal | `src/app/globals.css:1`, `:19`, `:23`; `ChatbotWidget.module.css` |
| Laporan keuangan yang sudah ada | `src/app/accounting/reports/page.tsx`, `src/app/api/accounting/reports/route.ts` |
| Reproduksi probe | `python3 scripts/verify_isolated.py --suites test_expo_operational_audit` |

Uji probe mengembalikan exit 0 ketika proses observasi berjalan sesuai rencana; lihat verdict PASS/GAP/LIMITATION dalam JSON untuk menilai produknya. Source script menolak berjalan di folder aplikasi asli.
