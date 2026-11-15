# Aruna Assistant di komputer ini

Konfigurasi lokal, 14 November 2026. Asisten memakai **Langflow 1.13.0 + Ollama + Qwen3 4B Instruct Q4**. Tidak memerlukan langganan atau API model berbayar. Komputer perlu menyala; pemakaian listrik, ruang penyimpanan, dan internet saat mengunduh model tetap ada.

## Membuka

1. Buka `http://127.0.0.1:3000` dan login dengan akun ERP perusahaan yang hendak dikerjakan.
2. Klik **logo robot kecil di kanan bawah**. Panel terbuka dengan animasi; pengguna dengan preferensi pengurangan gerak mendapat tampilan tanpa animasi.
3. Pilih contoh tugas sesuai peran atau tulis tugas sendiri.
4. Untuk penawaran, RFQ, atau transfer, buka **Tinjau rincian** pada kartu, periksa item/harga/lokasi, kemudian klik **Simpan draft** atau **Batalkan**.
5. Setelah tersimpan, klik nomor dokumen untuk melanjutkan di modul ERP.

Jika layanan berhenti setelah komputer dimatikan, klik dua kali **`Mulai Asisten ERP.command`** di folder proyek. Jendela itu memeriksa layanan yang sudah berjalan, menyalakan yang belum aktif, lalu membuka ERP. Tidak melakukan reset/seed database atau membuat transaksi otomatis.

Flow dapat dilihat di `http://127.0.0.1:7870/flow/ef93f8ab-2c4a-48e5-962f-fc7d47b9720e`.

## Pekerjaan yang tersedia

| Peran | Bantuan yang tersedia |
|---|---|
| Owner | Briefing, stok, order, invoice, sesi POS, rencana restock, proposal ketiga jenis draft |
| Sales | Pelanggan, stok/harga jual, order penjualan, invoice, draft penawaran dan pesan penagihan |
| Procurement | Vendor, stok/biaya, PO, rencana restock, draft RFQ |
| Warehouse | Stok, kuantitas order masuk/keluar, rencana restock, draft transfer |
| Finance | Stok/biaya, kontak, order, invoice dan piutang terlambat, draft pesan penagihan |
| Cashier | Stok kafe, sesi POS milik sendiri, panduan buka/tutup sesi |

Semua peran mendapat panduan alur penggunaan ERP. Panduan bawaan belum memuat SOP khusus perusahaan atau dokumen pribadi yang belum diunggah/dihubungkan.

Contoh permintaan:

- “Buat briefing pekerjaan yang perlu ditindaklanjuti.”
- “Cari stok matcha dan tampilkan stok tersedia per lokasi.”
- “Tampilkan lima invoice yang masih harus ditagih, lalu susun draft pesan untuk salah satunya.”
- “Buat rencana restock WH-JKT dengan ambang 10 dan target 30. Perhitungkan PO yang masih terbuka.”
- “Cari pelanggan [nama pelanggan]. Siapkan penawaran untuk SKU [SKU terdaftar], 5 unit, harga master, tanpa diskon.”
- “Siapkan RFQ ke vendor [ID vendor] untuk SKU [SKU terdaftar], 20 unit.”
- “Siapkan transfer 3 unit SKU [SKU terdaftar] dari WH-JKT ke CAFE-JKT.”

Nama, SKU, dan ID harus terdaftar pada perusahaan aktif. Jika ada beberapa kecocokan atau kuantitas belum disebutkan, asisten perlu meminta rincian. Ambang/target restock adalah asumsi perencanaan; nilai default 10/30 belum merupakan kebijakan persediaan perusahaan.

## Perilaku draft

Tool AI hanya menyiapkan **proposal**. Proposal terikat pengguna dan perusahaan, memiliki sidik data tetap, dan berlaku 30 menit. Kartu menampilkan rincian dari backend, bukan dari teks yang dikarang model.

Klik **Simpan draft** memakai sesi login ERP yang masih aktif, memeriksa ulang peran dan versi produk/kontak, lalu menjalankan mesin bisnis ERP yang sudah ada. Request ulang dengan proposal sama mengembalikan dokumen yang sama. Draft tidak mengubah stok atau jurnal. Konfirmasi order, validasi transfer, posting, dan pembayaran dilakukan melalui modul ERP seperti biasa. Perubahan data master meminta proposal baru.

