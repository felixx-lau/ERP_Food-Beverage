# Pembaruan UI — 7 November 2026

## Perubahan

- Kartu menggunakan token gradasi pastel bersama: `linear-gradient(135deg, #E1EBFF 0%, #E8E6FF 50%, #EEE0FB 100%)`. Kartu aplikasi Home, App Switcher, dan semua KPICard (termasuk dashboard dan retur) memakai permukaan ini dengan teks gelap. Gradasi utama tombol/navigasi tetap menggunakan token tersendiri; badge dan ikon status memakai warna semantik.
- Panel “Selamat datang” dan sidebar menggunakan token gradasi yang sama persis: `--sidebar-gradient` (`165deg`, `#172F79`, `#282469`, `#452379`). Judul panel putih dan teks pendukung terang.
- Teks isi tabel 15px, judul kolom 13px, tombol aksi dalam tabel 14px. Aturan bersama juga mencakup label kecil pada tabel lama dan tabel di dialog.
- Entrance 1000ms, pergeseran 16px, easing lembut, stagger 100ms. IntersectionObserver dan WeakSet menjadwalkan animasi satu kali per elemen; pembaruan teks/input tidak memulainya kembali. Tidak ada status awal tersembunyi atau penundaan interaksi. MutationObserver hanya memantau penambahan konten. Reduced motion membatalkan animasi aktif.
- Scroll native dipertahankan. Anchor memakai CSS smooth scrolling; preferensi reduced motion menggunakan scroll otomatis. Root HTML menyertakan penanda smooth scrolling Next.js.
- AnimatedChart memakai Chart.js yang sudah terpasang. Canvas dibuat saat viewport terlihat, entrance 1600ms, pembaruan data 420ms, hover 160ms, tooltip 120ms. Grafik garis memakai progressive clipping, batang tumbuh, dan doughnut berputar/membesar. Canvas dipertahankan selama refresh dan hasil kosong agar filter tidak mengulang entrance. Revisi data ikut dibandingkan untuk menjaga callback tooltip tetap mutakhir.
- ActionButton bersama menyediakan Detail/Eye, Edit/Pencil, Arsipkan/Archive, Pulihkan/ArchiveRestore, dan Hapus/Trash2, dengan teks, focus-visible, disabled, serta loading. Dipakai pada master, daftar dokumen, editor draft, tim, produk, CRM, baris SO/PO, dan keranjang POS. Tampilan aksi membungkus; target tombol mobile 44px.
- Kondisi capability, izin, dialog konfirmasi, handler CRUD, validasi, endpoint, sumber data, dan perhitungan dipertahankan. Tidak ada dependency baru.

## Verifikasi otomatis

Regresi CRUD/grafik/integritas berikut dijalankan sebelum penyempurnaan warna pastel dan ukuran teks. Penyempurnaan terbaru diverifikasi ulang dengan typecheck, build terisolasi, dan pemeriksaan visual desktop kartu dashboard serta tabel pelanggan.

`python3 scripts/verify_isolated.py --suites test_crud test_charts test_integrity --build`

| Pemeriksaan | Hasil |
| --- | --- |
| CRUD | 8 PASS, 0 FAIL |
| Data grafik | 16 PASS, 0 FAIL |
| Integritas transaksi | 10 PASS, 0 FAIL |
| TypeScript | Lolos |
| Build produksi Next.js | Lolos |

Setelah penyempurnaan UI terakhir, `python3 scripts/verify_isolated.py --suites --build` kembali lolos (typecheck dan build). Build dijalankan di salinan sementara agar server dev yang sudah berjalan tidak terganggu. Hash database asli diverifikasi tidak berubah selama setiap proses verifikasi terisolasi.

`git diff --check` bersih. Tidak ada perubahan di API, library bisnis/autentikasi, schema Prisma, atau dependency. `prisma/erp.db` sudah memiliki perubahan lokal sebelum pekerjaan ini dimulai dan dipertahankan.

## Pemeriksaan browser yang dijalankan

Chrome lokal pada `localhost:3000`, menggunakan sesi pengguna yang sudah masuk:

- Desktop: Home, gradasi seluruh tile aplikasi, dashboard/KPI, grafik garis, daftar pelanggan dengan tombol teks+ikon dan danger merah, dialog Detail, ringkasan Retur, dan App Switcher.
- Emulasi viewport mobile 400 × 922: dashboard/KPI satu kolom, filter dan tanggal membungkus, grafik tetap berada dalam kartu, scroll native, drawer navigasi, serta empat kartu ringkasan Retur.
- Filter mingguan diaktifkan dengan klik; Tab memindahkan fokus ke filter bulanan dan Space mengaktifkannya. Focus ring terlihat pada screenshot pemeriksaan.
- `prefers-reduced-motion: reduce` diemulasikan melalui panel Rendering Chrome; filter grafik dan navigasi Retur tetap berfungsi. Preferensi dipulihkan sesudah pengujian.
- App Switcher dapat dibuka; Escape menutup modal dan mengembalikan fokus ke tombol pemicu. DevTools dan emulasi viewport ditutup setelah pemeriksaan.
- Console diperiksa: peringatan smooth scrolling Next.js ditangani dengan atribut root HTML. Peringatan sementara Fast Refresh akibat perubahan dependensi hook hilang setelah reload.

## Batas pemeriksaan

Pengujian browser merupakan smoke test pada halaman di atas, bukan pengujian setiap kombinasi role, setiap transaksi, setiap perangkat fisik, atau audit WCAG menyeluruh. Operasi CRUD yang menulis data diuji lewat suite pada salinan database terpisah; tidak dijalankan manual pada data pengguna. Kecepatan animasi ditentukan pada konfigurasi, tanpa profiling frame/performance.

Perhitungan kontras warna pastel terbaru: teks utama minimum 9.72:1, teks pendukung minimum 6.02:1, ikon/tautan minimum 6.28:1; aksi Detail/Edit 7,07:1; Arsipkan 9,90:1; Hapus 5,72:1. Ini pemeriksaan pasangan warna, bukan audit seluruh website.
