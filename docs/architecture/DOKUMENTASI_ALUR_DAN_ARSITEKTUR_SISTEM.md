# Arsitektur ERP Rasa Aruna Kitchen

Aplikasi menggunakan Next.js App Router, React, TypeScript, Prisma, dan SQLite untuk operasi lokal. Setiap tenant lokal memakai file database terpisah. Profile demo dibuat dari schema dan fixture proyek pada folder mandiri dengan registri tenant sendiri.

```mermaid
flowchart TD
    U["Browser dan sesi per peran"] --> P["Next.js pages dan formulir"]
    P --> A["Route handlers dan validasi HTTP"]
    A --> R["JWT, versi sesi, role, tenant aktif"]
    R --> E["Engine Sales, Purchase, Inventory, Accounting dan POS"]
    E --> T["Prisma dan transaksi atomik"]
    T --> D["SQLite tenant aktif"]
    T --> L["Audit log dan idempotency key"]
    E --> J["Mutasi stok dan jurnal"]
    J --> F["Dashboard dan rekonsiliasi"]
```

JWT menyimpan identitas tenant dan versi sesi. Request memeriksa ulang status akun dan peran dari tenant aktif. Pergantian perusahaan menghapus sesi, lalu meminta login untuk perusahaan tujuan. Validator database memakai jalur tenant yang ditetapkan. Jika jalur tersebut hilang, operasi ditolak.

```mermaid
erDiagram
    Contact ||--o{ CrmLead : "memiliki prospek"
    CrmLead o|--o{ SalesOrder : "menjadi penawaran"
    Contact ||--o{ SalesOrder : "memesan"
    SalesOrder ||--|{ SalesOrderLine : "memuat"
    SalesOrderLine ||--o{ StockReservation : "mereservasi"
    ProductVariant ||--o{ StockLevel : "tersedia per lokasi"
    WarehouseLocation ||--o{ StockLevel : "menyimpan"
    ProductVariant ||--o{ VendorPrice : "harga vendor per tier"
    Contact ||--o{ VendorPrice : "menetapkan harga"
    SalesOrder ||--o{ DeliveryOrder : "dipenuhi"
    SalesOrder ||--o{ CustomerInvoice : "ditagih"
    DeliveryOrder o|--o{ CustomerInvoice : "dapat menjadi sumber"
    CustomerInvoice ||--o{ ReturnRequest : "dapat diretur"
    ReturnRequest ||--o{ CreditNote : "menjadi kredit"
    Contact ||--o{ PurchaseOrder : "memasok"
    PurchaseOrder ||--o{ GoodsReceipt : "diperiksa"
    PurchaseOrder ||--o{ VendorBill : "dicocokkan"
    GoodsReceipt o|--o{ VendorBill : "dapat menjadi sumber"
    CustomerInvoice o|--o{ Payment : "dibayar"
    VendorBill o|--o{ Payment : "dibayar"
    PosSession ||--o{ PosOrder : "mencatat transaksi"
    JournalEntry ||--|{ JournalItem : "memiliki debit dan kredit"
    Account ||--o{ JournalItem : "menerima posting"
    User o|--o{ AuditLog : "melakukan tindakan"
```

Engine menulis jurnal terposting dan mutasi stok dalam transaksi tenant yang sama. Nomor sumber pada `JournalEntry.sourceDocument` dan `StockMove.documentRef` menghubungkan posting ke dokumen. Sejumlah hubungan sumber adalah referensi nomor karena semua jenis transaksi berbagi jurnal atau tabel mutasi yang sama. `RequestIdentity` menyimpan hasil replay berdasarkan aktor, operasi, kunci, dan hash payload.

Diskon di atas 10% memerlukan keputusan Owner atas versi penawaran aktif. Keputusan disimpan di `AuditLog` dengan identitas, waktu, alasan, dan versi. Draft lama tanpa bukti Owner yang lengkap kembali menunggu keputusan. Dokumen yang sudah dikonfirmasi mempertahankan status serta audit historis.

Untuk Vercel, database harus persisten dan lintasan PostgreSQL harus diuji terhadap release yang akan dipromosikan. Lihat [kesiapan deployment](../reports/final-remediation/DEPLOYMENT_READINESS.md).