Proposal dapat ditemukan kembali ketika panel dibuka. Riwayat pesan pada panel belum disimpan di browser setelah halaman dimuat ulang. Langflow menyimpan konteks percakapan terbatas, dipisahkan berdasarkan perusahaan, pengguna, dan ID chat baru; tombol percakapan baru membuat ID baru.

## Susunan lokal

```text
Widget ERP → /api/chatbot → Langflow Agent → Ollama lokal
                                 ↓
                    Aruna ERP Tools (izin 5 menit)
                                 ↓
                     /api/agent/tools (baca/proposal)
                                 ↓
               Kartu tinjauan → klik Simpan draft
                                 ↓
                  Mesin bisnis ERP → DRAFT + audit
```

- ERP: `127.0.0.1:3000`.
- Langflow: `127.0.0.1:7870`, layanan dan flow privat khusus proyek di `.local/langflow/`; flow pada aplikasi Langflow lama tidak diganti.
- Ollama: `127.0.0.1:11434`; runtime dan model khusus proyek di `.local/`.
- Konfigurasi integrasi: `.env.local`, hanya server; key baru tidak dimasukkan ke kode browser atau ekspor flow.
- Penyimpanan proposal/run: `.agent-data/`, diabaikan Git. Database bisnis tetap di folder Prisma yang sudah ada.
- Log layanan: `.local/logs/`; ekspor flow tanpa kredensial: `aruna-erp-local.langflow.json`.
- Komponen flow: `aruna_local_model.py` dan `aruna_erp_tool.py`; `demo_operasional.py` adalah latihan terpisah memakai data simulasi.

Endpoint baru:

| Endpoint | Kegunaan |
|---|---|
| `POST /api/agent/tools` | Capability sementara; action diizinkan per peran dan perusahaan |
| `GET /api/agent/proposals` | Proposal pengguna login pada perusahaan aktif |
| `POST /api/agent/proposals/:id/execute` | Klik pengguna untuk menyimpan draft yang ditinjau |
| `POST /api/agent/proposals/:id/cancel` | Membatalkan proposal sendiri |

Pengguna tidak dapat memasukkan role/company ke payload untuk memperoleh izin tambahan. Gateway memverifikasi status akun dan versi sesi dari database. Capability berhenti berlaku saat run berakhir. Tool tidak menerima SQL, kode bebas, URL bebas, atau operasi posting.

## Batas versi lokal

Mac ini memiliki RAM 8 GB. Model dibatasi pada konteks 4.096 token, empat pesan memori, dan lima langkah model. Satu pesan agent diproses pada satu waktu; pengguna lain mendapat pesan untuk menunggu. Waktu respons bergantung panjang percakapan dan beban komputer. Hasil pencarian dibatasi, dengan penanda jika masih ada hasil lain.

Versi ini berjalan pada komputer ini. Akses seluruh staf melalui jaringan kantor, kapasitas banyak pengguna, jadwal otomatis, pengiriman WhatsApp/email, koneksi dokumen perusahaan, dan SOP khusus belum dikonfigurasi. Briefing dapat diminta langsung melalui chat. Model kecil tetap perlu ditinjau untuk pemilihan item dan keputusan bisnis.

## Pemeliharaan dan pemeriksaan

Sesudah mengubah source ERP, jalankan `npm run build`, hentikan proses ERP milik proyek, lalu buka kembali file mulai. Source Python komponen tidak otomatis mengubah flow tersimpan; jalankan `python3 scripts/setup_local_agent.py` untuk memperbarui **flow integrasi ini saja**. Script menyimpan identitas flow di `.local/agent-setup.json` dan memakai ulang key integrasi yang telah dibuat.

Pengujian transaksi dilakukan pada salinan sementara:

```bash
python3 scripts/verify_isolated.py --suites test_agent
```

Pengujian itu memeriksa pembatasan peran, biaya yang tersembunyi dari kasir, pemisahan perusahaan, pencabutan sesi, validasi SKU/kuantitas, kepemilikan proposal, sidik data, kedaluwarsa, pembatalan, perubahan master, penyimpanan sekali, perhitungan mesin transaksi, dan stok/jurnal yang tetap saat membuat draft. Database perusahaan asli diperiksa hash-nya agar pengujian tidak mengubahnya.

Pemeriksaan browser menggunakan profil pengujian tersendiri dan salinan ERP sementara, bukan profil browser pribadi. Hasil pemeriksaan lokal disimpan di `.local/logs/`.

Referensi model: [Qwen3 4B Instruct Q4 pada katalog resmi Ollama](https://ollama.com/library/qwen3%3A4b-instruct-2507-q4_K_M).
