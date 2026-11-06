# Environment and Deployment Runbook

Status: **Draft untuk review backend dan deployment owner**  
Pemilik: Backend  
Target: MongoDB Atlas + Vercel  
Terakhir diperbarui: 2026-11-06

## 1. Tujuan

Dokumen ini menjadi runbook konfigurasi local, test, Preview, dan Production. Nilai secret tidak pernah ditulis di dokumentasi atau repository.

## 2. Pembagian environment

| Environment | Tujuan | Database | OpenAI |
|---|---|---|---|
| Local | Pengembangan developer | DB development personal/team | Key project developer atau fallback |
| Test | Automated integration test | DB test terisolasi | Mock default |
| Preview | Review integrasi Vercel | DB preview/staging | Key service account non-production |
| Production | Demo/release | DB production | Key service account production |

Preview dan Production tidak boleh berbagi database. Test tidak boleh menunjuk database development/production.

## 3. Environment variables

| Variable | Secret | Contoh/default | Lingkup |
|---|---:|---|---|
| `MONGODB_URI` | Ya | tidak didokumentasikan | Server |
| `MONGODB_DB_NAME` | Tidak | `city_defense_dev` | Server |
| `SESSION_COOKIE_NAME` | Tidak | `city_defense_session` | Server |
| `SESSION_TTL_SECONDS` | Tidak | `604800` | Server |
| `JWT_SECRET` | Ya | minimal 32 byte acak | Server |
| `JWT_ISSUER` | Tidak | `city-defense-api` | Server |
| `JWT_AUDIENCE` | Tidak | `city-defense-web` | Server |
| `BCRYPT_SALT_ROUNDS` | Tidak | `12` | Server |
| `APP_ORIGIN` | Tidak | `http://localhost:3000` | Server |
| `OPENAI_API_KEY` | Ya | tidak didokumentasikan | Server |
| `OPENAI_MODEL` | Tidak | ditentukan saat setup | Server |
| `OPENAI_TIMEOUT_MS` | Tidak | `10000` | Server |
| `OPENAI_MAX_RETRIES` | Tidak | `1` | Server |
| `OPENAI_MAX_OUTPUT_TOKENS` | Tidak | `800` | Server |
| `OPENAI_PROMPT_VERSION` | Tidak | `event-v1` | Server |
| `LOG_LEVEL` | Tidak | `info` | Server |
| `NODE_ENV` | Tidak | dikelola runtime | Server |

Aturan:

- Secret tidak memakai prefix `NEXT_PUBLIC_`.
- `JWT_SECRET` berupa nilai acak minimal 32 byte, berbeda antar-environment, dan tidak digunakan untuk keperluan lain.
- `.env.local` tidak di-commit.
- Sediakan `.env.example` berisi nama variable dan placeholder aman, tanpa nilai secret.
- Validasi seluruh environment variable saat startup/build memakai Zod.
- Production harus gagal cepat bila konfigurasi database, auth, origin, atau AI wajib tidak lengkap.
- Mode fallback AI tanpa key hanya diperbolehkan secara eksplisit pada local/test; Preview/Production mencatat preflight failure bila AI runtime diwajibkan.

## 4. MongoDB Atlas

### 4.1 Setup awal

1. Buat project dan cluster Atlas pada region yang dekat dengan Vercel runtime.
2. Buat database terpisah untuk development, preview, test, dan production sesuai kebutuhan tim.
3. Buat database user dengan least privilege; jangan memakai akun Atlas personal sebagai credential aplikasi.
4. Aktifkan TLS dan gunakan connection string SRV.
5. Konfigurasikan network access yang kompatibel dengan deployment Vercel tanpa membuka hak database berlebihan.
6. Aktifkan backup/point-in-time recovery sesuai tier yang digunakan untuk production.
7. Simpan URI hanya di secret manager lokal/Vercel.

### 4.2 Index dan seed

- Index didefinisikan dalam script idempotent yang dapat dijalankan berulang.
- Unique index dan TTL index dibuat sebelum menerima traffic production.
- Ruleset metadata/seed memiliki version yang eksplisit.
- Seed tidak mengubah file atau aturan source game engine.
- Migration/index script mencatat versi yang sudah diaplikasikan.

Detail collection dan index mengikuti [DATABASE_SCHEMA_V3.md](./DATABASE_SCHEMA_V3.md).

### 4.3 Operasional

- Pantau koneksi, latency query, storage, dan index usage.
- Gunakan singleton/cached Mongo client agar serverless invocation tidak membuat koneksi baru berlebihan.
- Semua query run dibatasi berdasarkan `userId` untuk mencegah IDOR.
- TTL deletion bersifat eventual; aplikasi tetap memvalidasi waktu expiry.

## 5. Vercel

### 5.1 Konfigurasi project

- Project root diarahkan ke folder `app`.
- Backend route memakai Node.js runtime, bukan Edge runtime, karena MongoDB driver, bcrypt, JWT, dan transaksi memerlukan kompatibilitas Node.
- Environment variables diisi terpisah untuk Development, Preview, dan Production.
- Function region dipilih sedekat mungkin dengan MongoDB Atlas.
- Framework/build settings mengikuti package dalam folder `app` setelah scaffold dikonfirmasi.

