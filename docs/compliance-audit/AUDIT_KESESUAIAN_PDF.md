# Audit kesesuaian ERP terhadap PDF tugas

Tanggal audit: 6 November 2026. Proyek: ERP_Food-Beverage.
Acuan: `/Users/felix/Downloads/24SI1 - Group 03 - Food and Beverage.pdf`, 34 halaman.

## Kesimpulan

**Sebagian besar fondasi dan modul tersedia, tetapi aplikasi belum dapat dinyatakan sepenuhnya sesuai atau siap penilaian.** Ada kekurangan alur wajib dan pelanggaran business rule yang berhasil direproduksi. Tema biru/ungu serta animasi tidak bertentangan dengan tugas: PDF halaman 15 dan legenda wireframe membebaskan warna, branding dan styling. Yang wajib dipertahankan adalah struktur, field, relasi, fungsi, dan kontrol bisnis.

Audit ini memeriksa isi PDF, seluruh peta layar, source code terkait transaksi, dokumen penyerahan, serta pengujian pada salinan database. Kode aplikasi dan database asli tidak diubah. Artefak audit disimpan di direktori ini.

## Metode dan batas bukti

- PDF diekstrak dengan Poppler. Seluruh ketentuan SR/F/T dan paket penyerahan dibaca; halaman wireframe 16–31 dirender untuk pemeriksaan struktur.
- Tujuh suite bawaan dijalankan ulang: **128/128 assertion lulus** (112 assertion business flow + 16 chart/API). Ini bukan 128 test case PDF: PDF memiliki 32 T-case.
- Ditambahkan **14 probe terarah**, masing-masing dimulai dengan fresh seed: **1 sesuai, 13 menemukan ketidaksesuaian**. Ini pengujian tambahan audit, bukan perubahan hasil historis T-01–T-32.
- Beberapa probe memanggil fungsi transaksi; A01/A02/A03/A14 juga memanggil handler API Next.js langsung dengan request lokal dan identitas uji. Tidak memakai server publik atau HTTP jaringan; cakupan ini tidak menguji middleware, cookies browser, maupun deployment.
- TypeScript `npx tsc --noEmit` lulus setelah probe dibetulkan sesuai kontrak `orderedQty` fungsi pembelian. Tidak mengubah kode produksi untuk meloloskan pengujian.
- Server lokal tidak dapat dibuka dalam sandbox, dan permintaan menjalankannya di luar sandbox tidak disetujui. Tidak ada klaim pengujian browser live atau URL publik.
- SHA-256 seluruh database asli sebelum/sesudah audit identik. Reset, seed, dan transaksi audit hanya dilakukan pada `docs/compliance-audit/audit.db`.

Bukti mentah: `regression-results.json`, `probe-results.json`, `probe.log`, `test_phase*.log`, `test_charts.log`, `typecheck.log`. Probe dapat dijalankan ulang dengan Node import loader pada salinan database; jangan menunjuknya ke database utama.

## Kekurangan utama, urut dampak

### 1. Alur Procure-to-Pay berhenti sebelum pembayaran vendor — wajib diperbaiki

PDF halaman 2, 6, 31–32: kedua alur harus sampai pembayaran. SR-19 juga menyebut invoice/bill. Model pembayaran memiliki relasi vendor/bill, tetapi implementasi endpoint dan form pembayaran hanya menangani Customer Invoice.

**A14:** setelah PO, accepted receipt, dan Vendor Bill Rp96.000 diposting, permintaan pembayaran dengan `billId` ditolak HTTP 400: `invoiceId dan amount pembayaran wajib disertakan.` Tidak ada fungsi registerVendorPayment yang ditemukan. Tombol/link ke daftar tagihan bukan bukti pembayaran vendor.

Sumber: [payments API](../../src/app/api/accounting/payments/route.ts:34), [payment page](../../src/app/accounting/payments/page.tsx:30), [customer payment engine](../../src/lib/accountingEngine.ts:275).

Perbaikan: tambahkan pembayaran vendor, partial payment/outstanding, jurnal Dr A/P–Cr Bank, kontrol overpayment, audit, dan demonstrasi alur P2P utuh.

### 2. Produk bebas dapat menciptakan stok tanpa transaksi sumber — kritis

API POS dan sales membuat produk yang belum dikenal dengan stok bawaan 100/50 atau 100/100. Pencarian berdasarkan nama juga ambigu untuk Hot/Iced atau ukuran dengan nama produk yang sama. Proses pembuatan stok terjadi sebelum validasi transaksi inti dan di luar transaksinya.

