# Authentication and Session Specification

Status: **Draft untuk review backend dan frontend**  
Pemilik: Backend  
Terakhir diperbarui: 2026-11-06

## 1. Keputusan utama

- Autentikasi menggunakan username dan password.
- Password minimum 6 karakter dan maksimum 128 karakter.
- Session memakai JSON Web Token (JWT) bertanda tangan yang dikirim hanya melalui cookie `HttpOnly`.
- Hanya satu session aktif per user.
- Login sukses terbaru mencabut session sebelumnya (`last login wins`).
- Session berlaku tetap selama 7 hari dan tidak diperpanjang otomatis oleh aktivitas.
- Logout menghapus session server-side dan cookie; user harus login lagi untuk meneruskan save terakhir.
- MongoDB menggunakan `ObjectId` untuk `_id` dan relasi internal.

## 2. Username dan password

Aturan username awal:

- panjang 3-30 karakter;
- karakter yang diizinkan: huruf lowercase, angka, dan underscore;
- disimpan dalam bentuk tampilan dan bentuk canonical lowercase untuk pengecekan unik;
- perbandingan login tidak membedakan kapitalisasi.

Password:

- minimum 6 dan maksimum 128 karakter;
- tidak pernah disimpan atau dicatat dalam log sebagai plaintext;
- di-hash memakai algoritma bcrypt;
- cost factor awal adalah 12 dan wajib diukur pada Vercel Preview sebelum production;
- password tidak di-trim diam-diam karena spasi dapat menjadi bagian password.

Respons login gagal harus generik agar tidak membocorkan apakah username terdaftar.

## 3. JWT session token

Pada login sukses:

1. Buat `jti` acak menggunakan UUID atau random identifier kriptografis.
2. Bentuk JWT berisi claim minimum `sub`, `jti`, `iat`, `exp`, `iss`, dan `aud`.
3. Tandatangani JWT menggunakan secret server-side dan algoritma yang dikunci eksplisit ke `HS256`.
4. Kirim JWT hanya melalui cookie HTTPS `HttpOnly`.
5. Simpan `jti`, `userId`, `createdAt`, `expiresAt`, `lastSeenAt`, dan metadata audit terbatas di collection `sessions`.
6. Hapus/revoke seluruh session aktif milik user sebelum session baru menjadi aktif.

JWT lengkap tidak boleh disimpan di MongoDB, log, analytics, localStorage, atau response JSON. Payload JWT tidak memuat password hash, username, save game, role yang dapat berubah, atau data sensitif lainnya.

Contoh payload:

```json
{
  "sub": "690c9e50c8fd8a13507d4621",
  "jti": "81f1112b-9da7-4b40-8fa6-d95fcf91d405",
  "iat": 1793966400,
  "exp": 1794571200,
  "iss": "city-defense-api",
  "aud": "city-defense-web"
}
```

JWT tetap diverifikasi terhadap collection `sessions`. Ini diperlukan untuk logout langsung dan aturan satu perangkat aktif; keberhasilan verifikasi signature saja belum cukup untuk mengautentikasi request.

## 4. Konfigurasi cookie

Rekomendasi awal:

```text
HttpOnly=true
Secure=true pada Preview/Production
SameSite=Lax
Path=/
Max-Age=604800
```

Nama cookie berasal dari `SESSION_COOKIE_NAME`. Local development melalui HTTP boleh menonaktifkan `Secure` berdasarkan environment, bukan berdasarkan input request.

Frontend harus mengirim request menggunakan credentials untuk request same-origin/cross-origin yang sudah diizinkan konfigurasi.

## 5. Endpoint dan perilaku

Kontrak field dan envelope lengkap mengikuti [API_CONTRACT.md](./API_CONTRACT.md).

### `POST /api/auth/register`

- Validasi input dengan Zod.
- Normalisasi username canonical.
- Tolak username duplikat dengan `409 USERNAME_ALREADY_EXISTS`.
- Hash password.
- Buat user tanpa membuat session sesuai default kontrak API.
- Kembalikan public user view; frontend mengarahkan user ke login.

### `POST /api/auth/login`

- Validasi input.
- Cari canonical username.
- Verifikasi password dengan timing-safe password library.
- Pada sukses, revoke session lama, buat record session dengan `jti` baru, lalu tandatangani JWT secara atomik pada batas state database.
- Set cookie baru dan kembalikan public user view.
- Pada gagal, kembalikan `401 INVALID_CREDENTIALS` generik.

### `POST /api/auth/logout`

- Verifikasi JWT bila ada, lalu hapus/revoke session berdasarkan pasangan `sub` dan `jti`.
- Hapus cookie menggunakan atribut path yang sama.
- Endpoint idempotent: logout tanpa session tetap sukses.

### `GET /api/auth/me`

- Validasi cookie dan expiry.
- Kembalikan public user view bila valid.
- Kembalikan `401 UNAUTHENTICATED` bila token hilang, tidak dikenal, revoked, atau kedaluwarsa.

