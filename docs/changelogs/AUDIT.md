# AUDIT SISTEM ERP FOOD & BEVERAGE — PT RASA ARUNA BERSAMA (RASA ARUNA KITCHEN)
**Auditor:** Senior Full-Stack Engineer & Lead UI/UX Reviewer  
**Tanggal Audit:** 30 Oktober 2026  
**Status Evaluasi:** FASE 1 — AUDIT SELESAI (Belum ada kode fungsional yang diubah)

---

## DAFTAR ISI
1. [Ringkasan Arsitektur & Modul yang Ada](#1-ringkasan-arsitektur--modul-yang-ada)
2. [Masalah Desain, Antarmuka, dan UI/UX](#2-masalah-desain-antarmuka-dan-uiux)
3. [Masalah Teknis, Bug, & Keamanan Dasar](#3-masalah-teknis-bug--keamanan-dasar)
4. [Analisis Fitur: Existing vs Kebutuhan Industri ERP F&B](#4-analisis-fitur-existing-vs-kebutuhan-industri-erp-fb)
5. [Matriks Temuan: Prioritas, Effort, dan Bukti Kode](#5-matriks-temuan-prioritas-effort-dan-bukti-kode)
6. [Rencana Tindak Lanjut untuk Fase 2 & Fase 3](#6-rencana-tindak-lanjut-untuk-fase-2--fase-3)

---

## 1. RINGKASAN ARSITEKTUR & MODUL YANG ADA

### 1.1 Identifikasi Stack Teknologi
* **Backend Framework:** Next.js 15.2.1 / 15.5.28 (Node.js runtime, App Router REST API endpoints di `/src/app/api/...`).
* **Frontend Framework:** React 19.0.0, Next.js Server & Client Components (`"use client"`).
* **Database & ORM:** SQLite (`prisma/erp.db`) dengan Prisma ORM 6.4.1 / 6.19.3. Dilengkapi sistem multi-perusahaan berbasis berkas database terpisah (`prisma/companies.json` & dynamic client proxy di `src/lib/prisma.ts`).
* **Template Engine:** React JSX / TSX (TypeScript 5.8.2).
* **Library Chart yang Ada:** **TIDAK ADA (None)**. Tidak ditemukan library chart seperti Chart.js, Recharts, ApexCharts, maupun library visualisasi lainnya di `package.json`. Sesuai instruksi, Chart.js akan dipasang pada Fase 2.
* **Autentikasi & Keamanan:** Stateless JWT token via `jose` (HS256) disimpan pada HTTP-Only Cookie `rasa_aruna_session`, enkripsi password `bcryptjs`, dan Role-Based Access Control (RBAC) pada API route handlers.
* **Styling & Icons:** Tailwind CSS 3.4.17 dengan custom theme tokens (`aruna`, `sage`, `gold`, `charcoal`, `odoo`) dan ikon SVG dari `lucide-react` 1.16.0.

### 1.2 Cara Menjalankan Aplikasi
1. Inisialisasi Database: `npx prisma db push`
2. Pemuatan Data Awal (Baseline Seed): `npx tsx scripts/seed.ts`
3. Menjalankan Server Pengembangan: `npm run dev` (berjalan di `http://localhost:3000`)
4. Kompilasi & Server Produksi: `npm run build && npm start`
5. Menjalankan Test Suite Regresi: `npx tsx scripts/test_phase2_3.ts` hingga `test_phase8.ts`

### 1.3 Katalog Modul & Halaman yang Sudah Ada (17 Rute UI)
1. **Beranda & Quick Action Hub (`/`, `src/app/page.tsx`):** Katalog 8 modul bisnis, kartu identitas pengguna/perusahaan, dan 4 tombol aksi cepat (*Add Product, Sales Order, Customer, Purchase Order*).
2. **Autentikasi (`/login`, `src/app/login/page.tsx`):** Formulir login email/password dengan tombol pintas pergantian 6 role pengujian.
3. **Executive Dashboard (`/dashboard`, `src/app/dashboard/page.tsx`):** 8 KPI operasional, matriks rekonsiliasi buku besar & persediaan (SR-20 / F-21), simulator anomali, serta pengujian T-31 dan T-32. *(Catatan: Belum memiliki visualisasi grafik sama sekali)*.
4. **Sales Orders (`/sales/orders`, `src/app/sales/orders/page.tsx`):** Penerbitan penawaran, konfirmasi SO, validasi limit kredit, approval diskon > 10% (SR-08), dan penguncian harga (*price lock*).
5. **Kontak Pelanggan (`/sales/contacts`, `src/app/sales/contacts/page.tsx`):** Manajemen pelanggan, batas kredit, dan eksposur piutang dagang.
6. **CRM Pipeline (`/crm/leads`, `src/app/crm/leads/page.tsx`):** Papan kanban 4 tahap (New, Qualified, Proposition, Won) dengan validasi *expected revenue* (SR-16).
7. **Purchase Orders (`/purchase/orders`, `src/app/purchase/orders/page.tsx`):** Pengadaan bahan baku, RFQ, komitmen PO, dan idempotensi konfirmasi (SR-13).
8. **Master Produk & Varian SKU (`/inventory/products`, `src/app/inventory/products/page.tsx`):** Master 15 SKU varian F&B, standar harga/biaya, dan saldo stok multi-lokasi (WH-JKT dan CAFE-JKT).
9. **Surat Jalan Pengiriman (`/inventory/delivery`, `src/app/inventory/delivery/page.tsx`):** Validasi pengiriman fisik, pemotongan stok gudang, dan otomatisasi dokumen backorder (SR-10).
10. **Penerimaan Barang (`/inventory/receipts`, `src/app/inventory/receipts/page.tsx`):** Berita acara penerimaan gudang, inspeksi kontrol kualitas (Accepted vs Rejected), dan pencatatan akun interim GRNI (1040).
11. **Transfer Internal Antar-Gudang (`/inventory/transfers`, `src/app/inventory/transfers/page.tsx`):** Pemindahan stok cepat dari WH-JKT ke CAFE-JKT dengan proteksi *zero negative stock* (SR-12).
12. **Retur Penjualan & Credit Note (`/inventory/returns`, `src/app/inventory/returns/page.tsx`):** Permohonan retur dari invoice, inspeksi QC (SR-11), pembalikan COGS, restok fisik, dan penerbitan nota kredit.
13. **Faktur Pelanggan (`/accounting/invoices`, `src/app/accounting/invoices/page.tsx`):** Kebijakan *Delivery-Based Invoicing* (SR-01/SR-02) dan pengenaan pajak daerah PBJT 10% (SR-18).
14. **Tagihan Vendor (`/accounting/vendor-bills`, `src/app/accounting/vendor-bills/page.tsx`):** Three-Way Matching (PO vs Penerimaan vs Tagihan) dan penolakan barang cacat (SR-06).
15. **Pembayaran Kas & Bank (`/accounting/payments`, `src/app/accounting/payments/page.tsx`):** Pencatatan penerimaan kas piutang dan pembayaran utang vendor dengan proteksi *overpayment* (SR-19).
16. **Buku Besar & Jurnal Umum (`/accounting/journal-entries`, `src/app/accounting/journal-entries/page.tsx`):** Arsip entri jurnal berpasangan (*double-entry*), Chart of Accounts (CoA), dan proteksi hak akses kasir (SR-15).
17. **Point of Sale Kasir Restoran (`/pos`, `src/app/pos/page.tsx`):** Layanan kasir gerai CAFE-JKT, keranjang pesanan, perhitungan pajak restoran PBJT 10%, dan rekonsiliasi kas penutupan sesi (SR-14).

---

## 2. MASALAH DESAIN, ANTARMUKA, DAN UI/UX

### 2.1 Konsistensi Warna & Tipografi
* **Fragmentasi Palet Warna:** Dalam satu proyek terdapat 4 konvensi pewarnaan yang saling tumpang tindih:
  - Kode heksadesimal mentah (*raw hex*): `#174A3A` (hijau tua), `#F7F8F5` (krem muda), `#202824` (charcoal), `#E5E9E4` (border abu-abu), `#C6A15B` (emas).
  - Utility bawaan Tailwind Slate: `text-slate-800`, `text-slate-500`, `bg-slate-50`, `border-slate-200`.
  - Utility warna standar Tailwind: `emerald-600`, `amber-500`, `rose-600`, `blue-600`.
  - Custom tokens: `aruna-*`, `sage-*`, `gold-*`, `charcoal-*`, dan legacy `odoo-*`.
  *Dampak:* Elemen tombol, kartu, dan teks di halaman yang berbeda memiliki saturasi dan warna border yang tidak seragam (misal: `/sales/orders` menggunakan border `#E5E9E4`, sedangkan `/page.tsx` menggunakan border `slate-200`).
* **Hirarki Tipografi Tidak Rapi:** Penggunaan skala ukuran font meloncat-loncat tanpa skala baku yang teratur: `text-[10px]`, `text-[11px]`, `text-xs`, `text-sm`, `text-base`, `text-xl`, `text-2xl`, dengan ketebalan teks ekstrim seperti `font-black` pada judul header yang mengaburkan keterbacaan teks angka keuangan.

### 2.2 Layout, Navigasi, & Sidebar
* **Dropdown Dokumen Tunggal vs Tampilan Tabel:** Pada sebagian besar modul transaksional (`/sales/orders`, `/purchase/orders`, `/inventory/products`, `/inventory/delivery`, `/accounting/invoices`, `/accounting/vendor-bills`), pengguna dipaksa memilih satu dokumen saja melalui elemen `<select>` dropdown di kanan atas. Pengguna tidak dapat melihat tabel daftar keseluruhan dokumen secara bersamaan. Pada halaman master produk (`/inventory/products`), manajer gudang tidak bisa melihat ringkasan 15 SKU dalam satu layar tabel.
* **Perilaku Sidebar di Tablet (768px - 1024px):** Sidebar menggunakan breakpoint `lg:block` untuk desktop dan `lg:hidden` untuk drawer. Di perangkat tablet (iPad/layar 768px - 1023px), sidebar otomatis tertutup dan bergantung pada tombol hamburger topbar yang posisinya berdekatan dengan breadcrumb, berisiko salah tekan (*fat-finger tap*).

### 2.3 Tabel, Formulir, dan Interaksi
* **Penggunaan Alert Bawaan Browser (`alert()`):** Lebih dari 15 aksi pengguna (gagal simpan, konfirmasi pesanan, validasi surat jalan, penutupan sesi POS, proteksi akses modul) memicu popup modal native browser `window.alert(...)`. Ini mengganggu alur kerja pengguna kasir dan finance, serta terlihat tidak profesional.
* **Refresh Seluruh Halaman (`window.location.reload()`):** Pergantian role dan reset seed memicu reload halaman penuh secara paksa daripada memanfaatkan mutasi state reaktif React atau router Next.js.
* **Input Form Angka Tanpa Formatting Currency:** Input nominal di modal pembayaran (`/accounting/payments`) dan modal sesi kasir POS menerima input angka mentah tanpa pemisah ribuan Rupiah dinamis saat mengetik.

### 2.4 Kondisi Empty, Loading, & Error State
* **Ketiadaan Skeleton Loading:** Saat mengambil data awal (`fetchOrders`, `fetchInvoices`, `fetchProducts`), aplikasi hanya mengandalkan flag `loading = true` tanpa menampilkan *skeleton loader*. Layar sering kali berkedip putih atau kosong sebelum elemen muncul tiba-tiba (*layout shift*).
* **Empty State Menghilangkan Seluruh Konten:** Pada halaman Faktur Pelanggan (`/accounting/invoices`), Pengiriman (`/inventory/delivery`), dan Pesanan Penjualan (`/sales/orders`), jika dataset kosong atau `selectedDocument` bernilai `null`, bagian detail form tidak merender apapun (kosong melompong tanpa kartu informasi ramah seperti *"Belum ada faktur yang diterbitkan"*).

### 2.5 Aksesibilitas (a11y) & Kontras
* **Kontras Teks Sekunder:** Beberapa elemen teks sekunder menggunakan `text-slate-400` atau `text-[#758078]` di atas latar belakang abu-abu muda `#F7F8F5` dengan rasio kontras di bawah 3.8:1, gagal memenuhi standar WCAG 2.1 AA (minimal 4.5:1 untuk teks biasa).
* **Label Form Kurang Asosiasi `htmlFor`:** Banyak elemen `<input>` dan `<select>` dibungkus tanpa atribut `id` dan `htmlFor` yang terhubung eksplisit, menyulitkan pengguna pembaca layar (*screen reader*).

---

## 3. MASALAH TEKNIS, BUG, & KEAMANAN DASAR

### 3.1 Temuan Bug Nyata (Terbukti dari Kode & Eksekusi)

#### 🔴 BUG 1: Konkurensi Proxy Prisma Menyebabkan Foreign Key Constraint Violation saat Reset/Seed
* **Lokasi File:** `ERP_Food-Beverage/src/lib/prisma.ts:94-96` dan `ERP_Food-Beverage/src/lib/seedData.ts:199-232`
* **Gejala:** Rangkaian tes otomatis `test_phase7.ts` dan `test_phase8.ts` mengalami *fatal error*:
  ```
  PrismaClientKnownRequestError: Invalid `prisma.salesOrder.deleteMany()` invocation:
  Foreign key constraint violated on the foreign key (code: P2003)
  ```
* **Akar Masalah:** Di `src/lib/prisma.ts`, Proxy `$transaction` menangkap array operasi Prisma. Karena operasi yang dikirim melalui proxy berupa async wrapper function, pemanggilan bawaan client melempar pesan *"Prisma Client promises..."*. Blok `catch` di baris 94 kemudian mengeksekusi:
  ```ts
  if (err?.message?.includes("Prisma Client promises")) {
    return await Promise.all(args[0]);
  }
  ```
  `Promise.all` mengeksekusi SELURUH perintah `deleteMany` secara paralel (bersamaan). Pada database SQLite dengan relasi foreign key aktif, tabel induk `SalesOrder` atau `ProductVariant` dieksekusi hapus sebelum tabel anak (`CustomerInvoice`, `DeliveryOrder`, `SalesOrderLine`) selesai dihapus, sehingga memicu pelanggaran integritas foreign key secara acak.

#### 🔴 BUG 2: Mismatch Nama Properti Kolom di Halaman Faktur Pelanggan Menghasilkan Tampilan `Rp undefined`
* **Lokasi File:** `ERP_Food-Beverage/src/app/accounting/invoices/page.tsx:290, 390, 452, 455, 458, 471, 475, 479, 518`
* **Gejala:** Halaman Faktur menampilkan angka nilai `Rp undefined` pada Subtotal Net, PBJT Restoran 10%, dan Total Tagihan Gross. Informasi pelanggan menampilkan `Kode: undefined · undefined`.
* **Akar Masalah:** Model skema Prisma `CustomerInvoice` menggunakan nama atribut:
  - `subtotalNet` (bukan `subtotal`)
  - `pbjtTax` (bukan `taxAmount`)
  - `totalGross` (bukan `totalAmount`)
  - Pada baris item `CustomerInvoiceLine`: `netPrice` dan `pbjtAmount`.
  - Pada model `Contact`: field kode adalah `id` (bukan `code`), dan tidak ada kolom `tier`.
  - Pada relasi `SalesOrder`: properti adalah `contact` (bukan `customer`).
  Komponen UI memanggil atribut yang salah sehingga selalu bernilai `undefined`.

#### 🔴 BUG 3: Data Three-Way Matching pada Tagihan Vendor Dihardcode secara Statis
* **Lokasi File:** `ERP_Food-Beverage/src/app/accounting/vendor-bills/page.tsx:291-293`
* **Gejala:** Nilai perbandingan pada tabel tagihan vendor selalu menampilkan angka:
  ```tsx
  <td className="px-6 py-3.5 text-right font-bold text-[#202824]">10</td>
  <td className="px-6 py-3.5 text-right font-black text-emerald-700 bg-emerald-50/40">8</td>
  <td className="px-6 py-3.5 text-right text-[#758078]">0</td>
  ```
* **Akar Masalah:** Kuantitas PO, Kuantitas Penerimaan Gudang (*Accepted*), dan Kuantitas yang Sudah Ditagih ditulis mentah sebagai string hardcoded (`10`, `8`, `0`), bukan diambil dari data relasi database transaksi yang bersangkutan.

#### 🔴 BUG 4: Status Faktur Mismatch pada Modul Pembayaran Kas
* **Lokasi File:** `ERP_Food-Beverage/src/app/accounting/payments/page.tsx:136`
* **Gejala:** Eksekusi script pengujian dan filter otomatis invoice mencari:
  `invoices.find((inv) => inv.status === "CONFIRMED")`
* **Akar Masalah:** Pada skema database `schema.prisma:70`, enum `InvoiceStatus` hanya memiliki nilai `DRAFT`, `POSTED`, `PAID`, dan `CANCELLED`. Faktur pelanggan yang valid berstatus `POSTED`, bukan `CONFIRMED`. Akibatnya pencarian faktur berstatus `CONFIRMED` selalu gagal / mengembalikan `undefined`.

#### 🔴 BUG 5: Model Property Mismatch pada Halaman Buku Besar (General Ledger)
* **Lokasi File:** `ERP_Food-Beverage/src/app/accounting/journal-entries/page.tsx:391, 412`
* **Gejala:** Tanggal entri jurnal menampilkan tulisan `Invalid Date` dan badge status posting tidak memiliki warna/label valid.
* **Akar Masalah:** Komponen memanggil `selectedEntry.entryDate` padahal kolom skema Prisma bernama `date`. Status posting memanggil `selectedEntry.postingStatus` padahal kolom skema bernama `state`.

#### 🔴 BUG 6: Duplikasi Kode Sesi POS saat Membuka Sesi Kasir Baru
* **Lokasi File:** `ERP_Food-Beverage/src/app/pos/page.tsx:236`
* **Gejala:** Jika kasir menutup sesi `POS01` lalu menekan tombol *"Buka Sesi Kasir"*, sistem mengirim request dengan body `{ sessionCode: "POS01" }`.
* **Akar Masalah:** Kolom `PosSession.sessionCode` memiliki indeks `@unique`. Mengirim kode `"POS01"` kedua kalinya memicu HTTP 400 atau kegagalan constraint database, alih-alih memanfaatkan penomoran sekuensial dinamis otomatis (`POS02`, `POS03`, dst.).

---

### 3.2 Analisis Validasi Input & Keamanan Dasar
* **SQL Injection:** **Aman (Low Risk)**. Seluruh interaksi database menggunakan Prisma Client dengan parameterized query. Tidak ditemukan pemanggilan mentah `prisma.$queryRawUnsafe`.
* **Autentikasi & Cookie:** Token sesi JWT ditandatangani menggunakan algoritma simetris HMAC-SHA256 (`jose`) dan disimpan pada cookie HTTP-Only dengan flag `SameSite: Lax`. Ini memitigasi pencurian token via skrip XSS.
* **CSRF (Cross-Site Request Forgery):** Proteksi CSRF mengandalkan atribut cookie `SameSite: Lax` bawaan browser modern. Belum ada header *custom request validation* (seperti `X-Requested-With` atau *Anti-CSRF Token*) pada mutasi POST/PATCH.
* **Otorisasi Role (RBAC):**
  - Modul akuntansi sensitif (General Ledger) sudah terlindungi dengan baik di level API (`/api/accounting/general-ledger` dan `/api/accounting/journal-entries`) dengan pengecekan `user.role !== Role.FINANCE && user.role !== Role.OWNER` (HTTP 403 Forbidden).
  - Namun, beberapa endpoint seperti `/api/products` dan `/api/contacts` belum menerapkan pemisahan hak edit: pengguna dengan role `SALES` atau `CASHIER` masih dapat mengirim request `POST /api/products` secara langsung jika mengetahui endpoint-nya.

---

## 4. ANALISIS FITUR: EXISTING VS KEBUTUHAN INDUSTRI ERP F&B

| Area F&B ERP | Fitur yang Sudah Ada di Proyek | Status Kebutuhan F&B | Kategori | Penjelasan & Bukti Kode |
| :--- | :--- | :---: | :---: | :--- |
| **Pajak Daerah Restoran (PBJT)** | PBJT 10% per baris pesanan, pembulatan half-up | Lengkap & Sesuai | Sesuai | Sesuai UU HKPD / pajak restoran Indonesia (SR-18, `posEngine.ts:162`). |
| **Kasir POS & Multi-Channel** | Takeaway & Dine-in di `CAFE-JKT`, sesi kasir, integrasi jurnal | Berfungsi Baik | Sesuai | Terhubung langsung dengan akun kas 1010 dan HPP 5010 (`posEngine.ts`). |
| **Kebijakan Penagihan & Credit Limit** | Delivery-based invoicing (SR-02) & credit headroom check (SR-09) | Sangat Kuat | Sesuai | Menolak tagihan sebelum kirim, melindungi piutang (`salesEngine.ts`, `creditControl.ts`). |
| **Procurement & Three-Way Match** | Validasi PO vs Penerimaan (GR Accepted) vs Tagihan | Sangat Kuat | Sesuai | Mencegah tagihan atas barang busuk/ditolak (`purchaseEngine.ts:310`). |
| **Retur Penjualan & QC** | Alur retur, inspeksi QC (ACCEPTED), credit note, restok | Sangat Kuat | Sesuai | Terintegrasi pembalikan COGS dan PBJT (`returnEngine.ts`). |
| **Visualisasi Dashboard & Tren Grafik** | 8 KPI card numerik & tabel rekonsiliasi buku besar | **BELUM ADA** | **PASTI KURANG** | Tidak ada chart line/bar sama sekali di `/dashboard` (`dashboard/page.tsx`). |
| **Notifikasi Stok Minimum (Low Stock Alert)** | Tidak ada ambang batas minimum / peringatan reorder | **BELUM ADA** | **PASTI KURANG** | Model `StockLevel` hanya mencatat `onHand` dan `reserved`. Tidak ada field ambang batas minim sehingga bahan kritis rawan habis mendadak. |
| **Tracking Kedaluwarsa & Batch/Lot Bahan Baku** | Hanya pencatatan kuantitas stok agregat per lokasi | **BELUM ADA** | **PASTI KURANG** | Sangat kritis untuk F&B. Susu, daging, dan sayuran tidak memiliki kolom tanggal kedaluwarsa (`expiryDate`) atau nomor batch pada saat barang diterima di gudang. |
| **Resep / BOM & Deduct Bahan Otomatis** | Penjualan langsung memotong SKU produk jadi yang sama | Belum Ada Resep | **PASTI KURANG** | Tiap menu F&B (misal: Rice Box) mestinya memotong bahan baku (beras, ayam, box). Saat ini diperlakukan sebagai barang jadi tunggal dengan `standardCost` statis. |
| **Pencatatan Waste / Spoilage (Bahan Basi)** | Hanya ada retur dari pelanggan (Customer Return) | Belum Ada | Opsional | Pencatatan bahan baku dapur yang basi/tumpah tanpa retur penjualan. |
| **Kitchen Display System (KDS)** | Tidak ada antarmuka khusus juru masak | Belum Ada | Opsional | Tiket pesanan dapur real-time untuk juru masak. |
| **Loyalty & Membership Pelanggan** | Hanya ada tipe pelanggan INDIVIDUAL / COMPANY | Belum Ada | Opsional | Poin reward makan, diskon ulang tahun member resto. |

---

## 5. MATRIKS TEMUAN: PRIORITAS, EFFORT, DAN BUKTI KODE

| No | Kategori Temuan | Deskripsi & Dampak | File & Baris Bukti | Prioritas | Effort |
| :-: | :--- | :--- | :--- | :-: | :-: |
| **1** | **Technical Bug** | Konkurensi `Promise.all` pada Proxy `$transaction` memicu *Foreign Key constraint error* saat eksekusi seed database. | `src/lib/prisma.ts:94-96`<br>`src/lib/seedData.ts:199-232` | **HIGH** | **S** |
| **2** | **Technical Bug** | Mismatch nama properti kolom `CustomerInvoice` (`subtotalNet`, `pbjtTax`, `totalGross`) menampilkan `Rp undefined` di UI. | `src/app/accounting/invoices/page.tsx:290, 452, 471, 479` | **HIGH** | **S** |
| **3** | **Technical Bug** | Angka pembanding 3-Way Match pada tagihan vendor dihardcode statis `10`, `8`, `0`. | `src/app/accounting/vendor-bills/page.tsx:291-293` | **HIGH** | **M** |
| **4** | **Technical Bug** | Status faktur dicari dengan `CONFIRMED` padahal enum Prisma adalah `POSTED`. | `src/app/accounting/payments/page.tsx:136` | **HIGH** | **S** |
| **5** | **Technical Bug** | Tanggal jurnal dan status posting salah properti (`entryDate`, `postingStatus`) menghasilkan `Invalid Date`. | `src/app/accounting/journal-entries/page.tsx:391, 412` | **HIGH** | **S** |
| **6** | **Technical Bug** | Hardcode `sessionCode: "POS01"` menyebabkan error unik constraint saat membuka sesi kasir kedua. | `src/app/pos/page.tsx:236` | **HIGH** | **S** |
| **7** | **Feature Missing** | Halaman `/dashboard` belum memiliki Line Chart (tren pendapatan) dan Bar Chart (top produk, perbandingan beli vs jual). | `src/app/dashboard/page.tsx:1-936` | **HIGH** | **L** |
| **8** | **Feature Missing** | Sistem belum memiliki fitur Notifikasi Stok Minimum (*Low Stock Alerts*) dan indikator reorder bahan baku F&B. | `prisma/schema.prisma:169-182`<br>`src/app/inventory/products/page.tsx` | **HIGH** | **M** |
| **9** | **UI/UX Consistency** | Palet warna dan skala font tidak seragam antara custom hex `#174A3A`, class Tailwind `slate-*`, dan tema `aruna-*`. | `tailwind.config.ts:11-84`<br>Seluruh file UI di `src/app/` | **MEDIUM** | **M** |
| **10** | **UI/UX & Feedback** | Penggunaan native browser `alert()` dan `window.location.reload()` yang mengganggu user experience kasir/admin. | `src/app/pos/page.tsx:217, 262`<br>`src/app/accounting/invoices/page.tsx:100` | **MEDIUM** | **M** |
| **11** | **UI/UX Layout** | Modul Master Produk (`/inventory/products`) tidak memiliki tabel ringkasan keseluruhan 15 SKU produk. | `src/app/inventory/products/page.tsx:187-260` | **MEDIUM** | **M** |
| **12** | **UI/UX States** | Ketiadaan Empty State dan Skeleton Loader saat memuat data tabel dan detail dokumen. | `src/app/sales/orders/page.tsx:224`<br>`src/app/accounting/invoices/page.tsx:287` | **MEDIUM** | **M** |
| **13** | **Security / RBAC** | Endpoint kontak dan produk belum membatasi izin mutasi (POST/PATCH) antar-role di luar WAREHOUSE/SALES. | `src/app/api/contacts/route.ts:25`<br>`src/app/api/products/route.ts:28` | **LOW** | **S** |
| **14** | **Fitur F&B Lanjutan** | Pelacakan tanggal kedaluwarsa (*expiry date*) bahan makanan dan nomor batch penerimaan barang. | `prisma/schema.prisma:396-407` | **LOW** | **M** |

---

## 6. RENCANA TINDAK LANJUT UNTUK FASE 2 & FASE 3

### Langkah Fase 2 (Dashboard & Visualisasi Chart):
1. **Instalasi Library:** Pasang `chart.js` dan `react-chartjs-2` untuk rendering chart canvas yang ringan, responsive, dan kompatibel dengan React 19.
2. **Pembuatan Endpoint Data Agregat:** Buat endpoint API `/api/dashboard/charts` yang mengambil data nyata dari database persisten:
   - Line Chart: Tren pendapatan/penjualan per hari, minggu, atau bulan dengan toggle periode dan filter tanggal.
   - Bar Chart 1: Top 10 produk terlaris berdasarkan kuantitas dan nilai penjualan.
   - Bar Chart 2: Penjualan per kategori (Makanan Utama, Minuman Panas, Minuman Dingin, Bakery/Snack).
   - Bar Chart 3: Perbandingan pembelian (PO) vs penjualan (SO + POS) bulanan.
3. **Penyempurnaan KPI Cards:** Tambahkan 5 metrik utama: Total Penjualan, Total Pembelian, Nilai Stok Terkini, Jumlah Item di Bawah Stok Minimum, dan Estimasi Laba Kotor (*Gross Profit*).
4. **Respon Data Kosong & Tooltip:** Tooltip angka diformat ke Rupiah (`Rp xxx.xxx`), chart responsive di tampilan mobile, serta pesan ramah saat database kosong tanpa memicu crash.
5. **Data Dummy / Seeding Khusus Demo:** Sediakan script generator transaksi historis demo terpisah agar grafik terlihat hidup saat pertama kali dipresentasikan.

### Langkah Fase 3 (Perbaikan Desain & Fitur Berdampak):
1. Perbaiki semua bug prioritas **HIGH** (Bug konkurensi `$transaction`, bug properti invoice `Rp undefined`, hardcode Three-Way Match, dan hardcode sesi POS).
2. Terapkan standarisasi Design System: satukan palet warna hijau tua Aruna (`#174A3A`), aksen emas (`#C6A15B`), kanvas krem (`#F7F8F5`), dan tipografi Inter/system sans.
3. Tambahkan 2 fitur paling berdampak tinggi bagi F&B:
   - **Fitur 1: Notifikasi Stok Minimum & Reorder Alert** (Memberi badge visual pada produk yang stoknya menipis di gudang/kafe).
   - **Fitur 2: Tampilan Tabel Master Produk Terpadu** (Menampilkan ringkasan seluruh SKU, status stok WH vs Cafe, harga, dan cost dalam satu layar).
4. Penggantian popup `alert()` dengan notifikasi feedback toast atau banner terintegrasi yang anggun.
5. Verifikasi pengujian regresi menyeluruh untuk memastikan 32 pengujian bawaan (T-01 s/d T-32) tetap berstatus 100% PASS.