### 5.2 Deployment flow

1. Developer menyelesaikan fitur dan test lokal.
2. Commit dibuat dengan identitas Git milik user dan pesan deskriptif.
3. **Push dilakukan manual oleh user.**
4. Push/PR memicu Vercel Preview sesuai konfigurasi repository.
5. Jalankan migration/index preflight yang aman dan idempotent.
6. Jalankan API contract smoke pada Preview.
7. Lakukan smoke integrasi frontend dan game engine.
8. Setelah diterima tim, promote/deploy ke Production.
9. Jalankan smoke production yang tidak merusak data pemain.

Backend automation tidak melakukan `git push` atau production promotion tanpa tindakan user.

## 6. OpenAI credentials

- Local: developer memakai API key dari project OpenAI miliknya sendiri.
- Preview/Production: gunakan project service account khusus environment/aplikasi.
- Batasi permission dan budget/rate limit project sesuai kebutuhan.
- Rotasi key bila anggota tim berubah atau secret diduga bocor.
- Setelah rotasi, perbarui Vercel secret lalu redeploy; jangan menyimpan key lama di file.
- Provider adapter membaca key/model dari environment sehingga pergantian akun tidak mengubah kode.

Runtime detail mengikuti [AI_EVENT_RUNTIME.md](./AI_EVENT_RUNTIME.md).

## 7. Build dan release gate

Sebelum Preview:

- dependency install dari lockfile berhasil;
- lint dan typecheck lulus;
- unit dan integration test lulus;
- production build lulus;
- tidak ada secret atau file env ter-stage;
- root `docs/` dan `src/` tidak berubah oleh pekerjaan backend.

Sebelum Production:

- Preview contract test lulus;
- frontend smoke lulus;
- Atlas index dan ruleset version benar;
- `APP_ORIGIN`, cookie Secure, `JWT_SECRET`, database, dan OpenAI secret terkonfigurasi;
- fallback AI diuji;
- rollback owner dan versi commit diketahui.

## 8. Health check dan observability

Endpoint health yang direkomendasikan:

- liveness: proses aplikasi dapat merespons tanpa memanggil dependency berat;
- readiness internal/manual: verifikasi konfigurasi wajib dan ping database dengan timeout pendek;
- jangan mengekspos detail URI, credential, cluster, atau stack trace.

Log terstruktur minimum:

- timestamp dan environment;
- correlation/request ID;
- route dan status;
- latency;
- user/run ID bila aman;
- kategori database/engine/OpenAI error;
- source event `ai` atau `fallback`.

Jangan log password, cookie, token, body auth, API key, atau MongoDB URI.

Metric minimum untuk demo:

- error rate endpoint;
- latency p50/p95 bila tersedia;
- jumlah fallback AI;
- MongoDB connection/query error;
- conflict/idempotent replay action.

## 9. Rollback

- Rollback aplikasi menggunakan deployment Vercel sebelumnya yang diketahui sehat.
- Perubahan database dibuat backward-compatible jika memungkinkan.
- Jangan menghapus field/index lama pada release yang sama dengan pengenalan penggantinya.
- Seed/ruleset diberi versi sehingga run lama tetap dapat dibaca.
- Jika masalah berasal dari OpenAI, aktifkan fallback tanpa mengubah state gameplay.
- Jika migration gagal, hentikan promotion dan catat status; jangan mencoba cleanup destruktif tanpa verifikasi target.

## 10. Recovery dan backup

- Pastikan kebijakan backup Atlas sesuai kebutuhan demo/release.
- Uji prosedur restore pada database non-production sebelum mengandalkannya.
- Data kritis: users, game runs, actions, reports, dan ruleset version.
- Secret dipulihkan dari secret manager, bukan backup database atau repository.

## 11. Checklist local setup

- [ ] Node.js/package manager version disepakati setelah scaffold diperiksa.
- [ ] `.env.local` dibuat dari `.env.example`.
- [ ] `MONGODB_URI` menunjuk database non-production.
- [ ] Atlas network access tersedia.
- [ ] Index setup dijalankan.
- [ ] OpenAI key/model tersedia atau fallback local diaktifkan.
- [ ] Unit dan integration test dapat dijalankan.
- [ ] Tidak ada secret di Git status/diff.

## 12. Checklist Preview/Production

- [ ] Project root Vercel adalah `app`.
- [ ] Runtime route adalah Node.js.
- [ ] Atlas dan Vercel berada pada region yang masuk akal.
- [ ] Semua environment variable tervalidasi.
- [ ] Cookie Secure dan origin allowlist benar.
- [ ] JWT secret, issuer, audience, expiry, dan algoritma verifikasi benar.
- [ ] Database target telah diverifikasi.
- [ ] Index/seed version benar.
- [ ] OpenAI service account key dan model benar.
- [ ] Fallback AI berhasil diuji.
- [ ] API contract smoke lulus.
- [ ] Frontend smoke lulus.
- [ ] Rollback deployment diketahui.
- [ ] Push/promotion dilakukan manual oleh user/owner.