**A03:** request POS dengan sesi tidak valid menghasilkan HTTP 400, tetapi company stock naik **616 → 816**. Tidak ada penerimaan/pembukaan persediaan dan jurnal sumber yang mengimbangi tambahan tersebut. Bertentangan dengan integrasi persediaan/ledger dan SR-13/SR-17/SR-20 (halaman 5–7).

Sumber: [POS API](../../src/app/api/pos/orders/route.ts:68), [sales API](../../src/app/api/sales/orders/route.ts:72).

Perbaikan: identifikasi variant dengan SKU, jangan auto-mint stok ketika mengetik nama, dan buat perubahan master/stock hanya melalui alur sah yang atomik serta diaudit.

### 3. POS bisa menghasilkan stok negatif — kritis

**A04:** Hot CAFE awal 24; keranjang mempunyai dua baris SKU sama, masing-masing 15. Masing-masing baris diperiksa terhadap 24 sebelum pengurangan stok. Transaksi diterima dan stok menjadi **−6**. SR-04/F-16 melarang ini (halaman 4, 14, 29).

Sumber: [POS engine](../../src/lib/posEngine.ts:122).

Perbaikan: gabungkan permintaan per SKU/lokasi atau validasi kuantitas kumulatif sebelum melakukan seluruh stock move; lindungi reserved juga.

### 4. Pengiriman dapat melampaui ordered quantity dan menghabiskan reservasi — kritis

**A12:** SO delapan unit dapat dikirim sembilan unit; tidak ada guard `deliveredQty <= orderedQty`.

**A13:** fixture dibuat seperti pola T-12 pada script proyek: quotation 38 unit dan draft DO tanpa konfirmasi/reservasi order tersebut. Pada fresh seed (on-hand 40, reserved 6), validasi 38 diterima; hasil **on-hand 2, reserved −32**. Engine menganggap `orderedQty` selalu benar-benar telah direservasi, dan tidak mensyaratkan SO confirmed. Ini membuktikan jalur dokumen draft dapat mengonsumsi reservasi SO lain. Bukan klaim bahwa setiap pengiriman SO yang dikonfirmasi akan gagal.

Sumber: [delivery engine](../../src/lib/deliveryEngine.ts:74).

Perbaikan: verifikasi lifecycle dan kepemilikan reservasi yang benar, tolak over-delivery, reserved negatif, SKU/line yang tidak cocok, dan pengulangan baris.

### 5. Invoice bisa menagih lebih banyak daripada delivered — kritis

**A10:** lima unit delivered, lalu invoice dibuat dengan dua baris SKU sama (5 + 5). Keduanya lolos karena pembatasan diterapkan per baris tanpa mengakumulasi request. Invoice sepuluh unit dapat diposting. SR-02/F-09/T-20 menuntut maksimal delivered yang belum ditagih (halaman 3, 13, 25).

Sumber: [invoice validation](../../src/lib/accountingEngine.ts:58), [posting](../../src/lib/accountingEngine.ts:143).

Perbaikan: akumulasi kuantitas per SO line/SKU dan cek ulang atomik saat posting, termasuk draft lain/concurrent requests.

### 6. Three-way match belum mengunci harga PO — tinggi

SR-06 secara eksplisit mensyaratkan unit price sesuai Purchase Order (halaman 4).

**A06:** PO harga Rp12.000, accepted delapan unit; Vendor Bill memakai harga Rp99.000 tetap berhasil diposting senilai **Rp792.000**, seharusnya **Rp96.000**. Akun GRNI yang dibersihkan ikut menyimpang. Guard accepted quantity memang bekerja untuk skenario dasar, tetapi belum memvalidasi harga.

Sumber: [vendor bill price](../../src/lib/purchaseEngine.ts:444).

### 7. Retur mengabaikan diskon dan dapat dilakukan melebihi penjualan — kritis

**A07:** invoice mempunyai diskon 10%; nilai satu unit yang semestinya dikembalikan net Rp43.200 + PBJT Rp4.320 = **Rp47.520**. Credit Note aktual **Rp52.800** karena menggunakan unit price sebelum diskon.

**A08:** invoice lima unit/gross Rp264.000 dapat diretur lima unit dua kali melalui dua request berbeda; total credit **Rp528.000**. Limit hanya membandingkan satu request dengan invoice, tanpa menjumlah retur sebelumnya. Outstanding di-clamp ke nol sehingga kelebihan pembalikan ledger tidak otomatis terlihat dari sisa invoice.

