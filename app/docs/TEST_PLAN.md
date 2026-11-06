# Backend Test Plan

Status: **Draft untuk review tiga developer**  
Pemilik: Backend  
Terakhir diperbarui: 2026-11-06

## 1. Tujuan

Dokumen ini mendefinisikan bukti yang harus tersedia sebelum fitur backend dianggap selesai. Fokusnya adalah kontrak API, integritas save, integrasi read-only dengan game engine, autentikasi, concurrency, dan fallback AI.

## 2. Prinsip

- Test domain harus deterministik.
- Test default tidak memanggil OpenAI asli.
- Efek gameplay selalu dibandingkan dengan keluaran engine, bukan dihitung ulang oleh backend test fixture yang terpisah.
- Database test terpisah dari development dan production.
- Setiap bug penting mendapatkan regression test.
- Satu fitur baru dianggap selesai setelah unit/integration test relevan lulus dan action log diperbarui.

## 3. Lapisan pengujian

| Lapisan | Fokus | Dependency |
|---|---|---|
| Unit | Zod schema, mapper, service/domain rule backend, error mapping | Mock/in-memory |
| Adapter contract | Kontrak adapter engine, Mongo repository, OpenAI/fallback | Fixture terkontrol |
| Integration | Route handler + service + MongoDB | Database test |
| API contract | Request/response HTTP, cookie, status/error code | Server test/Preview |
| End-to-end smoke | Alur frontend-login-start-action-resume | Preview deployment |

## 4. Environment test

- Gunakan database terpisah, misalnya `city_defense_test`.
- Jangan pernah menjalankan destructive cleanup dengan URI production.
- Setiap test suite menggunakan prefix/ID unik agar dapat berjalan paralel.
- Cleanup hanya menargetkan data milik test run tersebut.
- Integration test yang membutuhkan transaksi memakai MongoDB replica set atau MongoDB Atlas test database.
- Waktu dikontrol melalui injectable clock untuk expiry session dan timeline hari.
- Randomness engine dikontrol melalui seed/fixture bila engine mendukungnya.

## 5. Matrix fitur

### 5.1 Auth dan session

| Skenario | Jenis | Hasil yang diharapkan |
|---|---|---|
| Register valid | Integration/API | User dibuat tanpa session; frontend dapat melanjutkan ke login |
| Username duplikat | Integration | `409 USERNAME_ALREADY_EXISTS` |
| Password kurang dari 6 | Unit/API | `400 VALIDATION_ERROR` |
| Login salah | API | `401 INVALID_CREDENTIALS` tanpa user enumeration |
| Login kedua | Integration | Session pertama tidak lagi valid |
| JWT signature/algorithm/issuer/audience invalid | Unit/API | `401 UNAUTHENTICATED` |
| JWT valid tetapi `jti` revoked | Integration | `401 UNAUTHENTICATED` |
| Session melewati 7 hari | Unit/Integration | `401 UNAUTHENTICATED` |
| Logout dua kali | API | Keduanya sukses dan cookie dihapus |
| Origin ilegal pada mutation | API | Request ditolak |
| Rate limit | Integration | `429`, `Retry-After` tersedia |

### 5.2 Run dan save game

| Skenario | Jenis | Hasil yang diharapkan |
|---|---|---|
| Start run pertama | Integration | Run lengkap, current pointer berpindah |
| Retry `startRequestId` sama | Integration | Run yang sama dikembalikan |
| `startRequestId` sama dengan payload beda | Integration | Conflict eksplisit |
| Start run baru | Integration | Run lama tetap ada, pointer menunjuk run baru |
| Resume setelah logout/login | API | Current run user yang sama dikembalikan |
| Akses run user lain | Security/API | Tidak ditemukan atau ditolak tanpa data leak |
| Dokumen save inkonsisten | Integration | Error terkontrol, bukan silent corruption |

### 5.3 Action dan engine

| Skenario | Jenis | Hasil yang diharapkan |
|---|---|---|
| Set allocation valid | Adapter/Integration | Command engine dan state hasil tersimpan |
| Resolve event valid | Adapter/Integration | Choice dipetakan tepat, efek dari engine |
| Choice tidak dikenal | Unit/API | `400`/domain error sesuai kontrak |
| Resolve battle | Adapter/Integration | Report dan state tersimpan atomik |
| Advance day | Integration | Timeline berubah satu kali |
| Action duplikat | Integration | Hasil action pertama dikembalikan, tidak diterapkan ulang |
| Dua action paralel pada version sama | Concurrency | Hanya satu berhasil, lainnya conflict |
| Engine melempar domain error | Adapter/API | Dipetakan ke error API stabil |
| Engine state/version tidak didukung | Adapter | Gagal jelas tanpa memodifikasi data |

### 5.4 Event AI

