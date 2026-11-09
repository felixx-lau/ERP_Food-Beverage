# Pemeriksaan kesesuaian PDF — 7 November 2026

Kesimpulan: fungsi bisnis utama telah didukung implementasi dan seluruh suite otomatis yang dijalankan lulus. Namun aplikasi belum dapat dinyatakan memenuhi 100% ketentuan PDF atau seluruh pengujian manual browser. Panel tes beranda bermasalah, bukti visual terbaru belum lengkap, deployment publik belum diverifikasi, serta beberapa artefak penyerahan belum ditemukan.

Acuan: `24SI1 - Group 03 - Food and Beverage.pdf`, 34 halaman; khususnya SR-01–SR-20, F-01–F-22, S-01–S-16, T-01–T-32, serta bagian 8–13. Teks dokumen diekstrak dengan Poppler dan halaman POS/T-27/T-28 diperiksa secara visual. Penilaian ini memakai kode kerja saat pemeriksaan, termasuk perubahan lokal yang belum di-commit. Tidak mengubah kode aplikasi atau database operasional.

## Hasil pengujian yang benar-benar dijalankan ulang

Perintah:

```sh
python3 scripts/verify_isolated.py --suites test_phase2_3 test_phase4 test_phase5 test_phase6 test_phase7 test_phase8 test_charts test_crud test_pdf_cases test_integrity --audit-probes --build
```

| Pengujian | Hasil |
|---|---|
| phase2_3 | 23 PASS, 0 FAIL |
| phase4 | 27 PASS, 0 FAIL |
| phase5 | 14 PASS, 0 FAIL |
| phase6 | 12 PASS, 0 FAIL |
| phase7 | 19 PASS, 0 FAIL |
| phase8 | 17 PASS, 0 FAIL |
| charts | 16 PASS, 0 FAIL |
| CRUD | 8 kelompok PASS |
| Kasus PDF T01–T32 | 32 PASS, baseline baru per kasus |
| Integrity | 10 kelompok PASS |
| Audit expectations | 14 PASS |
| TypeScript | Exit 0 |
| Build produksi Next.js | Exit 0 |

128 assertion suite lama + 8 kelompok CRUD + 32 kasus PDF + 10 kelompok integritas + 14 probe audit menghasilkan 192 penanda/hasil PASS. Unit hitung berbeda, sehingga ini bukan 192 skenario PDF atau 192 fitur.

Server produksi hasil build kemudian dijalankan pada port 3107 dengan database sementara dan secret khusus uji. `scripts/smoke_http.py` lulus 13 kelompok: login/session, penolakan anonymous, CRUD sembilan master termasuk retry/stale conflict/archive/restore/delete, edit/cancel draft SO, serta penolakan GL dan mutasi master oleh Cashier. Server dihentikan dan dihidupkan kembali; record checkpoint tetap ditemukan setelah login baru. Server uji sudah dihentikan.

Bukti: [ringkasan](evidence/results.json), [expected/actual T01–T32](evidence/pdf-cases-results.json), [HTTP](evidence/http-smoke-results.json), [restart](evidence/http-restart-results.json), [probe audit](evidence/audit-probes.json), [build](evidence/build.log). Hash empat database dan registry asli tetap sama setelah semua tes; [pemeriksaan hash](evidence/original-data-unchanged.json).

## Kesesuaian fungsi dan aturan

| Lingkup PDF | Penilaian dan bukti |
|---|---|
| F-01, SR-15: enam role, delapan aplikasi Owner, pembatasan Cashier | Konfigurasi dan handler/API lulus T01/T02 serta HTTP; tampilan aktual delapan pintasan belum diuji lewat browser pada sesi ini. Panel tes UI mempunyai cacat tersendiri, lihat di bawah. |
| F-02/F-10: kredit dan exposure | T03/T04/T09 lulus; C02 headroom Rp50.000, order Rp105.600 ditolak. |
| F-03: SKU/lokasi independen | T05/T06 lulus; harga, standard cost, WH/CAFE terpisah. |
| F-04/F-05/F-06: CRM, quotation, SO, diskon | T07–T10 lulus; persetujuan Owner untuk diskon >10%, price lock setelah confirm. Alur klik lead sampai quotation belum dibuktikan di browser. |
| F-07/F-08/F-19: reservasi, delivery, backorder, transfer | T11–T14 lulus; 8 ordered/5 delivered menghasilkan backorder 3 dan COGS Rp130.000; transfer menjaga total perusahaan. |
| F-11/F-12/F-13: PO, receipt, bill | T15–T18/T21/T22 lulus; 8 accepted dari 10 datang, bill Rp96.000; rejected tidak menambah hak billing. |
| F-09/F-14/F-15/F-22: invoice, jurnal, pembayaran, PBJT | T19–T26 lulus; invoice Rp264.000, payment Rp100.000 menyisakan Rp164.000, overpayment dan posting ganda dicegah. |
| F-16/F-17: POS dan close session | T27/T28 dan suite phase7 lulus, termasuk QRIS/Bank pada phase7; fixture T27 suite PDF memakai CASH, lihat catatan di bawah. |
| F-18: inspeksi retur/credit note | T29/T30 lulus; 1 accepted menghasilkan credit Rp52.800 dan pembalikan COGS Rp26.000; pending QC ditolak. |
| F-20/F-21: dashboard, rekonsiliasi dan audit | T31/T32 lulus; baseline 616 unit/Rp12.214.000; simulasi mismatch tidak membuat jurnal penyeimbang. |
| F-23: loyalitas | Optional, tidak wajib untuk kelulusan fitur Must. |

