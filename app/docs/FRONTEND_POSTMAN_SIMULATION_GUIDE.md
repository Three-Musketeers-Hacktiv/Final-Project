# Panduan Simulasi Backend untuk Developer Frontend

Terakhir diperbarui: 2026-11-06

Panduan ini digunakan untuk menjalankan backend secara lokal, mencoba smoke test melalui Postman, dan memverifikasi campaign hari 1–20 sebelum integrasi UI frontend.

## 1. Yang perlu diminta dari developer backend

Sebelum mulai, minta informasi berikut melalui jalur komunikasi privat:

- `MONGODB_URI` untuk database development/test;
- nama database yang boleh digunakan, atau izin membuat database khusus developer;
- konfirmasi bahwa IP laptop sudah diizinkan pada MongoDB Atlas Network Access.

Jangan mengirim URI, password database, JWT secret, atau API key melalui Git. File `.env` tidak boleh di-commit.

OpenAI key tidak diperlukan untuk pengujian ini. Jika `OPENAI_API_KEY` dan `OPENAI_MODEL` kosong, backend memakai narasi fallback lokal dan gameplay tetap berjalan.

## 2. Prasyarat laptop

- Git dan Git Bash;
- Node.js serta npm;
- Postman Desktop;
- source repository pada branch backend terbaru;
- akses internet ke MongoDB Atlas.

Cek instalasi dari Git Bash:

```bash
node --version
npm --version
git --version
```

## 3. Menyiapkan backend dari Git Bash

Buka Git Bash pada root repository, lalu masuk ke folder backend:

```bash
cd app
npm ci
cp .env.example .env
```

Buka `app/.env` dengan editor dan isi konfigurasi berikut. Ganti nilai bertanda `GANTI_...`; nilai lain dapat digunakan seperti contoh.

```dotenv
MONGODB_URI=GANTI_DENGAN_URI_ATLAS_DARI_BACKEND
MONGODB_DB_NAME=GANTI_DENGAN_NAMA_DATABASE_TEST
MONGODB_CONNECT_TIMEOUT_MS=5000

SESSION_COOKIE_NAME=city_defense_session
SESSION_TTL_SECONDS=604800
JWT_SECRET=GANTI_DENGAN_SECRET_ACAK_MINIMAL_32_KARAKTER
JWT_ISSUER=city-defense-api
JWT_AUDIENCE=city-defense-web
BCRYPT_SALT_ROUNDS=12
APP_ORIGIN=http://localhost:3000

OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_TIMEOUT_MS=10000
OPENAI_MAX_RETRIES=1
OPENAI_MAX_OUTPUT_TOKENS=800
OPENAI_PROMPT_VERSION=event-v1

LOG_LEVEL=info
```

JWT secret acak dapat dibuat dari Git Bash:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Salin output perintah tersebut ke `JWT_SECRET`. Jangan menyalin kembali isi `.env` ke chat, screenshot, atau commit.

Siapkan index database:

```bash
npm run db:indexes
```

Output yang diharapkan:

```text
MongoDB indexes are ready for database: <nama-database>
```

Jalankan server dan biarkan terminal ini tetap terbuka:

```bash
npm run dev
```

Server lokal menggunakan `http://localhost:3000`. Dari terminal Git Bash kedua, cek health dan readiness:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/readiness
```

Readiness yang benar mengembalikan status `ready`, database `reachable`, dan AI `fallback-only` bila OpenAI tidak dikonfigurasi.

## 4. Mengimpor Postman collection

Di Postman:

1. Klik **Import**.
2. Impor `app/postman/backend-api.postman_collection.json`.
3. Impor `app/postman/backend-api.postman_environment.json`.
4. Pilih environment **Fantasy City Defense - Local** pada environment selector.
5. Buka environment dan pastikan `baseUrl` adalah `http://localhost:3000`.
6. Biarkan `username` kosong pada percobaan pertama. Pre-request script akan membuat username unik.
7. Nilai `password` bawaan `secret123` sudah memenuhi minimum enam karakter.

Postman menyimpan cookie login melalui cookie jar. Jangan menonaktifkan cookie untuk `localhost`.

## 5. Smoke test Postman

Jalankan request satu per satu dalam urutan berikut:

