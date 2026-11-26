# Kesiapan deployment

**Status Vercel: BLOCKED untuk promosi dan penerimaan publik.** Pada 25 November 2026, `/login` menjawab 200, `/api/auth/me` anonim menjawab 401, dan `/api/version` menjawab 404. Sesi aktif enam role dan konfigurasi penyimpanan khusus release publik belum dapat diverifikasi. [Respons publik](evidence/public-http.json)

## Pemeriksaan release lokal

| Area | Observasi |
| --- | --- |
| Build | Next.js production build dan typecheck lulus pada snapshot. `GET /api/version` dari release lokal mengembalikan versi aplikasi dan label revisi build. |
| Autodeploy | `vercel.json` menonaktifkan autodeploy branch `main`. Catat commit release dan ID build saat staging. |
| Storage | Schema checkout memakai SQLite. Jalur default menolak runtime serverless Vercel/Lambda. Siklus SQLite telah diuji pada penyimpanan lokal persisten. |
| Env | Build marker menerima SHA Git yang valid dari `ERP_BUILD_REVISION` atau `VERCEL_GIT_COMMIT_SHA`. JWT secret dan URL database adalah server-only. Env aktual produksi memerlukan akses deployment. |
| Auth | Session membaca ulang role, status aktif, versi sesi dan tenant. Sesi dihapus saat logout atau pergantian tenant. HTTP 401/403 dan sesi antartenant diuji lokal. |
| Error | Kelas validasi memetakan error bisnis ke respons HTTP. Jalur database tenant yang hilang gagal tanpa fallback berdasarkan nama. |
| Migrasi | Remediasi lokal memakai tabel dan kolom yang sudah ada. Fresh SQLite schema dan dataset lulus validasi. Kompatibilitas adapter dan migrasi PostgreSQL untuk release ini masih terbuka. |

## Checklist promosi

1. Tentukan release commit, otorisasi deploy, staging URL, admin lingkungan, dan enam credential dalam tenant demo PostgreSQL yang terpisah dari database operasional.
2. Buat snapshot database staging dan dokumentasikan release Vercel yang sedang aktif. Pastikan koneksi database persisten, secret JWT unik, dan konfigurasi build berada pada scope yang tepat.
3. Bangun kandidat dengan adapter PostgreSQL yang dikelola dan versi Prisma sesuai. Uji migrasi pada clone, lalu verifikasi transaksi antar-tenant, sequence, penguncian transaksi dan rekonsiliasi awal.
4. Jalankan `/api/version`, enam login, O2C, P2P, POS, simulasi rekonsiliasi, retur dan smoke hak akses. Untuk pembayaran parsial, rekam saldo Rp164.000 dan Rp66.000 sesudah refresh serta login ulang. Uji persistensi setelah instance berpindah atau redeploy staging.
5. Minta persetujuan pemilik untuk promosi. Setelah promosi, cek URL, build marker, login dan operasi baca menggunakan akun yang berizin. Simpan bukti tanpa credential atau nilai env.

## Rollback

Jika kandidat gagal, pertahankan release lama, simpan ID build dan temuan, lalu perbaiki di staging. Jika kegagalan terjadi sesudah promosi, promosikan kembali deployment terakhir yang sehat. Untuk perubahan data yang sudah terposting, Finance menilai transaksi dan menggunakan reversal terdokumentasi. Pemulihan snapshot database hanya dilakukan sesudah penilaian dampak transaksi, persetujuan, dan verifikasi salinan backup.
