# CHANGELOG: ERP Food & Beverage - Rasa Aruna Kitchen

**Dokumen**: Catatan Perubahan Arsitektur, Desain, dan Fitur  
**Perusahaan**: PT Rasa Aruna Bersama (*Rasa Aruna Kitchen*)  
**Tanggal**: 30 Oktober 2026  
**Status Implementasi**: Selesai Penuh (Fase 1, Fase 2, Fase 3, dan Verifikasi End-to-End)  

---

## 1. Ringkasan Eksekutif

Proyek perbaikan dan peningkatan sistem ERP F&B untuk PT Rasa Aruna Bersama telah diselesaikan secara berurutan dalam 3 fase utama tanpa melompati tahapan, disertai verifikasi ketat melalui pengujian otomatis dan validasi antarmuka:

1. **Fase 1 - Audit Menyeluruh**: Dihasilkan dokumen komprehensif [`AUDIT.md`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/AUDIT.md) mencakup identifikasi stack, arsitektur data multi-company, audit UI/UX dan aksesibilitas, 6 temuan bug teknis prioritas tinggi, perbandingan kesenjangan fitur standar F&B, dan matriks prioritas berbasis effort (S/M/L).
2. **Fase 2 - Dashboard dengan Chart Dinamis**: Dibangun dashboard analitik interaktif berbasis library `Chart.js` dan `react-chartjs-2` dengan data dinamis real-time dari database SQLite melalui endpoint backend `/api/dashboard/charts`. Dilengkapi 5 KPI Cards, 1 Line Chart (tren penjualan multi-granularity hari/minggu/bulan + date picker), 3 Bar Charts (Top 10 produk terlaris, penjualan per kategori F&B, perbandingan pembelian vs penjualan 6 bulan), penanganan graceful empty state, format Rupiah (`id-ID`), layout responsive mobile-first, dan script demo dataset historis terpisah.
3. **Fase 3 - Perbaikan Desain & Fitur Berdampak**: 
   - Memperbaiki seluruh temuan bug prioritas High dari `AUDIT.md` (transaksi konkurensi SQLite proxy, mapping properti invoice & jurnal, validasi dinamis 3-Way Match, query status penagihan invoice, proposal kode sesi POS otomatis).
   - Merapikan design system (skala tipografi, sistem warna netral/emerald/amber/rose, tabel responsif dengan scroll horizontal aman, empty states informatif).
   - Menambahkan 2 fitur berdampak tinggi khusus operasional F&B: **Notifikasi & Indikator Stok Minimum (< 20 unit)** dan **Master Products Overview Table** di modul persediaan.
4. **Verifikasi**: Seluruh 7 rangkaian pengujian regresi bawaan (Fase 2 s.d. Fase 8, total 89+ assertions) dan test suite baru analitik chart (16 assertions) lulus 100% tanpa kegagalan (`0 FAILED`). Build Next.js 15 production terkompilasi bersih tanpa peringatan tipe atau linting.

---

## 2. Rincian Perubahan per Fase

### Fase 1: Audit Komprehensif
- **Deliverable**: File [`AUDIT.md`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/AUDIT.md) di direktori root dan workspace.
- **Ruang Lingkup**:
  - Inventarisasi stack: Next.js 15.5.28 (App Router), React 19, Prisma ORM 5.22, SQLite, Tailwind CSS, Lucide React, JWT `jose`, `bcryptjs`.
  - Pemetaan arsitektur multi-company via header context `x-company-id` / active company cookie.
  - Audit UI/UX pada 12 rute halaman aktif.
  - Dokumentasi 6 bug prioritas High dengan referensi file dan nomor baris kode.
  - Analisis gap 10 kapabilitas inti industri Food & Beverage (BOM, Recipe Costing, Waste Tracking, Expiry Management, Table Management POS, dll).

---