Melanggar SR-11/F-18 (halaman 4, 14, 30). Retur tanpa accepted sudah diblokir pada skenario dasar, tetapi kontrol nilai/kumulatif belum aman.

Sumber: [return creation](../../src/lib/returnEngine.ts:29), [return posting](../../src/lib/returnEngine.ts:204).

### 8. Draft invoice dapat mengurangi credit exposure sebelum diposting — tinggi

**A09:** exposure C01 **Rp1.622.400 → Rp1.358.400** hanya karena pembuatan draft invoice, tanpa pembayaran dan tanpa posted A/R. Perhitungan uninvoiced mengurangi semua invoice non-cancelled, sedangkan open receivable hanya memasukkan invoice POSTED. Ini membuka headroom palsu Rp264.000. SR-09/F-10 (halaman 4, 11, 13).

Sumber: [credit control](../../src/lib/creditControl.ts:56).

### 9. Otorisasi tidak konsisten dan role switch terlalu bebas — tinggi

**A01 sesuai:** Cashier ditolak HTTP 403 pada Journal Entries. Endpoint General Ledger juga memiliki guard dan audit penolakan.

**A02 gagal:** identitas Cashier dapat membuat Sales Quotation melalui handler `/api/sales/orders`, respons HTTP 200 dan S00007 tercipta. Route hanya memeriksa login, bukan role Sales/Owner.

Temuan source review terpisah: `/api/auth/switch-role` membuat token target tanpa memblokir `prevUser` null atau membatasi pemanggil. Jadi batas role dapat dihindari melalui fasilitas ganti akun; belum diverifikasi melalui HTTP jaringan. Perlu dipisahkan sebagai demo-only yang dibatasi, bukan diberikan tanpa kontrol pada aplikasi penilaian/publik. Dashboard metrics/reconciliation juga tidak memeriksa sesi di handler.

PDF halaman 5, 11, 31 mensyaratkan role dan otorisasi, bukan sekadar menu terkunci.

Sumber: [sales API](../../src/app/api/sales/orders/route.ts:30), [switch-role API](../../src/app/api/auth/switch-role/route.ts:10), [role policy](../../src/lib/auth.ts:76).

### 10. Bukti stock move untuk POS/transfer/return belum lengkap — sedang/tinggi

**A05:** POS berhasil, saldo stok dan jurnal berubah, tetapi jumlah StockMove tetap **0 → 0**. `stockMovements` hanya array respons, tidak direkam ke tabel. Transfer dan return juga tidak menulis StockMove pada engine; audit snapshot tetap ada.

PDF T-13/T-27/T-29 meminta bukti stock moves dan valuation trace (halaman 22, 29–30). Payment method dan amount POS sudah tersimpan di PosOrder; PDF tidak mewajibkan model Payment terpisah jika bukti pembayaran ekuivalen dapat ditelusuri. Masalah terkonfirmasi di sini adalah ketidaklengkapan jejak pergerakan persediaan permanen.

### 11. Close POS ulang memberikan selisih kas berbeda — sedang

**A11:** modal kas awal Rp100.000, satu penjualan QRIS Rp33.000, closingCash Rp100.000. Close pertama menghasilkan selisih **0**, retry menghasilkan **−Rp33.000**. Jalur retry memakai totalSales, sedangkan jalur pertama memakai cashSales saja. Tidak ada bukti double-journal dalam kasus ini, tetapi ringkasan hasil tidak konsisten (SR-14/F-17).

Sumber: [session closing](../../src/lib/posEngine.ts:317).

### 12. CRM backend tersedia, tetapi alur pengguna belum utuh — sedang

Halaman CRM dapat menampilkan Kanban dan membuat lead. Pada source halaman tidak ditemukan handler pindah tahap, form edit kartu, atau tombol buat quotation dari lead; kartu memakai cursor-pointer tanpa aksi. Backend PATCH dan field leadId pada engine tersedia, tetapi modal Sales tidak menyediakan leadId. Alur Lead → Opportunity → Quotation yang tertaut belum dapat ditunjukkan melalui UI normal (F-04/SR-16, halaman 5–6, 12, 19). Tombol QA yang mengubah stage bukan pengganti workflow pengguna.

### 13. Dashboard dan related-document trace perlu dilengkapi — sedang

