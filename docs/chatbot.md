# Aruna Assistant

Tombol robot kecil di kanan bawah tersedia setelah login di halaman ERP. Klik untuk membuka panel dengan animasi, pilih contoh pertanyaan atau ketik pesan. Enter mengirim pesan; Shift + Enter membuat baris baru. Escape menutup panel dan mengembalikan fokus ke tombol robot. Riwayat tetap ada saat panel ditutup dan dibuka kembali pada halaman yang sama, lalu dimulai ulang saat berpindah halaman atau memuat ulang. Tombol percakapan baru mengosongkan panel dan membuat sesi Langflow baru.

## Konfigurasi

Tambahkan ke `.env.local` lalu mulai ulang server Next.js:

```env
LANGFLOW_API_URL="http://localhost:7860/api/v1/run/27f2c5cc-a3aa-488b-8e6a-9eca90b286aa"
LANGFLOW_API_KEY="your-langflow-api-key"
```

API key hanya dibaca route server `/api/chatbot`, tidak dikirim ke browser. Endpoint ini memerlukan sesi ERP aktif dan pemeriksaan origin yang sama dengan API ERP lainnya. Setiap sesi percakapan dipisahkan menurut perusahaan dan pengguna. Pesan maksimal 4.000 karakter; waktu tunggu Langflow 60 detik. Respons ditampilkan sebagai teks, tanpa menjalankan HTML dari model. Panel mendukung layar kecil, keyboard, pembaca layar, dan pengaturan pengurangan animasi.

Langflow harus dapat dijangkau dari **server Next.js**. Jika aplikasi dipasang di host atau container lain, ganti `localhost` dengan alamat Langflow yang dapat dijangkau dari host tersebut. Pastikan flow memiliki Chat Output dan memory/history yang menggunakan `session_id` jika ingin mengingat percakapan. Payload dan pembacaan balasan mengikuti [dokumentasi API Langflow](https://docs.langflow.org/api-flows-run).

Jika Langflow tidak dapat dihubungi, lambat, atau tidak mengirim jawaban chat, panel menampilkan pesan kesalahan dan tombol **Coba lagi**. Percobaan ulang menggunakan sesi yang sama dan tidak menambahkan gelembung pertanyaan yang sama lagi di panel. Percobaan ulang setelah timeout dapat diproses ulang oleh Langflow jika eksekusi sebelumnya sudah berjalan.

Jalankan pemeriksaan format respons dengan `node --import tsx --test scripts/test_chatbot.ts`, lalu `npm run build` untuk memeriksa tipe dan kompilasi aplikasi.
