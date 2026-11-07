# Matriks kepatuhan setelah implementasi

Sumber PDF dan audit lengkap: [matriks awal dengan halaman, SR dan prioritas](../master-audit-2026-11-06/PDF_COMPLIANCE.md). F-04/F-20 adalah **Should**, F-23 **Optional**, dan 20 fitur lainnya **Must**. Prioritas asli tidak diubah. WORKING di bawah berarti layanan/API sudah dijalankan; penerimaan browser, hosting publik dan presentasi tugas tetap terpisah.

| ID | Prioritas | Perilaku implementasi | Bukti / status |
|---|---|---|---|
| F-01 | Must | Delapan aplikasi, enam role, auth/session/company scope, guard API | T01/T02, role HTTP, probe A01/A02; WORKING server, navigasi browser NOT VERIFIED |
| F-02 | Must | CRUD pelanggan, komunikasi/termin, kredit Owner, exposure/riwayat | T03/T04, CRUD dan HTTP; WORKING |
| F-03 | Must | CRUD SKU independen, kategori/UoM/vendor, harga/cost dan archive guard | T05/T06, CRUD dan HTTP; WORKING |
| F-04 | Should | Lead/opportunity, stage tervalidasi, quotation terkait | T07/T08, CRM API regression; WORKING server, interaksi Kanban NOT VERIFIED |
| F-05 | Must | Quotation/draft edit → confirmed SO, relasi customer/lead | T09/T10, workflow/HTTP; WORKING |
| F-06 | Must | Diskon maksimal 20%, Owner approval >10%, price lock | T10, probe, workflow; WORKING |
| F-07 | Must | Reservasi milik SO line/lokasi, available guard, cancel release | T11/T12, concurrent confirmation dan cancellation; WORKING |
| F-08 | Must | Delivery parsial dan backorder tanpa overdelivery | T11/T12, A12/A13; WORKING |
| F-09 | Must | Invoice hanya valid delivered, duplicate SKU ditolak, recheck posting | T19/T20, A10; WORKING |
| F-10 | Must | Exposure tidak berkurang oleh draft invoice, credit guard atomik | T03/T04/T09, A09; WORKING |
| F-11 | Must | RFQ/PO, draft edit/confirm/cancel, tidak menambah stok saat confirm | T15/T16 dan workflow; WORKING |
| F-12 | Must | QC accepted/rejected, received cap, sisa receipt, movement/GRNI | T17/T18, CRUD selector dan source; WORKING |
| F-13 | Must | Bill harga PO dan accepted quantity, cumulative billing cap | T21/T22, A06, variance/reversal; WORKING |
| F-14 | Must | COGS/ledger balanced, sumber movement/journal dan reversal | T25/T26, adjustment/refund/reversal; WORKING; saldo awal dua perusahaan lama perlu rekonsiliasi |
| F-15 | Must | Pembayaran customer/vendor parsial/penuh, overpay guard | T23/T24, A14, vendor payment/reversal, concurrency; WORKING |
| F-16 | Must | POS cart/method/session/stock, persisted checkout/receipt/refund | T27/T28, A03/A04/A05, refund; WORKING server, cetak browser NOT VERIFIED |
| F-17 | Must | Close sesi milik kasir, retry memakai ringkasan tersimpan | T28, A11, closed-session refund case; WORKING |
| F-18 | Must | QC Warehouse → credit Finance, cumulative caps, original net/tax/cost | T29/T30, A07/A08; WORKING |
| F-19 | Must | Transfer lokasi nyata, reserved protection, movement trace | T13/T14 dan unauthorized guards; WORKING |
| F-20 | Should | KPI database, AR/AP tanpa double count, nol Bank valid, PBJT/POS, metadata/source links | T31/T32, chart regression; WORKING server, render/filter browser NOT VERIFIED |
| F-21 | Must | Audit atomik, before/after, notes, relasi sumber, no auto-reconciliation journal | T02/T32, rollback/source-trail/reversal; WORKING |
| F-22 | Must | PBJT 10% per net line setelah diskon, retur pajak asli | T19/T27/T29, discounted return A07; WORKING |
| F-23 | Optional | Loyalitas digital | MISSING; ditunda secara sah |

## Keputusan SR

Permintaan stakeholder yang bertentangan tetap dipertahankan dalam [Decision Log](../reports/DECISION_LOG.md); keberhasilan tidak diartikan memenuhi dua kebijakan yang saling bertentangan.