Stok, valuation, A/R, A/P, Bank, lead, SO dan PO tersedia dari sumber data. Mismatch dan larangan auto-post juga lulus tes dasar. Namun UI belum menampilkan KPI PBJT dan POS revenue yang eksplisit; field Reporting Date/Dataset pada S-16 juga tidak tampil lengkap. `sourceTrail` rekonsiliasi berisi string baseline tetap, bukan daftar dokumen transaksi aktif; banyak smart-link menuju halaman modul tanpa memilih dokumen sumber. Ini baru sebagian memenuhi SR-20/F-20/F-21 (halaman 6, 14, 31).

## Matriks seluruh fitur PDF

Status “dasar terbukti” berarti assertion dasar yang relevan lulus dan implementasi ditemukan; bukan sertifikasi seluruh UI/deployment atau seluruh kombinasi input.

| F | Prioritas | Status audit | Catatan |
| --- | --- | --- | --- |
| F-01 Navigasi/otorisasi | Must | Sebagian | Delapan app dan penolakan GL ada; A02 dan role switch perlu diperbaiki. |
| F-02 Kontak/kredit | Must | Dasar terbukti | Data C01/C02 dan headroom baseline sesuai; F-10 memiliki celah draft. |
| F-03 Variant SKU | Must | Sebagian | 15 SKU dan stok lokasi sesuai seed; fallback by-name dan auto-stock berisiko melanggar identitas varian. |
| F-04 CRM | Should | Sebagian | Kanban dan validasi API ada; transisi tahap dan quotation link UI belum utuh. |
| F-05 Quotation/SO | Must | Dasar tersedia, belum aman | Multi-line, sequence, confirmation ada; role/validasi dan integrasi perlu perbaikan. |
| F-06 Diskon/price lock | Must | Dasar terbukti | Approval >10% dan lock sesudah Confirmed lulus T-10; butuh validasi menyeluruh jalur edit. |
| F-07 Reservation | Must | Belum sesuai menyeluruh | A12/A13 memperlihatkan pelanggaran reserved. |
| F-08 Delivery/backorder | Must | Sebagian | Pengiriman parsial 5/8 dan BO3 lulus; over-delivery/lifecycle belum aman. |
| F-09 Delivered invoicing | Must | Belum sesuai menyeluruh | T-19/T-20 dasar lulus, A10 loloskan 10 invoice untuk 5 delivered. |
| F-10 Credit control | Must | Belum sesuai menyeluruh | A09 menunjukkan draft mengurangi exposure. |
| F-11 RFQ/PO | Must | Dasar terbukti | Confirm dan retry tidak menambah stok/receipt ganda dalam test dasar. |
| F-12 Accepted receipt | Must | Dasar terbukti | Accepted8/rejected2, stok dan GRNI +96000 sesuai. |
| F-13 Three-way bill | Must | Sebagian | Kuantitas accepted/billed dibatasi, harga PO tidak dikunci (A06). |
| F-14 Ledger/COGS | Must | Sebagian | Jurnal dasar seimbang; celah transaksi sumber bisa membuat nilai salah walaupun Dr=Cr. |
| F-15 Partial payment | Must | Sebagian | Customer Rp100000/outstanding Rp164000 dan guard overpay lulus; bill vendor belum bisa dibayar. |
| F-16 POS | Must | Belum sesuai menyeluruh | T-27 dasar lulus; A03/A04 menunjukkan stok palsu/minus; trace belum lengkap. |
| F-17 Close session | Must | Sebagian | Retry tidak double-post; selisih kas retry berbeda (A11). |
| F-18 Return/Credit Note | Must | Belum sesuai menyeluruh | Accepted/pending dasar lulus; diskon dan kumulatif retur salah (A07/A08). |
| F-19 Transfer | Must | Dasar terbukti/sebagian bukti | Perpindahan 4 Iced dan blokir28 lulus; StockMove permanen belum ditulis. |
| F-20 Dashboard | Should | Sebagian | KPI baseline lulus; tampilan POS/PBJT dan source detail perlu lengkap. |
| F-21 Audit/relations | Must | Sebagian | Audit terstruktur ada; before-after tidak konsisten pada seluruh perubahan, trace sumber tidak selalu langsung. |
| F-22 PBJT | Must | Dasar terbukti/sebagian | Per-line PBJT10% dan fixture tax0 benar; reversal pajak retur diskon terlalu besar. |
| F-23 Loyalty | Optional | Tidak wajib | Boleh ditunda; tidak menggantikan kekurangan Must. |