## 6. Validasi request terautentikasi

Untuk setiap request yang memerlukan autentikasi:

1. Ambil cookie dengan nama yang dikonfigurasi.
2. Verifikasi format, signature, algoritma `HS256`, `iss`, `aud`, `iat`, dan `exp` JWT.
3. Validasi `sub` sebagai hex string `ObjectId` dan `jti` sebagai identifier yang sah.
4. Cari session aktif berdasarkan `userId = sub`, `jti`, dan `expiresAt > now`.
5. Muat user yang masih aktif.
6. Tempelkan `userId` internal ke request context.
7. Perbarui `lastSeenAt` secara terbatas, bukan pada setiap request bila itu menambah beban write.

TTL index membersihkan data kedaluwarsa secara eventual. Aplikasi tetap wajib memeriksa `expiresAt`; jangan menganggap TTL deletion terjadi tepat waktu.

## 7. Satu perangkat aktif

- Setiap user memiliki maksimum satu dokumen session aktif.
- Unique index pada `sessions.userId` menegakkan aturan ini; unique index pada `jti` mencegah identifier session ganda.
- Login baru mengganti session lama.
- Request dengan cookie lama langsung menerima `401` setelah login baru berhasil.
- Informasi perangkat tidak digunakan sebagai mekanisme autentikasi dan tidak perlu fingerprinting.

## 8. CSRF, origin, dan CORS

Karena autentikasi memakai cookie:

- Mutation endpoint memeriksa header `Origin` terhadap allowlist `APP_ORIGIN` pada production.
- Gunakan `SameSite=Lax` dan HTTPS.
- CORS tidak dibuka dengan wildcard ketika credentials aktif.
- Jika frontend dan API tetap same-origin pada satu project Vercel, pertahankan konfigurasi tersebut karena lebih sederhana dan aman.
- Jika deployment menjadi cross-site, desain CSRF harus ditinjau ulang sebelum implementasi.

## 9. Rate limiting dan anti-abuse

Nilai awal yang direkomendasikan dan perlu dibuktikan melalui test:

- register: 5 percobaan per 15 menit per IP hash;
- login: 10 percobaan per 15 menit per kombinasi IP hash dan username canonical;
- reset counter atau kurangi penalti setelah login sukses;
- respons `429 RATE_LIMITED` menyertakan `Retry-After`.

Backend menyimpan penghitung di `auth_rate_limits` dengan jendela 15 menit. Kunci memakai HMAC dari jenis aksi, IP, dan username bila tersedia. Batas register adalah 5 dan login 10 per kunci.

## 10. Error dan logging

Event audit yang boleh dicatat:

- register sukses/gagal berdasarkan kategori;
- login sukses/gagal berdasarkan kategori;
- session diganti oleh login baru;
- logout;
- rate limit terpicu.

Jangan catat password, cookie, JWT lengkap, JWT signing secret, hash password, connection string, atau API key. Gunakan correlation ID dan user ID internal bila tersedia.

## 11. Frontend integration notes

- Frontend tidak menyimpan auth token di localStorage/sessionStorage.
- Setelah page load, frontend dapat memanggil `GET /api/auth/me` untuk membangun auth state.
- `401` pada endpoint game berarti frontend mengarahkan user ke login tanpa menghapus save di server.
- Sesudah login ulang, frontend memanggil endpoint current run untuk melanjutkan permainan terakhir.
- Pesan `401` setelah user login di perangkat lain dapat ditampilkan sebagai session telah digantikan.

## 12. Di luar MVP

- email verification;
- forgot/reset password;
- OAuth/social login;
- multi-factor authentication;
- daftar dan manajemen multi-device session;
- sliding session/refresh token.

## 13. Pengujian wajib

- register valid, invalid, dan username duplikat;
- password panjang 5 ditolak, panjang 6 diterima;
- login sukses dan gagal dengan respons generik;
- login kedua mencabut cookie/session pertama;
- session kedaluwarsa tepat setelah 7 hari menurut validasi aplikasi;
- logout idempotent dan cookie terhapus;
- request tanpa cookie atau dengan token palsu ditolak;
- JWT dengan algoritma, signature, issuer, audience, `jti`, atau `sub` tidak valid ditolak;
- JWT valid secara kriptografis tetapi `jti` sudah dicabut ditolak;
- origin tidak diizinkan ditolak untuk mutation production;
- rate limit memberi `429` tanpa membocorkan credential;
- log tidak mengandung secret.

## 14. Kriteria penerimaan

- Hanya satu session valid per user.
- Session tidak dapat dipulihkan setelah logout tanpa login ulang.
- Save game tetap terhubung ke user, bukan session.
- Tidak ada token autentikasi di body response atau browser storage.
- JWT hanya dianggap valid bila signature, claim, expiry, dan record session aktif semuanya valid.
- Semua input endpoint tervalidasi Zod.
- Seluruh perilaku error sesuai kontrak API.

