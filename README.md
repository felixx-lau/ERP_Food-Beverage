# Rasa Aruna Kitchen ERP — Integrated Enterprise Web Application
## Proyek Kuliah Sistem Informasi ERP (Food & Beverage Industry)
**Perusahaan:** PT Rasa Aruna Bersama (Brand: Rasa Aruna Kitchen)  
**Referensi Standar UI/Proses:** Odoo Web Version 17.0 (Desktop Browser)  
**Dokumen Acuan:** *Student Scenario Handout — Rasa Aruna Kitchen (24SI1 - Group 03)*

---

## 1. Ringkasan Proyek

> 📖 **PANDUAN LENGKAP ARSITEKTUR & ALUR BISNIS MUTLAK:**  
> Agar siapa pun yang memodifikasi sistem ini tidak merusak aturan bisnis, formula akuntansi, atau alur kerja penilaian (T-01 s/d T-32), baca dokumen panduan resmi di:  
> 👉 **[DOKUMENTASI_ALUR_DAN_ARSITEKTUR_SISTEM.md](./docs/architecture/DOKUMENTASI_ALUR_DAN_ARSITEKTUR_SISTEM.md)**

PT Rasa Aruna Bersama adalah perusahaan F&B di Jakarta yang mengoperasikan restoran cepat saji, layanan *takeaway*, pesanan katering korporat, dan paket makan siang perkantoran. Sistem ERP ini dibangun dengan pendekatan *vibe coding* dan rekayasa perangkat lunak berstandar industri untuk memecahkan 6 permasalahan operasional utama:
1. Bentrok reservasi pesanan kantor dengan kasir gerai.
2. Penagihan faktur atas barang yang belum dikirim.
3. Pembayaran tagihan vendor atas barang yang ditolak/rusak saat penerimaan.
4. Retur penjualan yang tidak membalik persediaan, pajak PBJT, dan COGS secara benar.
5. Pemberian diskon tidak terkontrol yang merusak margin laba.
6. Duplikasi pencatatan transaksi saat input diulang (*idempotency*).

Sistem mengintegrasikan seluruh alur bisnis secara *end-to-end* dengan data persisten murni (SQLite via Prisma ORM) tanpa *mock data* tiruan.

---

## 2. Arsitektur & Teknologi