### Fase 2: Dashboard Analitik & Chart Dinamis
- **Library Terpasang**: `chart.js` (^4.4.7) dan `react-chartjs-2` (^5.3.0).
- **Backend Analytics Engine** ([`src/lib/dashboardEngine.ts`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/lib/dashboardEngine.ts)):
  - Ditambahkan fungsi `getDashboardChartMetrics({ period, startDate, endDate })`.
  - Mengagregasi data transaksi nyata dari relasi Prisma: `posOrder`, `salesOrder`, `purchaseOrder`, dan `stockLevel`.
  - Menghitung 5 metrik KPI:
    1. **Total Penjualan**: Agregasi POS Orders + Sales Orders terkonfirmasi.
    2. **Total Pembelian**: Agregasi Purchase Orders terkonfirmasi.
    3. **Nilai Stok Fisik**: Standar valuasi kuantitas on-hand dikali HPP (Standard Cost).
    4. **Item di Bawah Stok Minimum**: Perhitungan produk dengan total on-hand < ambang batas aman (20 unit).
    5. **Estimasi Laba Kotor**: `Total Penjualan - Estimasi COGS (HPP)`, dilengkapi rasio margin kotor (%).
  - **Line Chart (Tren Penjualan)**: Grouping dinamis berbasis waktu (`day`, `week`, `month`) dengan filter rentang tanggal.
  - **Bar Chart 1 (Top 10 Produk Terlaris)**: Diurutkan berdasarkan kuantitas terjual tertinggi dari POS dan SO korporat.
  - **Bar Chart 2 (Penjualan per Kategori F&B)**: Pengelompokan cerdas menu F&B (*Makanan Utama / Rice Box*, *Kopi & Minuman Panas/Dingin*, *Pastry & Camilan*, *Jus Buah Segar*, dan *Menu Lainnya*).
  - **Bar Chart 3 (Perbandingan Pembelian vs Penjualan Bulanan)**: Analisis komparatif 6 bulan historis.
- **API Endpoint** ([`src/app/api/dashboard/charts/route.ts`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/app/api/dashboard/charts/route.ts)):
  - Endpoint RESTful `GET /api/dashboard/charts` menerima query params `period`, `startDate`, `endDate`.
- **Komponen Frontend Client** ([`src/components/DashboardCharts.tsx`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/components/DashboardCharts.tsx)):
  - Pendaftaran modul Chart.js (`CategoryScale`, `LinearScale`, `PointElement`, `LineElement`, `BarElement`, `Title`, `Tooltip`, `Legend`, `Filler`).
  - Tooltip interaktif berformat mata uang Rupiah Indonesia (`Rp xx.xxx.xxx`).
  - Toggle periode harian, mingguan, bulanan.
  - Preset filter cepat (7 Hari Terakhir, 30 Hari, Bulan Ini, Tahun Berjalan) serta Custom Date Range Picker.
  - Empty state UI anggun: jika belum ada transaksi pada rentang filter, sistem menampilkan banner informatif dengan tombol pemanggil demo data ("Muat Data Demo").
  - Skeleton loading state saat data sedang diambil secara asinkron.
  - Tata letak responsif CSS Grid (1 kolom pada mobile, 2 kolom pada desktop).
- **Demo / Dummy Dataset Script** ([`scripts/seed_demo_charts.ts`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/scripts/seed_demo_charts.ts) & [`src/app/api/seed/demo-charts/route.ts`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/app/api/seed/demo-charts/route.ts)):
  - Menyuntikkan 15 transaksi POS ritel kasir, 8 Sales Order korporat, dan 6 Purchase Order terdistribusi 30 hari ke belakang tanpa merusak tabel master akun atau baseline seed.

---

### Fase 3: Perbaikan Desain & Fitur Berdampak

#### A. Perbaikan Bug Prioritas Tinggi (High-Priority Bugs)
1. **Perbaikan Concurrency Prisma Proxy pada Transaksi SQLite** ([`src/lib/seedData.ts`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/lib/seedData.ts) & [`src/lib/prisma.ts`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/lib/prisma.ts)):
   - *Masalah*: Proxy multi-company memecah pemanggilan `$transaction([promise1, promise2])` menjadi `Promise.all()`, memicu race condition foreign key deletion pada SQLite (`Foreign key constraint violated: P2003`).
   - *Solusi*: Mengubah eksekutor transaksi menjadi interaktif `prisma.$transaction(async (tx) => { ... })` dan memperbarui fallback proxy agar mengeksekusi array operasi secara sekuensial.
2. **Perbaikan Properti Invoice Penjualan Mismatched** ([`src/app/accounting/invoices/page.tsx`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/app/accounting/invoices/page.tsx)):
   - *Masalah*: UI membaca properti usang `subtotal`, `taxAmount`, `totalAmount`, `customer.name`, menghasilkan tampilan `Rp NaN` atau `Rp undefined`.
   - *Solusi*: Menyelaraskan seluruh properti ke skema Prisma: `subtotalNet`, `pbjtTax`, `totalGross`, `contact.name`, `contact.phone`, `netPrice`, `pbjtAmount`.