| Skenario | Jenis | Hasil yang diharapkan |
|---|---|---|
| Structured output valid | Unit | Narasi source `ai` tersimpan |
| Timeout | Unit/Integration | Fallback dipakai |
| Rate limit/provider error | Unit | Retry terbatas lalu fallback |
| Refusal/no parsed output | Unit | Fallback dipakai |
| ID pilihan berubah | Unit | Respons AI ditolak, fallback dipakai |
| Output schema invalid | Unit | Tidak masuk database sebagai AI result |
| Retry start request | Integration | Tidak menghasilkan record/event ganda |
| OpenAI smoke eksplisit | Manual/Preview | Respons valid dalam budget waktu/biaya |

### 5.5 Ending dan laporan

- Menang setelah memenuhi kondisi engine.
- Kalah ketika kondisi engine terpenuhi.
- Hari ke-20 diproses tepat satu kali.
- Action sesudah run selesai ditolak.
- Report dapat diambil ulang setelah login baru.
- Angka report cocok dengan state final engine.

## 6. Contract testing frontend

Backend menyediakan contoh request/response dan koleksi API yang mengikuti [API_CONTRACT.md](./API_CONTRACT.md). Contract test minimal memverifikasi:

- seluruh response memakai envelope yang disepakati;
- field ObjectId yang diekspos sudah menjadi string;
- timestamp berbentuk ISO 8601 UTC;
- enum dan error code tidak berubah tanpa versi/review;
- cookie behavior sesuai environment;
- response event source `ai` dan `fallback` memiliki bentuk identik.

Postman CLI yang tersedia dapat digunakan untuk menjalankan collection pada local atau Preview URL. Collection dan environment file yang aman boleh disimpan di area backend; secret environment lokal tidak boleh di-commit.

## 7. Pengujian keamanan minimum

- IDOR: user tidak dapat membaca atau mengubah run user lain.
- Mass assignment: field state yang tidak diizinkan di body diabaikan atau ditolak.
- Injection: seluruh body/params/query divalidasi Zod; query Mongo tidak menerima operator mentah dari client.
- Cookie dan origin policy diuji pada Preview HTTPS.
- JWT verification mengunci `HS256`, issuer, audience, expiry, `sub`, dan `jti`.
- Secret scanner/manual review memastikan key tidak ter-commit.
- Error production tidak mengandung stack trace atau connection string.
- Payload besar ditolak dengan limit yang jelas.
- Brute-force login memicu rate limit.

## 8. Concurrency dan transaksi

Test concurrency menjalankan minimal dua request action pada `runId` dan version state yang sama. Assertion:

- tepat satu transisi state diterapkan;
- tidak ada action log ganda untuk `actionId` yang sama;
- version state bertambah secara monoton;
- event/report terkait konsisten dengan state;
- request yang kalah mendapat `409 STATE_CONFLICT` dan dapat mengambil state terbaru.

Test transaksi juga menyuntikkan kegagalan di tengah write untuk memastikan tidak ada partial save.

## 9. OpenAI test policy

- Unit dan CI memakai `MockEventNarrativeGenerator`.
- Mock menyediakan kasus sukses, timeout, refusal, invalid schema, dan provider error.
- Real API smoke test hanya berjalan bila flag eksplisit dan `OPENAI_API_KEY` tersedia.
- Real smoke test menggunakan jumlah request dan output token kecil.
- Hasil smoke test tidak menjadi assertion narasi kata-per-kata; yang diuji schema, latency budget, dan fallback behavior.

## 10. Perintah verifikasi

Nama script final ditetapkan ketika scaffold backend dibuat. Target minimal:

```text
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run build
npm run test:api
```

`test:api` direncanakan menjalankan Postman CLI atau runner kontrak ekuivalen. Perintah yang belum tersedia tidak boleh didokumentasikan sebagai sudah lulus.

## 11. Urutan CI/deployment gate

1. Install dependency dengan lockfile.
2. Lint dan typecheck.
3. Unit test.
4. Integration test dengan database test.
5. Production build.
6. Deploy Preview.
7. API contract smoke terhadap Preview.
8. Manual frontend smoke untuk milestone penting.
9. Production deploy hanya setelah hasil diterima tim.

## 12. Bukti dan pencatatan

Untuk setiap fitur, [BACKEND_ACTION_LOG.md](./BACKEND_ACTION_LOG.md) mencatat:

- file yang berubah;
- test/perintah yang dijalankan;
- hasil lulus/gagal;
- test yang belum dijalankan beserta alasannya;
- keputusan atau perubahan kontrak;
- hash commit setelah commit dibuat.

Jangan menulis bahwa test lulus apabila belum benar-benar dijalankan.

## 13. Exit criteria backend MVP

- Seluruh skenario kritis auth, run, action, concurrency, event fallback, dan ending lulus.
- Tidak ada test kritis yang di-skip tanpa persetujuan dan catatan.
- Build production berhasil.
- Contract test Preview berhasil.
- Frontend dapat login, memulai, melakukan action, reload/resume, logout, dan login ulang.
- Kegagalan OpenAI tidak menghentikan permainan.
- Tidak ada perubahan pada source game engine oleh pekerjaan backend.