1. `Register` — mengharapkan `201 Created`.
2. `Login` — mengharapkan `200 OK` dan cookie sesi.
3. `Current User` — mengharapkan `200 OK`.
4. `Create Run` — mengharapkan `201 Created`; script menyimpan `runId` dan `revision`.
5. `Upgrade Wall` — mengharapkan `200 OK`; script memperbarui `revision`.
6. `Current Run` — mengharapkan `200 OK`.
7. `Logout` — mengharapkan `200 OK`.

Sesudah logout, `Current User` seharusnya menghasilkan `401 UNAUTHENTICATED` bila dikirim kembali.

Untuk mengulang dari awal, kosongkan `username`, `runId`, dan ubah `revision` menjadi `0` pada environment Postman. Username lama tidak dapat diregistrasikan ulang.

## 6. Simulasi campaign penuh dari Git Bash

Ini adalah cara tercepat untuk memastikan seluruh campaign backend berjalan. Server `npm run dev` harus tetap aktif pada terminal pertama.

Pada terminal Git Bash kedua:

```bash
cd app
npm run test:campaign
```

Runner akan otomatis:

- membuat akun unik dan login;
- membuat run baru;
- menyelesaikan event hari 3, 7, 13, dan 17;
- menyelesaikan battle hari 10 beserta reward;
- menyelesaikan battle hari 20 sampai `victory`;
- membaca ulang final run dari MongoDB;
- memastikan save aktif sudah kosong setelah victory;
- logout dan memastikan sesi tidak lagi berlaku.

Hasil akhir yang diharapkan:

```text
Campaign passed: runId=<id>, finalRevision=42, phase=victory
```

Jika backend dijalankan pada URL atau origin lain:

```bash
CAMPAIGN_BASE_URL=http://localhost:3000 \
CAMPAIGN_ORIGIN=http://localhost:3000 \
npm run test:campaign
```

Setiap eksekusi membuat akun dan run test baru. Data tersebut tidak dihapus otomatis karena dipertahankan untuk audit development.

## 7. Simulasi campaign penuh secara manual di Postman

Collection bawaan hanya menyediakan smoke flow. Untuk menjalankan 20 hari secara manual, lakukan `Register`, `Login`, dan `Create Run`, tetapi jangan logout. Sebaiknya mulai dari run baru tanpa menjalankan `Upgrade Wall` pada smoke flow.

Duplicate request `Upgrade Wall`, ubah namanya menjadi `Campaign Action`, dan gunakan body dasar berikut:

```json
{
  "actionId": "{{$guid}}",
  "expectedRevision": {{revision}},
  "type": "endPreparationDay",
  "payload": {}
}
```

Pastikan tab **Tests** atau **Post-response** request tersebut memperbarui revision:

```javascript
pm.test("action applied", () => pm.expect(pm.response.code).to.eql(200));
const body = pm.response.json();
if (body.ok) {
  pm.environment.set("revision", body.data.game.state.revision);
}
```

Untuk setiap baris berikut, ubah `type` dan `payload`, lalu klik **Send**. Jangan menggunakan ulang `actionId`; dynamic variable `{{$guid}}` akan membuat ID baru.

| Hari | Urutan action | Payload khusus / hasil fase |
|---:|---|---|
| 1 | `upgradeCity`, `endPreparationDay` | masuk hari 2 |
| 2 | `upgradeCity`, `endPreparationDay` | masuk event hari 3 |
| 3 | `chooseEventOption`, `endPreparationDay` | `{ "choiceId": "day3-skip" }` |
| 4 | `upgradeCity`, `endPreparationDay` | masuk hari 5 |
| 5 | `upgradeTroops`, `endPreparationDay` | masuk hari 6 |
| 6 | `upgradeTroops`, `endPreparationDay` | masuk event hari 7 |
| 7 | `chooseEventOption`, `endPreparationDay` | `{ "choiceId": "day7-pay" }` |
| 8 | `upgradeTroops`, `endPreparationDay` | masuk hari 9 |
| 9 | `endPreparationDay` | masuk `battleReady` hari 10 |
| 10 | `startBattle`, `continueFromReport`, `chooseReward` | reward: `{ "rewardId": "reward-income" }`; masuk hari 11 |
| 11 | `repairCity`, `endPreparationDay` | masuk hari 12 |
| 12 | `repairCity`, `endPreparationDay` | masuk event hari 13 |
| 13 | `chooseEventOption`, `repairCity`, `endPreparationDay` | event: `{ "choiceId": "day13-discount" }` |
| 14 | `repairCity`, `endPreparationDay` | masuk hari 15 |
| 15 | `upgradeTroops`, `endPreparationDay` | masuk hari 16 |
| 16 | `upgradeWall`, `endPreparationDay` | masuk event hari 17 |
| 17 | `chooseEventOption`, `upgradeWall`, `endPreparationDay` | event: `{ "choiceId": "day17-pay" }` |
| 18 | `upgradeTroops`, `endPreparationDay` | masuk hari 19 |
| 19 | `upgradeWall`, `endPreparationDay` | masuk `battleReady` hari 20 |
| 20 | `startBattle`, `continueFromReport` | fase akhir `victory` |