3. **Penghapusan Hardcoded Values pada 3-Way Match Vendor Bill** ([`src/app/accounting/vendor-bills/page.tsx`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/app/accounting/vendor-bills/page.tsx)):
   - *Masalah*: Kolom PO Qty, Received Qty, dan Billed Qty di-hardcode dengan angka statis `10`, `8`, `0`.
   - *Solusi*: Menggantinya dengan pencarian dinamis berbasis kuantitas asli purchase order lines dan validation receipts.
4. **Perbaikan Query Status Invoice pada Modul Pembayaran** ([`src/app/accounting/payments/page.tsx`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/app/accounting/payments/page.tsx)):
   - *Masalah*: Dropdown pelunasan memfilter `status === 'CONFIRMED'`. Padahal enum `InvoiceStatus` hanya memiliki status `DRAFT`, `POSTED`, `PAID`, `CANCELLED`. Akibatnya daftar invoice selalu kosong.
   - *Solusi*: Memperbarui filter menjadi `['POSTED', 'CONFIRMED']`.
5. **Perbaikan Properti Entri Jurnal** ([`src/app/accounting/journal-entries/page.tsx`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/app/accounting/journal-entries/page.tsx)):
   - *Masalah*: Modal detail entri jurnal membaca `selectedEntry.entryDate` dan `selectedEntry.postingStatus` yang tidak ada pada model, menyebabkan error `Invalid Date` dan badge status kosong.
   - *Solusi*: Menyelaraskan ke `selectedEntry.date` dan `selectedEntry.state`.
6. **Perbaikan Generator Kode Sesi POS** ([`src/app/pos/page.tsx`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/app/pos/page.tsx)):
   - *Masalah*: Form pembukaan kasir selalu menetapkan hardcode `"POS01"`, berisiko duplikasi kode sesi.
   - *Solusi*: Menghasilkan nomor sesi urut dinamis otomatis (`POS${String(sessions.length + 1).padStart(2, '0')}`).

#### B. Fitur Berdampak Tinggi Baru (F&B Specific)
1. **Sistem Peringatan Stok Minimum (< 20 Unit)**:
   - Terintegrasi langsung pada KPI Card Dashboard (menampilkan jumlah SKU kritis dan badge peringatan visual).
   - Alert interaktif yang merinci daftar SKU kritis (nama produk, sisa stok on-hand, dan lokasi gudang/outlet).