## Matriks 16 layar dan struktur wireframe

Halaman ada bukan berarti seluruh field/aksi/bukti telah memenuhi. Ini hasil source review, bukan screenshot acceptance dari browser berjalan.

| S asli PDF | Route | Penilaian |
| --- | --- | --- |
| S-01 Home/App Switcher | `/` | Delapan aplikasi dan company/user ada; pembatasan role perlu diperbaiki backend. |
| S-02 Contacts | `/sales/contacts` | Contact dan credit overview ada; tidak ada control panel search/filter/group-by lengkap. |
| S-03 Product/SKU | `/inventory/products` | Form stok per lokasi dan tabel ada; pencarian/sort/pagination tersedia. |
| S-04 CRM Kanban | `/crm/leads` | Kolom dan kartu ada; edit stage/detail/lead-to-quotation perlu diwujudkan. |
| S-05 Quotation/SO | `/sales/orders` | Header, status, lines/tax, approval/confirm ada. |
| S-06 Delivery/BO | `/inventory/delivery` | Detail kirim/BO ada; koreksi guard bisnis. |
| S-07 Internal Transfer | `/inventory/transfers` | Form dan validasi tersedia; lengkapi movement trace. |
| S-08 RFQ/PO | `/purchase/orders` | Detail vendor/lines/status/confirm tersedia. |
| S-09 Receipt/QC | `/inventory/receipts` | Accepted/rejected dan validasi tersedia. |
| S-10 Customer Invoice | `/accounting/invoices` | Create/post/tax/link SO tersedia; koreksi kuantitas kumulatif. |
| S-11 Vendor Bill | `/accounting/vendor-bills` | Detail match/post ada; harga dan pembayaran belum selesai. |
| S-12 Register Payment | `/accounting/payments` | Customer-only; belum vendor bill. |
| S-13 Journal/GL | `/accounting/journal-entries` | Tabel journal dan filter tersedia; izin GL dasar sesuai. |
| S-14 POS | `/pos` | Basket/table/payment method/session tersedia; stok/trace/session retry perlu koreksi. |
| S-15 Return/CN | `/inventory/returns` | Inspection/credit note tersedia; diskon dan batas retur perlu koreksi. |
| S-16 Dashboard | `/dashboard` | Metrik/reconciliation ada; metadata, KPI POS/PBJT dan smart-links belum lengkap. |

Odoo control panel search/filter/group-by dan Log Notes/document relations harus diaudit per layar: keberadaan sidebar atau satu drawer audit global saja belum otomatis membuktikan seluruh struktur wireframe. Kode/properti wireframe dan sebagian dokumentasi proyek menukar S-02/S-03/S-04/S-05; gunakan tabel asli di atas saat membuat bukti penilaian.

## Kualitas dan cakupan test bawaan

Assertion yang lulus membuktikan skenario yang memang diperiksa, bukan seluruh requirement. Temuan penting:

1. PDF halaman 7/15 mewajibkan fresh seed per T-case independen. Sejumlah script hanya seed pada awal suite. Contoh `scripts/test_phase4.ts`: T-12 berjalan setelah T-11, on-hand sudah 35; akibatnya permintaan38 ditolak karena stok fisik, bukan benar-benar menguji on-hand40/reserved6/available34 dari PDF. A13 memakai pola DO draft yang sama pada fresh seed dan menunjukkan celah yang sebelumnya tertutup oleh fixture.
2. T-08 pada beberapa test membangun ulang validasi dengan kondisi lokal, bukan menguji semua interaksi UI. Keberhasilan tes tidak membuktikan kartu Kanban dapat dipindah melalui layar.
3. T-27 tidak memeriksa keberadaan StockMove persisten atau duplicate-SKU basket. T-29 tidak menguji diskon maupun retur kumulatif.
4. Tidak ada suite yang membuktikan vendor payment end-to-end.
5. Laporan lama mengklaim 32/32 case lulus; klaim ini perlu diberi batas cakupan dan dilengkapi temuan audit. **Jangan menyimpulkan “100% sesuai PDF” dari 128 assertion lulus.**

## Paket penyerahan dan deployment