Gunakan `{}` untuk action tanpa payload khusus. Contoh event action:

```json
{
  "actionId": "{{$guid}}",
  "expectedRevision": {{revision}},
  "type": "chooseEventOption",
  "payload": {
    "choiceId": "day3-skip"
  }
}
```

Setelah setiap response, periksa minimal:

- `data.game.state.revision` naik satu;
- `data.game.state.day` dan `phase` sesuai tabel;
- event menyediakan title, description, choices, cost, dan effects;
- nilai cost/effects berasal dari engine dan tidak bergantung pada teks AI.

Sesudah final action hari 20:

1. Pastikan `data.game.state.phase` adalah `victory` dan revision `42`.
2. Kirim `GET {{baseUrl}}/api/runs/{{runId}}`; hasil harus `200` dengan state victory.
3. Kirim `GET {{baseUrl}}/api/runs/current`; hasil harus `404 NO_ACTIVE_SAVE`.
4. Kirim `Logout`; hasil harus `200`.
5. Kirim `Current User`; hasil harus `401 UNAUTHENTICATED`.

## 8. Error yang paling umum

### `SERVICE_NOT_READY` atau koneksi MongoDB gagal

- pastikan `MONGODB_URI` benar;
- pastikan IP laptop sudah masuk Atlas Network Access;
- pastikan user Atlas memiliki akses ke database test;
- jalankan kembali `npm run db:indexes`.

### Environment validation gagal saat server mulai

Jangan membiarkan variabel numerik ada dengan value kosong. Isi nilai default seperti contoh pada bagian 3. `JWT_SECRET` harus minimal 32 karakter dan `APP_ORIGIN` harus berupa URL valid.

### `403 ORIGIN_NOT_ALLOWED`

Pastikan `APP_ORIGIN=http://localhost:3000`. Hapus header `Origin` buatan tangan dari Postman, atau samakan nilainya dengan `APP_ORIGIN`.

### `401 UNAUTHENTICATED`

Jalankan `Login` kembali dan pastikan Postman cookie jar aktif. Setelah logout, login ulang memang wajib.

### `409 STALE_REVISION`

Nilai environment `revision` tertinggal. Kirim `GET /api/runs/{{runId}}`, salin `data.game.state.revision` ke environment, lalu ulangi intent dengan `actionId` baru.

### `409 DUPLICATE_ACTION`

`actionId` pernah digunakan. Gunakan `{{$guid}}` dan kirim intent baru hanya setelah state terbaru sudah diambil.

### Register menghasilkan `409`

Username sudah dipakai. Kosongkan variable `username` agar collection membuat username unik, atau isi username baru secara manual.

### Port 3000 sedang dipakai

Hentikan proses lama dengan `Ctrl+C`. Bila backend dijalankan pada port lain, samakan `baseUrl`, `APP_ORIGIN`, `CAMPAIGN_BASE_URL`, dan `CAMPAIGN_ORIGIN`.

## 9. Informasi yang dikirim ke developer backend bila gagal

Kirim informasi berikut tanpa secret:

- nama request dan urutan action yang gagal;
- HTTP status dan `error.code`;
- `requestId` dari response;
- hari, fase, dan revision terakhir;
- log terminal yang sudah menghapus URI, password, token, dan cookie;
- apakah masalah terjadi di Postman, runner campaign, atau keduanya.