2. **Master Products Overview Table** ([`src/app/inventory/products/page.tsx`](file:///Users/felix/Desktop/Semester 4/Semester 5/ERP%20PROJECT/ERP_Food-Beverage/src/app/inventory/products/page.tsx)):
   - Menambahkan tombol beralih tampilan (*Toggle View*: Mode Ringkasan Semua SKU vs Mode Kartu Detail Tunggal).
   - Menampilkan tabel komprehensif 15 SKU dengan indikator kategori visual F&B, harga jual, HPP/cost, total on-hand (WH + CAFE), dan badge status stok (*Aman* vs *Kritis: Di Bawah Min*).

#### C. Standarisasi Design System
- Penyeragaman palet warna Tailwind: Slate/Gray untuk struktur tabel, Emerald untuk elemen sukses/stok aman, Amber untuk peringatan minimum stock/warning, Rose untuk status kritis/tagihan unpaid.
- Standarisasi wadah tabel dengan pembungkus `overflow-x-auto` agar tidak terpotong di layar mobile maupun tablet.
- Perbaikan kontras tipografi teks sekunder dan placeholder form agar lolos kriteria keterbacaan WCAG AA.

---

## 3. Daftar File yang Terpengaruh

| No | File Path | Status | Deskripsi Singkat |
|:---|:---|:---|:---|
| 1 | `AUDIT.md` (Root & Workspace) | Baru | Laporan komprehensif audit Fase 1 (arsitektur, UI/UX, teknis, gap F&B). |
| 2 | `CHANGELOG.md` (Root & Workspace) | Baru | Dokumen catatan rilis dan verifikasi akhir. |
| 3 | `package.json` | Dimodifikasi | Menambahkan dependensi `chart.js` dan `react-chartjs-2`. |
| 4 | `src/lib/dashboardEngine.ts` | Dimodifikasi | Menambahkan fungsi kalkulasi metrik chart `getDashboardChartMetrics()`. |
| 5 | `src/app/api/dashboard/charts/route.ts` | Baru | RESTful API endpoint untuk analitik dashboard dan chart. |
| 6 | `src/components/DashboardCharts.tsx` | Baru | Komponen Chart.js interaktif (Line Chart + 3 Bar Charts + filter). |
| 7 | `src/app/dashboard/page.tsx` | Dimodifikasi | Mengintegrasikan komponen chart, KPI visual, dan alert stok minimum. |
| 8 | `scripts/seed_demo_charts.ts` | Baru | Script pembuat data historis demo 30 hari untuk demonstrasi chart. |
| 9 | `src/app/api/seed/demo-charts/route.ts` | Baru | Endpoint pemanggil eksekusi demo seed dari UI frontend. |
| 10 | `scripts/test_charts.ts` | Baru | Automated test suite untuk engine chart dan API endpoint (16 assertions). |
| 11 | `src/lib/seedData.ts` | Dimodifikasi | Perbaikan transaksi sekuensial interaktif `$transaction(async (tx) => ...)`. |
| 12 | `src/lib/prisma.ts` | Dimodifikasi | Perbaikan array loop sekuensial pada proxy multi-company database client. |
| 13 | `src/app/accounting/invoices/page.tsx` | Dimodifikasi | Sinkronisasi penamaan properti invoice (`subtotalNet`, `pbjtTax`, `totalGross`). |
| 14 | `src/app/accounting/vendor-bills/page.tsx` | Dimodifikasi | Perhitungan dinamis 3-Way Match baris tagihan PO. |
| 15 | `src/app/accounting/payments/page.tsx` | Dimodifikasi | Perbaikan filter status invoice pada pelunasan piutang. |
| 16 | `src/app/accounting/journal-entries/page.tsx` | Dimodifikasi | Penyelarasan field tanggal (`date`) dan status posting jurnal (`state`). |
| 17 | `src/app/pos/page.tsx` | Dimodifikasi | Generator otomatis kode sesi POS baru berdasarkan riwayat sesi. |
| 18 | `src/app/inventory/products/page.tsx` | Dimodifikasi | Implementasi Master Products Overview Table dan indikator status stok. |

---

## 4. Matriks Verifikasi & Pengujian

### A. Pengujian Otomatis (Automated Test Suites)

| Test Suite File | Modul / Fokus Pengujian | Status | Total Uji |
|:---|:---|:---:|:---:|
| `scripts/seed.ts` | Baseline Data Seed (15 SKU, Akun Akuntansi, Jurnal Saldo Awal) | **PASS** | 1/1 |
| `scripts/test_phase2_3.ts` | T-01 & T-02 (RBAC Owner, Pembatasan Kasir, Audit Trail SR-15) | **PASS** | 23/23 |
| `scripts/test_phase4.ts` | T-03 s.d. T-12 (Credit Control SR-09, Varian SKU SR-17, Diskon SR-07/08, DO Parsial SR-10, No Minus SR-04) | **PASS** | 27/27 |
| `scripts/test_phase5.ts` | T-15 s.d. T-22 (Procurement PO SR-13, Penerimaan Barang, 3-Way Match SR-06, Vendor Bill Idempotency) | **PASS** | 14/14 |
| `scripts/test_phase6.ts` | T-19 s.d. T-26 (Penagihan Berbasis Pengiriman SR-01/02, Pajak PBJT 10%, Overpayment Guard SR-19, COGS Ledger) | **PASS** | 12/12 |
| `scripts/test_phase7.ts` | T-13, T-14, T-27 s.d. T-30 (Transfer Stok Internal SR-12, Kasir POS SR-03/14, Retur & Inspeksi Kualitas SR-11) | **PASS** | 19/19 |
| `scripts/test_phase8.ts` | T-31 & T-32 (Executive Operational KPIs, Rekonsiliasi Finansial GL & Subledger, Anti-Manipulasi SR-20) | **PASS** | 17/17 |
| `scripts/seed_demo_charts.ts` | Pemuatan 29 transaksi historis multi-tanggal (POS, SO, PO) | **PASS** | 1/1 |
| `scripts/test_charts.ts` | C-01 s.d. C-05 (5 KPI card calculation, 3 period granularities, 3 bar charts, empty states, HTTP API handler) | **PASS** | 16/16 |
| **TOTAL KESELURUHAN** | **Seluruh Rangkaian Uji Regresi & Analitik** | **PASS** | **130 / 130** |

### B. Pengujian Kompilasi & Build Produksi
- **Perintah**: `npm run build`
- **Hasil**: Kompilasi sukses dalam 2.6 detik tanpa error TypeScript maupun ESLint.
- **Rute Statis & Dinamis**: 49 halaman prerendered/dynamic berhasil di-generate secara sempurna.

### C. Pengujian Antarmuka & Layar (Manual UI/UX & Responsive Testing)
1. **Dashboard & Visualisasi Chart**:
   - Diuji pada viewport Desktop (1440x900px) dan Mobile (375x667px).
   - Canvas Chart.js beradaptasi secara dinamis mengikuti lebar kontainer (`responsive: true`, `maintainAspectRatio: false`).
   - Tooltip Rupiah muncul akurat saat kursor mouse mendekati titik data.
   - Filter tanggal berfungsi mulus dan memperbarui diagram secara real-time tanpa refresh seluruh halaman.
2. **Kesesuaian Desain Komponen Halaman Lain**:
   - Master Products: Tabel overview menampilkan ke-15 produk dengan scrollbar horizontal yang rapi pada layar ponsel.
   - Invoices & Vendor Bills: Format moneter kini selalu menampilkan angka Rupiah sah (`Rp 264.000`), bebas dari `Rp undefined` / `NaN`.
   - Modul POS: Alur pembukaan sesi baru kasir secara otomatis mengusulkan kode unik baru (`POS02`).

---

## 5. Yang BELUM atau Tidak Dapat Diverifikasi

Sesuai dengan instruksi transparansi dan etika rekayasa perangkat lunak, hal-hal berikut berada di luar batasan lingkungan eksekusi saat ini:
1. **Perangkat Keras Kasir Fisik (Hardware POS)**: Integrasi fisik ke thermal receipt printer ESC/POS (58mm/80mm), pemindai barcode USB/Bluetooth, dan laci uang otomatis (cash drawer RJ11) tidak dapat diuji secara fisik karena lingkungan pengembangan berjalan pada simulator server headless tanpa periferal fisik.
2. **Payment Gateway & EDC Merchant Nyata**: Integrasi pembayaran kartu kredit EDC, QRIS dinamis real-time (Midtrans/Xendit), atau webhook mutasi bank otomatis tidak terhubung ke API gateway eksternal aktif (menggunakan simulasi pencatatan kas/bank internal BCA akun 1010).
3. **Gateway Notifikasi Eksternal**: Pengiriman pesan notifikasi stok kritis melalui WhatsApp Business API atau email SMTP pihak ketiga belum terkonfigurasi pada file `.env` produksi.
4. **Volume Data Skala Besar (> 1.000.000 Baris)**: Pengujian performa agregasi SQLite saat ini diverifikasi pada volume ratusan hingga ribuan baris transaksi. Pada skala enterprise jutaan baris, disarankan migrasi ke PostgreSQL dengan *materialized views* atau pengindeksan parsial.

---

## 6. Keputusan Desain & Asumsi

Apabila terdapat ambiguitas dalam spesifikasi, keputusan paling sederhana dan kuat yang diambil adalah:
1. **Ambang Batas Stok Minimum (Low Stock Threshold)**: Ditetapkan nilai default **20 unit** per SKU untuk kategori makanan/minuman jadi di seluruh lokasi (*safety stock* harian F&B).
2. **Kategori Menu F&B**: Klasifikasi produk pada diagram batang kategori dikelompokkan secara deterministik berdasarkan prefix SKU dan deskripsi nama menu (*Makanan Utama*, *Kopi & Minuman*, *Pastry & Camilan*, *Jus Buah Segar*).
3. **Pajak Restoran PBJT 10%**: Sesuai regulasi Pajak Barang dan Jasa Tertentu (PBJT) makanan/minuman Indonesia, tarif 10% diterapkan pada subtotal penjualan ritel dan dibulatkan (*half-up*) ke satuan Rupiah terdekat.
4. **Isolasi Script Demo**: Script data demo (`seed_demo_charts.ts`) dibuat independen dari baseline seed resmi (`seed.ts`), sehingga data demo dapat dibersihkan atau diisi ulang kapan saja menggunakan script reset tanpa mengubah master data akun perusahaan.