| Ketentuan (PDF halaman 2–3, 31–34) | Bukti lokal | Status |
| --- | --- | --- |
| Public deployed URL aktif untuk grading | Checklist masih menyatakan pending deploy; URL belum diberikan saat audit | Belum diverifikasi |
| Enam akun uji terpisah | Seed berisi Owner/Sales/Warehouse/Procurement/Finance/Cashier; credential demo terdokumentasi | Ada; browser login belum diuji dalam audit ini |
| Data persisten sesudah refresh | SQLite dipakai; tidak ada browser refresh acceptance | Dasar ada, deployment belum terbukti |
| Persistence hosting | Pada VERCEL/Lambda, dbInit memakai `/tmp/erp.db` | Jika memakai serverless ini, buktikan durabilitas; `/tmp` bukan penyimpanan database permanen |
| Seed dataset | 15 produk,6 pelanggan,4 vendor,2 lokasi,15 akun,stok616,valuasi12214000,reserved6,GL33714000 | Lulus assertion baseline |
| README & architecture/data model | README, Prisma schema, dokumen arsitektur, diagram gambar/docx ada | Ada; perlu sinkronisasi dengan implementasi |
| Decision Log konflik SR01/02,03/04,05/06,07/08 | `docs/reports/DECISION_LOG.md` mencatat opsi dan trade-off | Ada; hindari klaim mitigasi yang belum memiliki workflow nyata |
| Definisi SR sesuai PDF | Dokumen arsitektur memberi arti berbeda pada beberapa SR, contoh SR03 sebagai lokasi POS, SR16 hanya minimum lead | Perlu koreksi pemetaan tanpa menghapus tuntutan stakeholder yang kalah |
| Test Results expected/actual + bukti | Register dan script ada; screenshot lama sebagian layar tersedia | Sebagian; belum bukti terbaru lengkap T01–T32 |
| Role Assignment nama mahasiswa | README hanya M1–M4, belum nama mahasiswa | Belum ditemukan artefak lengkap |
| Team Agreement: ritme rapat/prosedur persetujuan/anggota terlambat | Tidak ditemukan di repo yang diperiksa | Belum ditemukan |
| Contribution table member/role/module/F/T/key commits | Pembagian peran generik ada; tabel kontribusi nyata belum ditemukan | Belum lengkap |
| Riwayat commit semua anggota | Riwayat lokal hanya satu author identity, Felix | Bukti kontribusi empat anggota belum terverifikasi; bukan bukti bahwa anggota lain tidak bekerja |
| AI-tool usage note | README mengungkap Antigravity | Tambahkan ChatGPT/Codex dan alat lain yang benar-benar digunakan |
| Video <=10 menit + slide defense | Checklist berisi panduan; file hasil akhir belum ditemukan | Belum diverifikasi, bisa tersimpan di luar proyek |
| Format nama berkas Group03_24SI1_FnB_ItemName | Dokumen banyak bernama README/TEST_RESULTS dst. | Terapkan format saat menyiapkan paket pengumpulan |

Tidak semua artefak harus berupa file terpisah jika isinya lengkap dan dapat ditelusuri. “Belum ditemukan” berarti belum ada bukti dalam proyek yang diperiksa, bukan klaim artefak tidak dimiliki tim.

## Urutan perbaikan yang disarankan

1. **Now — tutup kekurangan Must:** vendor payment E2E; hentikan auto-stock; validasi stok/ordered/reserved dan invoice kumulatif; kunci harga vendor; perbaiki retur diskon/kumulatif; perbaiki credit exposure; rapikan otorisasi server.
2. **Now — betulkan pembuktian:** fresh seed per T-case independen, simpan fixture dependency eksplisit; jadikan probe gagal sebagai regression tests; lengkapi stock moves dan audit before-after.
3. **Next — lengkapi alur layar:** CRM stage/edit/quotation link; dashboard PBJT/POS/metadata; smart-links ke dokumen spesifik; control panel dan Log Notes sesuai tiap S.
4. **Next — siapkan grading:** deploy dengan database persisten, verifikasi URL dan enam akun, ambil bukti expected/actual T01–T32, nama/kontribusi anggota, Team Agreement, disclosure AI, video dan slide.
5. **Later:** fitur opsional/promosi, optimasi besar, dan kosmetik tambahan sesudah poin wajib stabil.

Audit tidak memberi estimasi nilai/kelulusan karena rubrik juga menilai presentasi, defense individu, deployment dan bukti kolaborasi yang belum diverifikasi. Temuan yang gagal perlu diperbaiki dahulu sebelum menyatakan aplikasi memenuhi Definition of Done.