* **Frontend Framework:** [Next.js 15](https://nextjs.org/) (App Router, Server Components & Client Interactive Components).
* **Programming Language:** [TypeScript 5](https://www.typescriptlang.org/) (Strict typing across domain models).
* **Database & ORM:** [Prisma ORM](https://www.prisma.io/) dengan database relasional persisten **SQLite** (`prisma/erp.db`).
* **Styling & UI Components:** [Tailwind CSS](https://tailwindcss.com/) dengan Odoo 17.0 visual aesthetics (Palet biru dan ungu, App Switcher, breadcrumb, status bar dokumen, Log Notes, dan Smart Buttons).
* **Autentikasi & RBAC:** JSON Web Token (JWT) berbasis `jose`, *stateless cookie*, password terenkripsi `bcryptjs`, dan *backend role-based authorization*.
* **Pajak Daerah:** PBJT (Pajak Barang dan Jasa Tertentu) Makanan & Minuman 10% dihitung per baris penjualan setelah diskon (pembulatan *half up* ke Rupiah terdekat).

---

## 3. Akun Pengguna Uji & Matriks Wewenang Role (RBAC)

Sistem menyediakan 6 akun pengguna pengujian bawaan sesuai tabel peran tugas:

| No | Role | Nama Pengguna | Email Login | Password Default | Tanggung Jawab & Hak Akses |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 1 | **OWNER** | Maya Prasetyo | `owner@rasaaruna.com` | `Password123!` | Akses penuh (*Full Access*) ke seluruh 8 aplikasi, approval diskon > 10%, otorisasi Reset Seed. |
| 2 | **SALES** | Dini Anggraini | `sales@rasaaruna.com` | `Password123!` | Manajemen CRM Leads, Kontak Pelanggan, Pembuatan Quotation, Konfirmasi SO (diskon maks 10%). |
| 3 | **WAREHOUSE** | Sinta Maharani | `warehouse@rasaaruna.com` | `Password123!` | Master Produk, Surat Jalan (Delivery Order), Penerimaan Barang (Goods Receipt), Internal Transfer. |
| 4 | **PROCUREMENT** | Arief Wicaksono | `procurement@rasaaruna.com` | `Password123!` | Permintaan Penawaran (RFQ), Konfirmasi Purchase Order (PO), monitoring penerimaan barang. |
| 5 | **FINANCE** | Reza Firdaus | `finance@rasaaruna.com` | `Password123!` | Customer Invoice, Vendor Bill, 3-Way Match, Pembayaran (Payments), General Ledger & Rekonsiliasi. |
| 6 | **CASHIER** | Bagas Putra | `cashier@rasaaruna.com` | `Password123!` | Kasir Point of Sale (POS) Gerai CAFE-JKT, pembukaan dan penutupan sesi kasir. *Dilarang akses GL (SR-15).* |

> **Akses akun:** gunakan logout dan login dengan kredensial role yang dituju. Pergantian role tanpa password dan reset/demo seed dinonaktifkan pada aplikasi operasional. JWT_SECRET produksi wajib unik, minimal 32 karakter.

---

## 4. Panduan Instalasi & Menjalankan Aplikasi

### A. Prasyarat Sistem
* [Node.js](https://nodejs.org/) versi 18.x atau 20.x LTS.
* NPM atau PNPM.

### B. Langkah Instalasi
1. **Clone Repositori & Masuk Direktori:**
   ```bash
   git clone <repository-url>
   cd ERP
   ```

2. **Instal Dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment:**
   Pastikan file `.env` tersedia dengan isi:
   ```env
   DATABASE_URL="file:./erp.db"
   JWT_SECRET="<buat-secret-acak-unik-minimal-32-karakter>"
   ```

4. **Database yang sudah berisi data:**
   ```bash
   npm run db:migrate:check
   npm run db:migrate
   ```
   Migrasi loyalitas SR-20 juga dijalankan untuk database utama dan database perusahaan pada folder `prisma/companies`. Migrasi diuji pada salinan dahulu, lalu membuat backup sebelum penerapan. Jangan menjalankan `db push` atau seed pada database bisnis yang sudah dipakai. Database baru dapat diinisialisasi dengan schema Prisma, tetapi baseline seed mengganti seluruh isi target dan membutuhkan flag `ALLOW_BASELINE_REPLACE=I_UNDERSTAND_THIS_REPLACES_DATA` yang disengaja.

5. **Jalankan Server Pengembang:**
   ```bash
   npm run dev
   ```
   Buka peramban di `http://localhost:3000`.

6. **Kompilasi Produksi (Production Build Verification):**
   ```bash
   npm run build
   npm start
   ```

---

## 5. Cara Menjalankan Automated Test Suites (T-01 s.d. T-32)

Pengujian mutasi dijalankan pada proyek dan database sementara; database perusahaan asli diperiksa hash-nya sebelum dan sesudah pengujian.

```bash
npm test
# Termasuk build produksi pada salinan terpisah:
python3 scripts/verify_isolated.py --suites test_crud test_pdf_cases test_integrity --audit-probes --build
```

T01–T32 dimulai dari baseline baru per kasus pada suite `test_pdf_cases`. Ini membuktikan perilaku layanan/API, bukan sertifikasi seluruh tampilan browser atau hosting publik. Bukti terbaru dan batas verifikasi tercantum di [laporan implementasi](docs/implementation-2026-11-06/IMPLEMENTATION.md).

Master pelanggan, vendor, produk, kategori, satuan, lokasi, akun, harga vendor, dan lead tersedia pada menu **Master Data**. Record yang sudah dipakai transaksi diarsipkan; hapus permanen tersedia hanya untuk record yang belum digunakan. Dokumen draft dapat diedit/dibatalkan. Koreksi transaksi yang sudah diposting menggunakan reversal, retur/credit note, atau refund POS dengan alasan dan audit.

SQLite memerlukan satu host aplikasi dengan penyimpanan persisten dan backup. Salinan database sementara pada Vercel/Lambda telah dinonaktifkan karena kehilangan perubahan saat restart. Hosting publik belum diverifikasi. Gunakan HTTPS dan secret produksi unik saat menyiapkan host persisten.

---

## 6. Struktur Direktori Proyek

```text
ERP_Food-Beverage/
├── docs/                                  # Dokumentasi Lengkap Proyek
│   ├── architecture/                      # Spesifikasi Arsitektur, UML Class Diagram & Gambar
│   │   ├── CLASS_DIAGRAM_ERP_RASA_ARUNA.docx
│   │   ├── DOKUMENTASI_ALUR_DAN_ARSITEKTUR_SISTEM.md
│   │   └── class_diagram_visual.png
│   ├── reports/                           # Laporan Pengujian, Deliverables & Keputusan Desain
│   │   ├── DECISION_LOG.md
│   │   ├── DELIVERABLES_CHECKLIST.md
│   │   ├── Dokumentasi_dan_Hasil_Pengujian_ERP.docx
│   │   ├── README.docx
│   │   ├── TEST_RESULTS.docx
│   │   └── TEST_RESULTS.md
│   ├── changelogs/                        # Riwayat Perubahan & Audit Log
│   │   ├── AUDIT.md
│   │   ├── CHANGELOG.md
│   │   └── UI-CHANGELOG.md
│   └── screens/                           # Tangkapan Layar Aplikasi (Sebelum & Sesudah)
│       ├── after/
│       ├── before/
│       └── step1/
├── prisma/                                # Konfigurasi Basis Data & ORM
│   ├── schema.prisma                      # Skema Model Data Relasional
│   ├── erp.db                             # Basis Data SQLite Utama
│   ├── companies/                         # Basis Data Multi-Perusahaan
│   └── companies.json                     # Registri Multi-Perusahaan
├── scripts/                               # Script Pengujian Otomatis & Seeder
│   ├── seed.ts                            # Seeder Data Awal Baseline
│   ├── seed_demo_charts.ts                # Seeder Data Transaksi Demo Charts
│   ├── test_phase2_3.ts                   # Pengujian T-01 & T-02
│   ├── test_phase4.ts                     # Pengujian T-03 s/d T-12
│   ├── test_phase5.ts                     # Pengujian T-15 s/d T-18, T-21, T-22
│   ├── test_phase6.ts                     # Pengujian T-19, T-20, T-23 s/d T-26
│   ├── test_phase7.ts                     # Pengujian T-13, T-14, T-27 s/d T-30
│   ├── test_phase8.ts                     # Pengujian T-31 & T-32
│   ├── test_charts.ts                     # Pengujian Analytics & Dashboard API
│   ├── export_to_docx.py                  # Script Generator Laporan DOCX
│   └── generate_class_diagram_docx.py     # Script Generator Class Diagram DOCX
├── src/                                   # Kode Sumber Next.js 15
│   ├── app/                               # Next.js App Router (Halaman & API Routes)
│   ├── components/                        # Komponen UI, Modals, Topbar & Sidebar
│   ├── context/                           # React Context (CompanyContext)
│   └── lib/                               # Mesin Bisnis (Accounting, Sales, POS, DB, Auth)
├── package.json                           # Konfigurasi Dependensi & Scripts
├── tailwind.config.ts                     # Konfigurasi Tema & Design Tokens Tailwind
├── tsconfig.json                          # Konfigurasi TypeScript
└── README.md                              # Panduan Utama Proyek
```

---

## 7. Struktur Menu & Peta Modul Aplikasi

Aplikasi memiliki 8 modul inti yang dapat diakses melalui Home App Switcher:
1. **Sales (`/sales/orders`):** Penawaran, Sales Order, validasi credit limit, approval diskon, dan price lock.
2. **CRM (`/crm/leads`):** Kanban pipeline peluang (New, Qualified, Proposition, Won) dengan validasi data minimum.
3. **Purchase (`/purchase/orders`):** RFQ, Purchase Order, dan komitmen pembelian.
4. **Inventory (`/inventory/products`):** Master 15 SKU varian, multi-lokasi (WH-JKT & CAFE-JKT), Surat Jalan (`/inventory/delivery`), Penerimaan (`/inventory/receipts`), Transfer Internal (`/inventory/transfers`), dan Retur (`/inventory/returns`).
5. **Invoicing (`/accounting/invoices`):** Penagihan berbasis pengiriman (Delivery-based Invoicing) dan tagihan vendor (`/accounting/vendor-bills`) dengan Three-Way Match.
6. **Accounting (`/accounting/journal-entries`):** Buku Besar Umum (General Ledger), CoA, pengakuan COGS otomatis, dan pencatatan pembayaran (`/accounting/payments`).
7. **Point of Sale (`/pos`):** Kasir gerai CAFE-JKT, keranjang pesanan, pembayaran QRIS/Bank, dan penutupan sesi kasir.
8. **Dashboard (`/dashboard`):** Ringkasan KPI operasional waktu-nyata, matriks rekonsiliasi buku besar, dan deteksi anomali persediaan (SR-20).

---

## 7. Catatan Penggunaan Alat Bantu AI (AI Disclosure)

Sesuai ketentuan Bagian 13 Dokumen Tugas (*Integritas Akademik & Penggunaan AI*):
* **Alat AI yang Digunakan:** Antigravity (Advanced Agentic AI Assistant berbasis Google DeepMind).
* **Peran AI:** Pembuatan boilerplate antarmuka Odoo 17, skema Prisma ORM, penyusunan fungsi pembukuan berpasangan (*double-entry balancing*), dan otomasi script verifikasi *Given/When/Then*.
* **Telaah & Kontrol Rekayasa Manusia:** Seluruh logika bisnis (*business rules* `SR-01` s.d. `SR-20`), penyelesaian konflik di [docs/reports/DECISION_LOG.md](./docs/reports/DECISION_LOG.md), penolakan stok negatif, Three-Way Matching engine, dan perhitungan pajak daerah PBJT 10% telah ditelaah, diuji, dan diverifikasi secara manual oleh tim mahasiswa untuk memastikan sistem tidak terjebak dalam *AI-generated traps* (seperti bypass validasi kredit atau manipulasi jurnal otomatis).

---

## 8. Jawaban Pertanyaan Refleksi (Halaman 34 PDF)

### Refleksi 1: Konflik Stakeholder Paling Sulit Diselesaikan
* **Konflik:** `SR-03` (Bagas Putra, Kasir - Izinkan stok minus agar antrean tidak macet) vs `SR-04` (Sinta Maharani, Kepala Gudang - Dilarang keras stok minus dan lindungi stok reserved).
* **Kepentingan yang Dikorbankan:** Kepentingan kasir gerai untuk tetap bisa memproses pesanan saat stok fisik di sistem belum diperbarui.
* **Ukuran Kerugian:** Kasir mengalami hambatan checkout jika stok gerai habis, berpotensi menimbulkan keluhan pelanggan antrean kasir.
* **Kontrol Mitigasi yang Dipilih:** Menerapkan fitur **Internal Stock Transfer Instan (`F-19`, Wireframe `S-07`)** antar-lokasi dari gudang konsolidasi `WH-JKT` ke gerai `CAFE-JKT` dalam hitungan detik. Dengan demikian, akurasi persediaan, COGS, dan reservasi pesanan korporat tetap terlindungi 100% tanpa kompromi integritas data.
* **Referensi:** `SR-03`, `SR-04`, `F-16`, `F-19`, `S-07`, `S-14`, `T-12`, `T-14`, `T-28`.

### Refleksi 2: Jebakan Logika AI (*AI-Generated Trap*) & Cara Mengatasinya
* **Temuan:** Pada modul Dashboard Rekonsiliasi (`F-21`), model AI sempat mengusulkan pembuatan fungsi penyeimbang otomatis (*auto-adjustment journal entry*) ketika mendeteksi selisih antara stok fisik dan akun buku besar 1030 agar neraca keuangan tampak seimbang (*balanced*).
* **Pelanggaran Aturan Bisnis:** Pendekatan ini melanggar secara fatal aturan bisnis `SR-20` (*Audit Source Integrity*), yang mewajibkan dashboard dibuktikan langsung dari dokumen sumber sah dan melarang manipulasi jurnal artifisial.
* **Solusi & Regression Test:** Fungsi auto-adjust dibatalkan secara permanen. Sistem dirancang untuk mengunci flag `autoPostBlocked = true`, mempertahankan status `MISMATCH`, memunculkan banner peringatan audit, dan mewajibkan investigasi fisik. Pengujian `T-32` membuktikan bahwa saat terjadi selisih 1 unit, tidak ada jurnal palsu yang terbuat di database.

---

## 9. Struktur Tim & Pembagian Modul (RACI)

* **M1 (Product Owner & BA):** Modul Sales & CRM (`F-02`, `F-04`–`F-06`, `F-10`; `T-03`, `T-04`, `T-07`–`T-10`).
* **M2 (Lead AI Developer):** Modul Purchase & Inventory (`F-03`, `F-07`, `F-08`, `F-11`, `F-12`, `F-19`; `T-05`, `T-06`, `T-11`–`T-18`).
* **M3 (UI/UX & Frontend Lead):** Modul Point of Sale & Dashboard (`F-01`, `F-16`, `F-17`, `F-20`; `T-01`, `T-02`, `T-27`, `T-28`, `T-31`, `T-32`).
* **M4 (QA & Deployment Lead):** Modul Accounting, Invoicing, & General Ledger (`F-09`, `F-13`–`F-15`, `F-18`, `F-21`, `F-22`; `T-19`–`T-26`, `T-29`, `T-30`).

### Promosi loyalitas POS (SR-20)

Owner dapat membuat akun loyalitas untuk pelanggan yang terdaftar dan kupon nominal sekali pakai melalui bagian **Promosi & loyalitas** di POS. Kasir dapat memilih akun dan/atau kupon saat pembayaran. Setiap Rp10.000 subtotal setelah diskon menghasilkan satu poin; pajak PBJT dihitung ulang per baris setelah diskon. Diskon dialokasikan ke baris sesuai urutan keranjang dan tidak boleh melebihi subtotal. Refund penuh membatalkan poin yang diperoleh; kupon tetap terpakai. Pembayaran tanpa promosi tetap menggunakan alur POS dasar. Tes tambahan tersedia di `scripts/test_loyalty.ts`.