Keputusan mengutamakan SR-02 dibanding SR-01, SR-04 dibanding SR-03, SR-06 dibanding SR-05, serta SR-08 dibanding SR-07 konsisten dengan kontrol yang diuji. PDF memang meminta konflik diselesaikan melalui Decision Log; menerapkan tuntutan stakeholder yang kalah secara literal akan bertentangan dengan keputusan tersebut.

## Temuan yang perlu ditindaklanjuti

1. **Panel tes beranda belum bisa diandalkan sebagai bukti penilaian.** Di `src/app/page.tsx:87–138`, T01/T02 memanggil `handleSwitchRole`, sementara `src/app/api/auth/switch-role/route.ts` menolak switch pada produksi, atau ketika flag demo tidak aktif. Fungsi UI tidak menghentikan tes ketika request switch gagal. T01 menghitung katalog Owner statis dan tetap dapat mengklaim berhasil login Owner walaupun sesi masih role lain. T02 saat sesi Owner tetap meminta GL sebagai Owner; akses yang sah dapat membuat panel menyatakan FAIL. Identitas/audit pada teks hasil juga tidak dibuktikan dengan pembacaan audit aktual. Temuan berdasarkan penelusuran kode; tidak dieksekusi melalui klik browser. Perbaikan seharusnya meminta login role yang sesuai dan memverifikasi sesi/response/bukti audit sebenarnya, tanpa membuka bypass keamanan.

2. **Fixture T27 suite PDF tidak persis mengikuti metode bayar PDF.** Helper `pos()` di `scripts/test_pdf_cases.ts:40` memakai CASH; PDF halaman 29 meminta QRIS/Bank. Suite `test_phase7.ts` sudah memakai `QRIS / Bank` dan lulus, jadi jalur QRIS bukan belum diuji sama sekali. Namun laporan T27 suite PDF perlu menggunakan fixture yang tepat dan memeriksa payment method/session/source journal agar bukti tidak ambigu.

3. **Penerimaan browser S-01–S-16 belum terbukti lengkap pada kode terbaru.** Build, layanan, dan HTTP tidak membuktikan semua tombol/form, validasi visual, screenshot kasus negatif, struk, refresh browser atau enam role melalui UI. Screenshot historis tersedia, tetapi tidak otomatis menjadi bukti setiap kasus T pada revisi saat ini. PDF memperbolehkan warna/branding/styling bebas; struktur, field inti, status, search/filter/group-by dan related docs perlu ditinjau layar per layar. Tidak ada dasar untuk menilai gagal hanya karena warna berbeda dari Odoo.

4. **URL publik belum diverifikasi.** PDF halaman 1–2 dan 31–32 mewajibkan public URL aktif serta persistensi. Tes lokal dan restart server lulus, tetapi tidak membuktikan deployment publik, HTTPS/cookie browser atau storage host. SQLite memerlukan disk persisten pada host yang sesuai. Tidak melakukan deploy dalam audit ini.

5. **Paket penyerahan belum lengkap berdasarkan berkas yang ditemukan.** README, Decision Log, diagram, laporan dan screenshot tersedia. README masih memakai M1–M4 tanpa nama mahasiswa; Team Agreement rinci, contribution table dengan commit per anggota, video <=10 menit dan slide belum ditemukan sebagai artefak lengkap. Riwayat yang diperiksa memakai author Felix; ini bukan bukti anggota lain tidak bekerja. AI disclosure README masih menyebut Antigravity dan perlu diperbarui dengan bantuan Codex yang benar-benar dipakai. Checklist historis yang mengklaim Team Agreement sudah tersedia tidak cukup menjadi bukti.

6. **Dua perusahaan tambahan memiliki mismatch persediaan.** Pemeriksaan read-only saat ini: PT Kuliner Nusantara dan PT Resto Nusantara Baru masing-masing memiliki stok 15 unit bernilai Rp225.000, tetapi akun 1030 Rp12.214.000 (selisih Rp11.989.000). Perusahaan default dan PT Morie Matcha cocok: 616 unit/Rp12.214.000. Semua database `quick_check=ok`, tanpa pelanggaran foreign key dan tanpa stok negatif/over-reserved. Ini kondisi data perusahaan tambahan; bukan kegagalan baseline T31. Perlu rekonsiliasi saldo pembuka berdasarkan dokumen sah, bukan jurnal fiktif untuk memaksa cocok. [Bukti data aktual](evidence/current-database-check.json).

7. **Pemetaan screen pada dokumentasi terdahulu perlu diselaraskan.** `docs/implementation-2026-11-06/COMPLIANCE.md` menukar beberapa screen. PDF yang benar: S-05 Sales Order; S-06 Delivery; S-07 Transfer; S-08 Purchase; S-09 Receipt; S-10 Customer Invoice; S-11 Vendor Bill; S-12 Payment. Kesalahan mapping dapat menyulitkan penilaian walaupun route tersedia.

## Prioritas sebelum pengumpulan

1. Benahi panel T01/T02 dan fixture/bukti T27; ulangi tes setelah perubahan.
2. Jalankan acceptance browser enam role dan kumpulkan bukti wajib T01–T32 pada baseline salinan bersih; hindari reset database bisnis.
3. Siapkan dan uji URL publik dengan storage persisten, refresh dan restart pada host tujuan.
4. Lengkapi artefak kelompok, AI disclosure, pemetaan screen, video, slide dan Decision Defense.
5. Rekonsiliasi perusahaan tambahan sebelum dipakai sebagai contoh laporan keuangan.

Jawaban atas pertanyaan pengguna: **pengujian otomatis yang tersedia bisa dijalankan dan semuanya lulus pada sesi ini; keseluruhan website dan paket tugas belum layak diklaim 100% sesuai PDF.** Tidak memberikan persentase nilai karena bagian UI, hosting dan defense belum diverifikasi dan berbobot tersendiri dalam rubrik.
