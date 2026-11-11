# Menjalankan Bastionfall

Jalankan langkah berikut dari folder `app/`. Gunakan MongoDB yang mendukung transaksi, misalnya Atlas atau replica set lokal.

1. Instal dependency dengan `npm ci`.
2. Buat `.env.local` dengan nama variabel dari [.env.example](.env.example). Isi `MONGODB_URI`, `JWT_SECRET` (minimal 32 karakter), dan `APP_ORIGIN=http://localhost:3000`. Hapus baris opsional yang kosong agar nilai default berlaku. Untuk memakai Gemini, isi `GEMINI_API_KEY` dan `GEMINI_MODEL`.
3. Siapkan indeks dengan `npm run db:indexes`.
4. Jalankan `npm run dev`, buka [localhost:3000](http://localhost:3000), lalu daftar atau login untuk mulai bermain.

Setelah dokumen ruleset tersedia di MongoDB, lihat pratinjau katalog fallback melalui `npm run db:seed-fallback-events` dan gunakan `npm run db:seed-fallback-events:write` untuk menyimpan entri yang masih kurang. Seed dijalankan terpisah dari `npm run dev`.

Periksa aplikasi dengan `npm run typecheck`, `npm test`, `npm run lint`, dan `npm run build`. Lihat [kontrak API](docs/API_CONTRACT.md) untuk aksi gameplay dan [runbook](docs/ENVIRONMENT_AND_DEPLOYMENT.md) untuk konfigurasi.