| SR | Kebijakan / hasil setelah perbaikan |
|---|---|
| SR-01 / SR-02 | Penagihan barang sebelum delivery ditolak; delivered-only invoice dipilih. |
| SR-03 / SR-04 | POS stok minus ditolak; available dan reserved dilindungi pada delivery/POS/transfer. |
| SR-05 / SR-06 | Tagihan atas seluruh PO sebelum acceptance ditolak; accepted quantity dan harga PO dipilih. |
| SR-07 / SR-08 | Diskon 0–20% terkontrol; di atas 10% membutuhkan Owner, harga terkunci setelah confirmation. |
| SR-09 | Credit exposure memasukkan posted receivable dan komitmen belum ditagih; draft invoice tidak menciptakan headroom. |
| SR-10 | Partial delivery menghasilkan backorder sisa dan pengakuan fisik/COGS hanya untuk yang dikirim. |
| SR-11 | Retur yang lolos QC mengembalikan stok/cost serta membalik nilai bersih dan PBJT asli, dengan cumulative cap. |
| SR-12 | Transfer memindahkan lokasi tanpa mengubah total persediaan perusahaan/valuasi. |
| SR-13 | Posting/retry dilindungi lifecycle dan transaksi; request key mengembalikan hasil yang sama; sumber dan audit disimpan. |
| SR-14 | Session closing dibatasi pemilik sesi dan mempertahankan summary semula. |
| SR-15 | Role guard berada di server; Cashier ditolak dari GL dan master mutation; status akun/sesi diperiksa ulang. |
| SR-16 | Tahap lead membutuhkan data customer/nilai yang valid; lead dan quotation harus customer yang sama. |
| SR-17 | SKU tidak dicocokkan otomatis berdasarkan nama; stock/price/cost per varian tetap independen. |
| SR-18 | PBJT per baris net setelah diskon, dibulatkan Rupiah; bukan komponen estimasi margin. |
| SR-19 | Payment positif, parsial/penuh sampai outstanding; overpay ditolak atomik. |
| SR-20 | Dashboard menampilkan sumber/selisih dan tidak membuat jurnal untuk menyembunyikan mismatch. |

## S-01–S-16 dan alur ujung ke ujung

| Screen | Halaman implementasi | Status penerimaan visual |
|---|---|---|
| S-01 | Login, App Switcher, sidebar sesuai role | NOT VERIFIED |
| S-02 | `/sales/contacts`, `/master/customers`, `/master/vendors` | NOT VERIFIED |
| S-03 | `/inventory/products`, `/master/products` | NOT VERIFIED |
| S-04 | `/crm/leads`, `/master/leads` | NOT VERIFIED |
| S-05/S-06 | `/sales/orders`, draft editor/approval/confirm | NOT VERIFIED |
| S-07 | `/inventory/transfers` | NOT VERIFIED |
| S-08 | `/inventory/delivery`, quantity/backorder controls | NOT VERIFIED |
| S-09 | `/accounting/invoices`, source-based invoice creation/posting | NOT VERIFIED |
| S-10 | `/purchase/orders`, RFQ draft/confirm | NOT VERIFIED |
| S-11 | `/inventory/receipts`, accepted/rejected quantity form | NOT VERIFIED |
| S-12 | `/accounting/vendor-bills`, three-way match/post/pay | NOT VERIFIED |
| S-13 | `/accounting/journal-entries`, `/accounting/payments`, `/accounting/reports`, `/master/accounts` | NOT VERIFIED |
| S-14 | `/pos`, checkout/struk/history/session/refund | NOT VERIFIED |
| S-15 | `/inventory/returns`, QC dan credit note | NOT VERIFIED |
| S-16 | `/dashboard`, source metrics/reconciliation/charts | NOT VERIFIED |

Rantai SO → delivery → invoice → payment dan PO → accepted receipt → bill → vendor payment dieksekusi melalui engine/handler dengan database sementara; bukti T dan integritas memuat nilai yang diharapkan/aktual. Lead → linked quotation tersedia melalui UI dan validasi sumber; alur klik lengkap belum dijalankan lewat browser. Daftar ini sengaja tidak mengganti NOT VERIFIED dengan PASS hanya karena route berhasil dibuild.

Video, presentasi, pembagian kontribusi manusia, Decision Defense, URL publik dan demonstrasi enam role tetap merupakan deliverable tugas tersendiri. Dokumen historis tidak membuktikan deliverable tersebut telah dilakukan.
