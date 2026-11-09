# Backend Action Log

Dokumen ini mencatat tindakan material pada pekerjaan backend Fantasy City Defense. Waktu menggunakan zona Asia/Jakarta. Secret, credential, connection string, password, dan token tidak boleh ditulis di sini.

## Format entri

```text
## YYYY-MM-DD HH:mm — Judul

Tujuan:
- ...

Tindakan:
- ...

File terdampak:
- ...

Validasi:
- Perintah/pemeriksaan: ...
- Hasil: ...

Commit:
- Status: belum dibuat / dibuat
- Hash: ...
- Pesan: ...

Catatan/risiko:
- ...
```

## 2026-11-06 19:16 — Audit scope dan sumber kebenaran (dicatat retrospektif)

Tujuan:
- Memastikan batas pekerjaan backend dan mencegah perubahan pada game engine atau area frontend.

Tindakan:
- Memeriksa file tracked dan untracked repository.
- Menetapkan root `src/**` dan root `docs/**` sebagai read-only.
- Menetapkan `app/app/api/**` dan `app/server/**` sebagai area utama backend.
- Menetapkan file package/config sebagai shared dan harus dikoordinasikan dengan frontend.

File terdampak:
- Tidak ada perubahan kode.

Validasi:
- Pemeriksaan: `git ls-files` dan `git status --short`.
- Hasil: dokumen tambahan di `app/app/api/docs/**` terdeteksi untracked; tidak dimodifikasi atau di-stage.

Commit:
- Status: belum dibuat.

Catatan/risiko:
- Staging implementasi harus memakai path eksplisit agar file untracked milik developer lain tidak ikut masuk commit.

## 2026-11-06 19:16 — Pembuatan rencana implementasi backend (dicatat retrospektif)

Tujuan:
- Menyediakan rencana backend yang dapat bersinergi dengan game engine dan menjadi kontrak integrasi frontend.

Tindakan:
- Membuat rencana arsitektur, endpoint, action controller, autentikasi, schema MongoDB, event AI, testing, milestone, dan Definition of Done.
- Mencatat kebijakan commit per fitur dan larangan push otomatis.

File terdampak:
- `app/docs/BACKEND_IMPLEMENTATION_PLAN.md` dibuat dan diperbarui.

Validasi:
- Pemeriksaan: struktur heading, path referensi engine, dan status Git.
- Hasil: dokumen berada di dalam scope `app/`; root `src/`, root `docs/`, dan file frontend tidak berubah.

Commit:
- Status: belum dibuat.

Catatan/risiko:
- Dokumen masih untracked sampai dibuat commit dokumentasi secara eksplisit.

## 2026-11-06 19:16 — Penguncian keputusan infrastruktur dan integrasi (dicatat retrospektif)

Tujuan:
- Mengurangi keputusan terbuka sebelum Phase 1.

Tindakan:
- Menetapkan MongoDB Atlas, deployment Vercel, session tetap tujuh hari, satu session aktif per user, password minimum enam karakter, dan MongoDB `ObjectId`.
- Menetapkan `GameState.runId` sebagai hex string dari `ObjectId`, sedangkan `actionId` dan `startRequestId` tetap string idempotency.
- Menetapkan backend sebagai pemilik kontrak API.
- Menetapkan OpenAI sebagai provider runtime narasi dengan API key/model melalui environment.
- Menetapkan Zod sebagai runtime validator.
- Menetapkan fallback event sebagai jalur wajib ketika OpenAI gagal.
- Menetapkan commit otomatis per fitur selesai dan push manual oleh pemilik repository.

File terdampak:
- `app/docs/BACKEND_IMPLEMENTATION_PLAN.md` diperbarui.
- `app/docs/BACKEND_ACTION_LOG.md` dibuat.

Validasi:
- Pemeriksaan: keputusan dibandingkan dengan kontrak engine committed dan batas folder backend.
- Hasil: tidak diperlukan perubahan pada root `src/**` atau root `docs/**`.

Commit:
- Status: belum dibuat.

Catatan/risiko:
- Model OpenAI default, timeout, retry, dan budget output masih perlu dikunci.
- Library Argon2id tetap harus dibuktikan kompatibel dengan Vercel.

## 2026-11-06 19:16 — Verifikasi identitas Git (dicatat retrospektif)

Tujuan:
- Memastikan commit implementasi memakai identitas developer, bukan identitas AI.

Tindakan:
- Memeriksa effective Git author dan committer.
- Menetapkan tidak memakai `--author` atau trailer `Co-authored-by` AI.
- Menetapkan push tidak dilakukan otomatis.

File terdampak:
- Tidak ada konfigurasi Git yang diubah.

Validasi:
- Pemeriksaan: `git var GIT_AUTHOR_IDENT` dan `git var GIT_COMMITTER_IDENT`.
- Hasil: author dan committer efektif menggunakan identitas Muhamad Yoga Supratama.

Commit:
- Status: belum dibuat.

Catatan/risiko:
- Git commit signing belum dikonfigurasi; atribusi GitHub bergantung pada email Git yang terhubung ke akun developer.

## 2026-11-06 19:16 — Verifikasi rancangan OpenAI runtime

Tujuan:
- Memastikan rancangan provider AI mengikuti dokumentasi resmi dan dapat diganti melalui environment.

Tindakan:
- Memeriksa official OpenAI documentation untuk API key, official SDK, Responses API, service account, dan Structured Outputs.
- Menetapkan `OPENAI_API_KEY` dan `OPENAI_MODEL` sebagai environment server-only.
- Menetapkan official OpenAI SDK dan Responses API.
- Menetapkan Structured Outputs + Zod untuk output narasi.
- Merekomendasikan project service account khusus production Vercel dan project key masing-masing developer untuk local development.

File terdampak:
- `app/docs/BACKEND_IMPLEMENTATION_PLAN.md` diperbarui.
- `app/docs/BACKEND_ACTION_LOG.md` diperbarui.

Validasi:
- Pemeriksaan: OpenAI developer quickstart, API key/service account guidance, dan Structured Outputs guide.
- Hasil: rancangan menyimpan credential di server environment dan tidak mengeksposnya ke browser/source control.

Commit:
- Status: belum dibuat.

Catatan/risiko:
- Model dari `OPENAI_MODEL` harus mendukung Structured Outputs.
- Codex-optimized model tidak perlu dijadikan default narasi; model general-purpose dapat dipilih lewat environment tanpa perubahan kode.

## 2026-11-06 19:27 +07:00 — Penyusunan spesifikasi backend sebelum implementasi

Tujuan:
- Menurunkan rencana backend menjadi kontrak dan runbook yang dapat direview developer frontend dan game engine sebelum kode dibuat.

Tindakan:
- Menyusun kontrak API untuk auth, run, action, idempotency, error, dan frontend integration.
- Menyusun schema MongoDB versi 3, strategi `ObjectId`, index, dan batas transaksi.
- Menyusun runtime event AI dengan OpenAI Responses API, Structured Outputs Zod, fallback, timeout, dan audit.
- Menyusun spesifikasi opaque session tujuh hari dan kebijakan satu perangkat aktif.
- Menyusun test matrix termasuk concurrency, IDOR, fallback AI, contract test, dan Postman CLI.
- Menyusun runbook MongoDB Atlas, Vercel, environment, deployment, observability, dan rollback.
- Menambahkan tautan seluruh dokumen turunan ke rencana implementasi utama.

File terdampak:
- `app/docs/API_CONTRACT.md` dibuat.
- `app/docs/DATABASE_SCHEMA_V3.md` dibuat.
- `app/docs/AI_EVENT_RUNTIME.md` dibuat.
- `app/docs/AUTH_SESSION_SPEC.md` dibuat.
- `app/docs/TEST_PLAN.md` dibuat.
- `app/docs/ENVIRONMENT_AND_DEPLOYMENT.md` dibuat.
- `app/docs/BACKEND_IMPLEMENTATION_PLAN.md` diperbarui.
- `app/docs/BACKEND_ACTION_LOG.md` diperbarui.

Validasi:
- Pemeriksaan: seluruh file dokumentasi backend berada di bawah `app/docs`.
- Pemeriksaan scope: `git status --short -- docs src` dan `git diff --name-only -- docs src` tidak menghasilkan perubahan.
- Referensi OpenAI diperiksa terhadap dokumentasi resmi mengenai SDK, Responses API, Structured Outputs, API key, dan project service account.
- Pemeriksaan tautan Markdown lokal: seluruh target ditemukan.
- Pemeriksaan status: `app/app/api/docs/` tetap untracked dan tidak disentuh karena bukan scope dokumentasi backend ini.

Commit:
- Status: belum dibuat; dokumentasi masih menunggu review sebelum implementasi.

Catatan/risiko:
- Model default OpenAI belum dikunci karena perlu menyesuaikan akses akun, dukungan Structured Outputs, latency, dan budget demo.
- Library Argon2id masih memerlukan technical spike build pada Vercel Node.js.
- Kontrak API berstatus draft sampai direview frontend dan game-engine developer.

## 2026-11-06 19:42 +07:00 — Perubahan autentikasi menjadi bcrypt dan JWT

Tujuan:
- Mengganti keputusan hashing password dan token autentikasi sesuai arahan terbaru pemilik backend.

Tindakan:
- Mengganti Argon2id menjadi bcrypt dengan cost factor awal 12 yang harus di-benchmark pada Vercel Preview.
- Mengganti opaque session token menjadi JWT `HS256` dalam cookie `HttpOnly`.
- Menetapkan claim minimum JWT: `sub`, `jti`, `iat`, `exp`, `iss`, dan `aud`.
- Mempertahankan record `sessions` di MongoDB berdasarkan `jti` agar logout dan kebijakan satu perangkat dapat mencabut JWT sebelum expiry.
- Menambahkan `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, dan `BCRYPT_SALT_ROUNDS` ke rancangan environment.
- Menambahkan skenario pengujian signature, algoritma, issuer, audience, dan revoked `jti`.
- Menegaskan register tidak otomatis membuat session; session JWT dibuat ketika login sukses.

Keputusan yang digantikan:
- Argon2id dan opaque random session token pada entri sebelumnya tidak lagi berlaku.
- Durasi session tujuh hari, satu perangkat aktif, dan cookie server-side tetap berlaku.

File terdampak:
- `app/docs/AUTH_SESSION_SPEC.md` diperbarui.
- `app/docs/API_CONTRACT.md` diperbarui.
- `app/docs/DATABASE_SCHEMA_V3.md` diperbarui.
- `app/docs/BACKEND_IMPLEMENTATION_PLAN.md` diperbarui.
- `app/docs/ENVIRONMENT_AND_DEPLOYMENT.md` diperbarui.
- `app/docs/TEST_PLAN.md` diperbarui.
- `app/docs/BACKEND_ACTION_LOG.md` diperbarui.

Validasi:
- Pemeriksaan istilah lama di luar riwayat action log: tidak ada referensi aktif ke Argon2id, opaque token, `tokenHash`, atau SHA-256 session token.
- Pemeriksaan konsistensi: schema, index, environment, kontrak API, dan test plan telah memakai bcrypt, JWT, dan `jti`.
- Pemeriksaan tautan Markdown lokal: seluruh target ditemukan.
- Pemeriksaan scope: root `docs/**` dan `src/**` tidak berubah.

Commit:
- Status: belum dibuat; masih tahap dokumentasi perencanaan.

Catatan/risiko:
- JWT tidak dibuat stateless penuh karena kebutuhan logout langsung dan satu perangkat aktif memerlukan pemeriksaan session `jti` di MongoDB.
- Cost bcrypt 12 perlu diukur agar latency login sesuai batas runtime Vercel.

## 2026-11-06 — Baseline dokumentasi di-commit

Tujuan:
- Mengunci kontrak perencanaan sebelum perubahan kode backend dimulai.

Tindakan:
- Men-stage hanya `app/docs/**`.
- Membuat commit dengan identitas Git developer yang aktif.

Commit:
- `1208009 docs(backend): define implementation contracts`
- Push: tidak dilakukan.

## 2026-11-06 — Technical spike integrasi game engine

Tujuan:
- Membuktikan backend Next.js dapat memakai public API game engine tanpa mengubah file engine.

Tindakan:
- Membaca dokumentasi lokal Next.js 16 untuk Route Handlers, Backend-for-Frontend, Node runtime, Turbopack root, dan output tracing.
- Mengarahkan Turbopack dan output tracing ke root repository agar source engine dapat di-resolve dari project `app`.
- Menambahkan adapter tunggal backend ke `src/game/index.ts`.
- Menambahkan health endpoint Node.js yang memverifikasi kompatibilitas engine state versi 3.
- Mengikuti batas Next.js 16 `cacheComponents`: route tidak mengekspor segment config `runtime`; Node.js tetap menjadi runtime default.

File terdampak:
- `app/next.config.ts` diperbarui.
- `app/server/game-engine/adapter.ts` dibuat.
- `app/app/api/health/route.ts` dibuat.
- `app/docs/BACKEND_ACTION_LOG.md` diperbarui.

Scope:
- Tidak ada file pada root `src/**` atau root `docs/**` yang diubah.
- Tidak ada file halaman, component, styling, atau asset frontend yang diubah.

Validasi:
- `npm.cmd run lint`: lulus.
- `npm.cmd run build`: lulus; `/api/health` terdeteksi dan engine di-compile dari root repository.
- Build pertama mengungkap incompatibility segment config `runtime` dengan `cacheComponents`; deklarasi dihapus karena Node.js adalah default.
- Build membutuhkan akses jaringan untuk Google Fonts yang sudah digunakan frontend; tidak ada file frontend yang diubah.

Commit:
- Status: dibuat setelah validasi fitur lulus.
- Push: tidak dilakukan.

## 2026-11-06 — Fondasi server, environment, dan MongoDB

Tujuan:
- Menyediakan primitive backend yang dipakai seluruh fitur berikutnya dan dapat diverifikasi tanpa credential production.

Tindakan:
- Menambahkan Zod, MongoDB driver, bcryptjs, Jose, OpenAI SDK, dan Vitest.
- Memilih `bcryptjs` sebagai implementasi algoritma bcrypt karena native install script paket `bcrypt` diblokir kebijakan npm; cost factor tetap 12.
- Memilih Vitest 3 agar kompatibel dengan tipe Node 20 milik project.
- Menambahkan validasi environment lazy agar build tidak membutuhkan secret runtime.
- Menambahkan cached MongoDB client untuk serverless dan retry setelah connection failure.
- Menambahkan daftar index MongoDB idempotent sesuai schema v3.
- Menambahkan response envelope, request ID, error mapping, JSON parser, liveness, dan readiness route.
- Menambahkan `.env.example` tanpa nilai secret dan membuka pengecualian aman pada `.gitignore`.

File terdampak:
- `app/package.json` dan `app/package-lock.json` diperbarui hanya untuk dependency/script backend.
- `app/.gitignore` dan `app/.env.example` diperbarui/dibuat.
- `app/server/config/**`, `app/server/db/**`, dan `app/server/http/**` dibuat.
- `app/app/api/health/readiness/route.ts` dibuat.
- `app/vitest.config.ts` dibuat.
- Dokumentasi backend diperbarui.

Validasi:
- `npm.cmd run lint`: lulus.
- `npm.cmd run typecheck`: lulus.
- `npm.cmd run test`: lulus, 2 file dan 5 test.
- `npm.cmd run build`: lulus; readiness route terdeteksi dynamic.
- `npm.cmd audit --omit=dev`: 0 vulnerability pada dependency production.
- Root `src/**`, root `docs/**`, halaman, component, styling, dan asset frontend tidak diubah.

Commit:
- Status: dibuat setelah pemeriksaan staged diff.
- Push: tidak dilakukan.

Catatan/risiko:
- Readiness memerlukan environment dan Atlas yang valid saat dipanggil, tetapi tidak memblokir build.
- Dependency development memiliki advisory transitif dari toolchain test; dependency production telah diaudit bersih.

## 2026-11-06 — Autentikasi bcrypt dan JWT

Tujuan:
- Mengimplementasikan register, login, logout, dan pemeriksaan current user sesuai kontrak frontend.

Tindakan:
- Menambahkan schema Zod register/login dengan normalisasi username dan perlindungan unknown field.
- Menambahkan hashing dan verifikasi password menggunakan bcryptjs dengan cost dari environment.
- Menambahkan signing/verifikasi JWT `HS256` dengan `sub`, `jti`, issuer, audience, issued-at, dan expiry tujuh hari.
- Menyimpan JWT hanya pada cookie `HttpOnly`, `SameSite=Lax`, `Secure` di Preview/Production.
- Menambahkan transaksi penggantian session agar satu user hanya memiliki satu `jti` aktif.
- Menambahkan `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, dan `/api/auth/me`.
- Menambahkan origin validation untuk mutation request.
- Menambahkan rate limit register/login berbasis HMAC IP dan username dengan TTL serta `Retry-After`.
- Menambahkan index `auth_rate_limits`.

File terdampak:
- `app/server/auth/**` dibuat.
- `app/app/api/auth/**` dibuat.
- `app/server/db/indexes.ts`, primitive HTTP, test, dan dokumentasi backend diperbarui.

Validasi:
- `npm.cmd run lint`: lulus.
- `npm.cmd run typecheck`: lulus.
- `npm.cmd run test`: lulus, 5 file dan 13 test.
- `npm.cmd run build`: lulus; empat auth route terdeteksi dynamic.
- Unit test mencakup normalisasi/validasi input, bcrypt, fixed JWT expiry, signature salah, dan algoritma JWT tidak diizinkan.
- Integration test MongoDB Atlas belum dijalankan karena URI database test belum tersedia.
- Root `src/**`, root `docs/**`, dan file frontend tidak diubah.

Commit sebelumnya:
- `05e664f chore(backend): establish engine adapter and health route`
- `78e05f4 chore(backend): establish server and database foundation`

Commit:
- Status: dibuat setelah pemeriksaan staged diff.
- Push: tidak dilakukan.

Catatan/risiko:
- Validasi transaksi session dan unique index harus diulang terhadap Atlas test sebelum deployment.
- Cost bcrypt 12 harus di-benchmark pada Vercel Preview.

## 2026-11-06 — Run persistence dan gameplay action

Tujuan:
- Menyediakan vertical slice game yang dapat dipakai frontend dari new game sampai seluruh command engine.

Tindakan:
- Memperluas adapter tunggal untuk seluruh public gameplay action tanpa menyalin rumus engine.
- Menambahkan schema Zod untuk create run dan discriminated union sembilan gameplay action.
- Menambahkan create run idempotent dengan `startRequestId`, payload hash, replace-save guard, ruleset metadata, dan revision-0 properties.
- Menambahkan current run dan detail run dengan ownership filter.
- Menambahkan action persistence atomik dengan optimistic revision guard, action idempotency, delapan property snapshots, report battle, save pointer, dan history ending.
- Menambahkan fingerprint ruleset berdasarkan config engine melalui adapter read-only.
- Menambahkan response `GameView` berisi state, selector stats, wave preview, active narrative, dan battle report.
- Menambahkan route `/api/runs`, `/api/runs/current`, `/api/runs/[runId]`, serta `/api/runs/[runId]/actions`.

File terdampak:
- `app/server/game-engine/adapter.ts` diperbarui.
- `app/server/game/**` dibuat.
- `app/app/api/runs/**` dibuat.
- Index database, test, dan dokumentasi backend diperbarui.

Validasi:
- `npm.cmd run lint`: lulus.
- `npm.cmd run typecheck`: lulus.
- `npm.cmd run test`: lulus, 9 file dan 25 test.
- `npm.cmd run build`: lulus; seluruh run/action route terdeteksi dynamic.
- Test mencakup schema command, payload hash, delapan properties, compatibility engine, delegasi action, dan pass-through domain error.
- Transaction/concurrency test MongoDB Atlas belum dijalankan karena URI test belum tersedia.
- Root `src/**`, root `docs/**`, dan file frontend tidak diubah.

Commit sebelumnya:
- `bcbc329 feat(auth): add bcrypt and jwt authentication`

Commit:
- Status: dibuat setelah validasi final.
- Push: tidak dilakukan.

Catatan/risiko:
- Event masih memakai narasi local engine sampai fitur OpenAI/fallback berikutnya selesai.
- Concurrency dan transaction rollback wajib diverifikasi pada Atlas test replica set.

## 2026-11-06 — Runtime narasi event OpenAI dengan fallback

Tujuan:
- Menambahkan variasi narasi runtime tanpa memberi AI kendali atas aturan game.

Tindakan:
- Menambahkan adapter OpenAI Responses API dengan Structured Outputs Zod.
- Mengirim hanya konteks event tepercaya tanpa data pribadi pemain.
- Memvalidasi dua choice ID terhadap event engine dan menolak pilihan buatan model.
- Menggabungkan title/description/label AI dengan gold cost/effects engine yang tidak berubah.
- Menambahkan fallback deterministik ketika key/model kosong, timeout, refusal, provider error, atau output invalid.
- Menyimpan `event_data` dan snapshot `runs_event` dalam transaksi action yang memasuki event.
- Menandai choice event terselesaikan dalam transaksi gameplay berikutnya.
- Menjadikan konfigurasi OpenAI syarat readiness production, sementara local/test dapat berjalan fallback-only.

File terdampak:
- `app/server/ai/**` dibuat.
- `app/server/game/service.ts`, repository, dan types diperbarui.
- `app/app/api/health/readiness/route.ts` diperbarui.
- Test dan dokumentasi backend diperbarui.

Validasi:
- `npm.cmd run lint`: lulus.
- `npm.cmd run typecheck`: lulus.
- `npm.cmd run test`: lulus, 10 file dan 27 test.
- `npm.cmd run build`: lulus.
- Test AI memastikan label dapat berubah tetapi cost/effects tetap dari engine.
- Test AI memastikan choice ID tidak dikenal memicu fallback.
- Real OpenAI smoke test belum dijalankan karena API key/model developer belum tersedia pada environment lokal.
- Root `src/**`, root `docs/**`, dan file frontend tidak diubah.

Commit sebelumnya:
- `315950f feat(game): persist revision-safe gameplay runs`

Commit:
- Status: dibuat setelah validasi final.
- Push: tidak dilakukan.

Catatan/risiko:
- `OPENAI_MODEL` masih harus dipilih oleh deployment owner dan wajib mendukung Structured Outputs.
- Latency dan token budget perlu diuji pada Vercel Preview dengan API key project demo.

## 2026-11-06 — Kontrak frontend dan tooling operasional

Tujuan:
- Memberikan artefak integrasi yang dapat digunakan frontend dan operator database tanpa mengubah kode milik developer lain.

Tindakan:
- Menambahkan shared TypeScript API contract untuk envelope, auth, GameView, create run, dan gameplay action.
- Menambahkan script TypeScript idempotent untuk membuat seluruh index MongoDB Atlas.
- Menambahkan dev dependency `tsx` dan command `npm.cmd run db:indexes`.
- Menambahkan Postman collection/environment aman untuk smoke flow register sampai logout.
- Menambahkan petunjuk frontend, index setup, dan Postman ke dokumentasi.

File terdampak:
- `app/contracts/api.ts` dibuat.
- `app/scripts/setup-indexes.ts` dibuat.
- `app/postman/**` dibuat.
- `app/package.json`, lockfile, dan dokumentasi backend diperbarui.

Validasi:
- `npm.cmd run lint`: lulus.
- `npm.cmd run typecheck`: lulus, termasuk shared contract dan setup script.
- `npm.cmd run test`: lulus, 10 file dan 27 test.
- `npm.cmd run build`: lulus.
- JSON collection/environment Postman berhasil diparse.
- Postman CLI `1.74.0` dan tsx `4.23.15` terdeteksi.
- `npm.cmd audit --omit=dev`: 0 vulnerability production.
- Collection belum dijalankan karena Atlas test dan server berkonfigurasi belum tersedia.
- Root `src/**`, root `docs/**`, dan file frontend tidak diubah.

Commit sebelumnya:
- `4d696d4 feat(events): add runtime ai narratives with fallback`

Commit:
- Status: dibuat setelah validasi final.
- Push: tidak dilakukan.

## 2026-11-06 — Hardening concurrency dan credential boundary

Tujuan:
- Menutup race condition dan memastikan input/token/error malformed gagal dengan aman sebelum handoff konfigurasi Atlas.

Tindakan:
- Menambahkan filter transaksi `saveGame: null` agar dua create-run paralel tidak dapat mengganti save tanpa consent.
- Mempertahankan replace behavior hanya ketika `replaceActiveSave: true`.
- Memperketat JWT agar `jti` wajib UUID v4 dan `iat` wajib tersedia.
- Menangani cookie percent-encoding rusak sebagai unauthenticated, bukan internal error.
- Menghapus logging objek error mentah dari route/readiness agar detail sensitif tidak tercetak.
- Menambahkan regression test untuk `jti` tidak valid.

Validasi:
- `npm.cmd run lint`: lulus.
- `npm.cmd run typecheck`: lulus.
- `npm.cmd run test`: lulus, 10 file dan 28 test.
- `npm.cmd run build`: lulus.
- Root `src/**`, root `docs/**`, dan file frontend tidak diubah.

Commit sebelumnya:
- `23abf56 chore(backend): add frontend contract and api tooling`

Commit:
- Status: dibuat setelah pemeriksaan staged diff.
- Push: tidak dilakukan.

## 2026-11-06 — Upgrade test runner security patch

Tujuan:
- Menghapus advisory critical pada dependency test tanpa force-fix atau downgrade konfigurasi Next.js.

Tindakan:
- Meng-upgrade Vitest dari 3.2.4 ke patched 4.1.12 yang kompatibel dengan Node 20 types proyek.
- Mengganti config menjadi `vitest.config.mts` agar pemuatan ESM eksplisit dan tanpa warning.
- Tidak menjalankan `npm audit fix --force` karena rekomendasinya menurunkan `eslint-config-next` ke versi mayor yang tidak sesuai Next.js 16.

Validasi:
- `npm.cmd run lint`: lulus setelah perubahan config final.
- `npm.cmd run typecheck`: lulus setelah perubahan config final.
- `npm.cmd run test`: lulus, 10 file dan 28 test pada Vitest 4.1.12 tanpa warning config.
- `npm.cmd run build`: lulus.
- `npm.cmd audit --omit=dev`: 0 vulnerability production.
- Full audit tersisa 8 advisory moderate pada toolchain eslint/minimatch development; tidak masuk production runtime.

Commit sebelumnya:
- `589e654 fix(backend): harden session and run concurrency`

Commit:
- Status: dibuat setelah pemeriksaan staged diff.
- Push: tidak dilakukan.

## 2026-11-06 â€” Penyelarasan kontrak database dengan game engine

Tujuan:
- Memperbaiki mismatch tipe action dan penamaan REF MongoDB berdasarkan keputusan terkunci pada dokumen database tim.

Tindakan:
- Menambahkan `attachActiveEvent` ke persisted `GameActionType` sebagai helper internal backend/engine.
- Mempertahankan validator endpoint publik hanya untuk sembilan action frontend; request `attachActiveEvent` dari frontend ditolak.
- Menyeragamkan REF MongoDB menjadi `gameRunId` dan `gameRulesetId`, termasuk pointer save/history user, query repository, document event/report/action/property, serta index.
- Mempertahankan `runId` pada URL/API dan `GameState`, serta `rulesetId` string pada metadata `game_rulesets`, karena field tersebut bukan REF MongoDB.
- Menambahkan peringatan migrasi untuk Atlas yang mungkin sudah mempunyai field/index lama; tidak ada data atau index database yang dihapus otomatis.
- Mengabaikan mismatch `source` event sesuai arahan pemilik proyek.

File terdampak:
- `app/server/auth/types.ts`.
- `app/server/db/indexes.ts`.
- `app/server/game/**` yang terkait persistensi, view, dan validator test.
- `app/docs/DATABASE_SCHEMA_V3.md` dan `app/docs/BACKEND_IMPLEMENTATION_PLAN.md`.
- Root `src/**`, root `docs/**`, dan file game engine tidak diubah.

Validasi:
- `npm.cmd run lint`: lulus.
- `npm.cmd run typecheck`: lulus.
- `npm.cmd run test`: lulus, 10 file dan 29 test.
- `npm.cmd run build`: lulus, termasuk kompilasi route API dinamis.

Commit sebelumnya:
- `dfefe3a chore(test): upgrade vitest security patch`

Commit:
- Status: dibuat setelah validasi final dan pemeriksaan staged diff.
- Push: tidak dilakukan.

## 2026-11-06 — Final handoff frontend dan campaign API 20 hari

Tujuan:
- Menyamakan dokumentasi frontend dengan respons/timing backend aktual dan membuktikan campaign engine dapat diselesaikan melalui API serta MongoDB Atlas.

Tindakan:
- Memperbaiki contoh register dan create-run agar sesuai response aktual `{ runId, game, replayed }`.
- Mendokumentasikan `currentRevision` pada `error.fields` untuk duplicate/stale action dan kewajiban frontend mengambil ulang state.
- Menyelaraskan spesifikasi AI: create run tidak memanggil provider; narasi dibuat ketika action memasuki hari event, lalu disimpan bersama action setelah AI/fallback selesai.
- Menghapus klaim empat `runs_event` dibuat saat create run dan klaim reuse katalog yang belum diimplementasikan.
- Menambahkan runner `scripts/run-campaign.ts` serta command `npm run test:campaign` untuk campaign API hari 1–20.
- Mengubah penyelesaian `victory/gameOver` agar pointer `users.saveGame` menjadi `null` dalam transaksi yang sama dengan history dan endedAt.
- Mempertahankan `.env.example` dengan nilai kosong sesuai keputusan pemilik proyek; file secret `.env` tetap tidak dilacak Git.
- Percobaan campaign pertama ditolak aman dengan `403 ORIGIN_NOT_ALLOWED` sebelum penulisan user karena origin runner berbeda dari `APP_ORIGIN` lokal.
- Menambahkan opsi `CAMPAIGN_ORIGIN`, lalu menjalankan ulang dengan origin yang sesuai tanpa mengubah `.env` milik pengguna.
- Memverifikasi dan menghentikan proses Next.js sandbox lama pada port 3000 sebelum server campaign dengan akses Atlas dijalankan.

Hasil campaign Atlas:
- Register, login, cookie session, `/auth/me`, dan create run berhasil.
- Seluruh event hari 3, 7, 13, dan 17 diselesaikan melalui endpoint action.
- Battle hari 10, report, dan reward berhasil.
- Battle hari 20 berakhir pada `phase: victory`, revision 42.
- Run victory berhasil dibaca ulang dari MongoDB.
- `GET /api/runs/current` setelah victory menghasilkan `404 NO_ACTIVE_SAVE`.
- Logout berhasil dan `/api/auth/me` sesudahnya menghasilkan `401 UNAUTHENTICATED`.
- Data akun/run test unik dipertahankan pada database development untuk audit; tidak ada data lama yang dihapus.

File terdampak:
- `app/.env.example`.
- `app/package.json`.
- `app/scripts/run-campaign.ts`.
- `app/server/game/repository.ts`.
- `app/docs/API_CONTRACT.md`, `AI_EVENT_RUNTIME.md`, `BACKEND_IMPLEMENTATION_PLAN.md`, `DATABASE_SCHEMA_V3.md`, dan `TEST_PLAN.md`.
- Root `src/**`, root `docs/**`, serta source game engine tidak diubah.

Validasi:
- `npm.cmd run lint`: lulus.
- `npm.cmd run typecheck`: lulus.
- `npm.cmd run test`: lulus, 10 file dan 29 test.
- `npm.cmd run test:campaign`: lulus sampai victory pada revision 42.
- `npm.cmd run build`: lulus.

Commit sebelumnya:
- `2cfec77 fix(database): align action types and reference names`

Commit:
- Status: dibuat setelah validasi final dan pemeriksaan staged diff.
- Push: tidak dilakukan.

## 2026-11-06 — Panduan simulasi untuk developer frontend

Tujuan:
- Menyediakan satu dokumen handoff agar developer frontend dapat menjalankan backend dari Git Bash, mencoba smoke flow melalui Postman, dan memverifikasi campaign hari 1–20.

Tindakan:
- Menambahkan `app/docs/FRONTEND_POSTMAN_SIMULATION_GUIDE.md`.
- Mendokumentasikan prasyarat Atlas, pembuatan `.env` lokal, setup index, health/readiness, dan cara menjalankan server.
- Mendokumentasikan impor collection/environment Postman dan urutan smoke test.
- Mendokumentasikan runner campaign Bash serta seluruh urutan action manual hari 1–20 di Postman.
- Menambahkan panduan cookie, revision, expected response, troubleshooting, dan data diagnostik yang aman dibagikan.

Batas scope:
- Tidak mengubah source game engine, endpoint backend, atau artefak Postman.
- Root `src/**` dan root `docs/**` tidak diubah.

## 2026-11-08 — Penyelarasan dokumentasi dengan patch game engine dan Gemini

Tujuan:
- Menyusun target remediasi backend setelah patch game engine terbaru tanpa mengubah source frontend atau engine.
- Menetapkan Gemini sebagai provider AI default dan mempertahankan fallback terpercaya.

Tindakan:
- Mengaudit kontrak remediasi terlampir terhadap engine, backend, runner campaign, schema, index, dan dokumentasi yang ada.
- Menambahkan `BACKEND_REMEDIATION_PLAN.md` dengan ticket BE-R00–BE-R08, urutan implementasi, test, release gate, dan batas ownership file.
- Menyelaraskan API contract, implementation plan, dan database schema dengan `eventPlan`, event/choice ID dinamis, ruleset fingerprint, load consistency, active-save pointer, serta payload idempotency.
- Mengubah target runtime AI menjadi provider-neutral dengan Gemini sebagai default, output Zod, English advisor voice, dan generasi on-demand.
- Memperbarui environment contract, deployment runbook, test plan, dan panduan Postman agar memakai konfigurasi `AI_*`/`GEMINI_*` serta choice ID dari response.
- Menjaga seluruh value pada `.env.example` tetap kosong sesuai keputusan pemilik backend.

Batas scope:
- Tidak mengubah `src/game/**`, `src/ui/**`, root `docs/**`, atau source game engine lain.
- Tidak mengubah `app/components/**`, `app/app/(game)/**`, `app/lib/**`, atau `app/proxy.ts` milik frontend.
- Tidak mengubah source backend pada tahap dokumentasi ini; migrasi Gemini dan remediasi source masih berstatus pending.
- Tidak menjalankan migrasi atau penghapusan data MongoDB.

Validasi dokumentasi:
- Memeriksa `git diff --check`.
- Memeriksa daftar file berubah terhadap backend-owned scope.
- Memeriksa ulang referensi OpenAI/legacy choice ID pada dokumen aktif; referensi historis action log dipertahankan sebagai riwayat.

Commit:
- `dafb875 docs(backend): align engine remediation contracts`.
- Commit Gemini/runbook dibuat setelah staged diff final.
- Push tidak dilakukan.

## 2026-11-08 — Implementasi remediasi backend setelah patch engine

Tujuan:
- Menyelesaikan BE-R00–BE-R08 tanpa mengubah source frontend atau game engine.
- Menjamin backend dapat membaca, memvalidasi, menyimpan, dan menjalankan campaign berdasarkan `eventPlan` terbaru.

Implementasi:
- Mengganti dependency/runtime OpenAI dengan SDK resmi `@google/genai` dan Gemini sebagai provider default.
- Menambahkan konfigurasi `AI_*`/`GEMINI_*`, readiness provider aktif, JSON schema, validasi Zod, prompt advisor English, trusted choice IDs, timeout/retry, dan fallback.
- Mengganti ruleset menjadi `prototype-v3-event-plan-v1` serta menolak fingerprint ruleset yang tidak cocok.
- Menambahkan shared load validator untuk state version, `runId`, deterministic `eventPlan`, active event, ruleset, dan current-save pointer.
- Membedakan `DUPLICATE_ACTION` dari `ACTION_PAYLOAD_CONFLICT` menggunakan `payloadHash` pada jalur normal dan race.
- Membatasi action pada active save serta membuat update/clear pointer kondisional terhadap run dan revision di dalam transaksi.
- Menambah index query remediation, literal hari event/battle, source `ai | fallback | mock`, dan runtime guard sebelum write MongoDB.
- Mengubah runner campaign agar mengambil event/choice ID dinamis dari response API.
- Menyelaraskan status kontrak API, schema, runtime AI, implementation/remediation plan, test plan, environment runbook, dan panduan Postman.

Commit fitur:
- `173f07d feat(ai): add configurable gemini narrative runtime`.
- `c76521c fix(backend): validate patched engine saves and rulesets`.
- `2331d9e fix(game): harden active run pointer and action idempotency`.
- `1463d13 fix(database): align indexes and persisted game literals`.
- `cf80172 test(campaign): support dynamic engine event plans`.

Validasi aktual:
- `npm.cmd run lint`: lulus.
- `npm.cmd run typecheck`: lulus.
- `npm.cmd run test`: lulus, 14 file dan 43 test.
- `npm.cmd run db:indexes`: lulus pada database development yang dikonfigurasi; setup tetap idempotent dan tidak menghapus data/index lama.
- `npm.cmd run test:campaign`: lulus 42 action sampai `phase: victory`, revision 42; dynamic packages/choice IDs terbaca dari response.
- Campaign memverifikasi run final dapat dibaca ulang, active save kosong, logout sukses, dan `/api/auth/me` sesudah logout menghasilkan `401`.
- `npm.cmd run build`: percobaan sandbox pertama gagal mengambil Google Fonts milik frontend; pengulangan dengan akses network lulus penuh.
- `npm.cmd audit --omit=dev`: tidak menemukan vulnerability pada dependency production.
- Live Gemini call belum dijalankan karena `GEMINI_API_KEY`/`GEMINI_MODEL` belum diisi; jalur fallback dan fake generator tercakup test/campaign.

Database dan data:
- Index baru diterapkan pada database development yang sudah diverifikasi.
- User/run campaign baru dipertahankan untuk audit development.
- Tidak ada reset, delete, atau migrasi destruktif terhadap save lama.

Handoff frontend:
- Frontend membaca choice ID dari `game.eventNarrative.choices`, bukan membentuk ID dari hari.
- Frontend perlu menyediakan pesan untuk `UNSUPPORTED_STATE_VERSION`, `RUN_INTEGRITY_ERROR`, `SAVE_POINTER_MISMATCH`, dan `ACTION_PAYLOAD_CONFLICT`.
- Mapping frontend tidak diedit karena berada di luar ownership backend.

Batas scope:
- Tidak ada perubahan pada `src/game/**`, `src/ui/**`, root `docs/**`, atau file game engine.
- Tidak ada perubahan pada `app/components/**`, `app/app/(game)/**`, `app/lib/**`, atau `app/proxy.ts`.
- `.env` lokal tidak diubah atau di-commit.
- Push tidak dilakukan.

## 2026-11-08 — Perencanaan integrasi backend surrender

Tujuan:
- Menindaklanjuti engine commit `a0cc71b` yang menambahkan transisi murni `surrender(state)`.
- Menetapkan kontrak backend sebelum implementasi tanpa mengubah source engine atau frontend.

Tindakan:
- Membaca `.scratch/surrender-action/spec.md` dan tiket backend terkait.
- Menambahkan `SURRENDER_BACKEND_PLAN.md`.
- Menambahkan target `surrender` ke API contract, implementation plan, database action type, dan test plan.
- Menetapkan payload publik harus `{}` dan finalisasi memakai jalur `gameOver` generik yang sudah ada.

Batas scope:
- Tidak mengubah `src/game/**`, komponen/halaman frontend, `app/lib/**`, `app/proxy.ts`, atau root `docs/**`.
- Implementasi source belum dilakukan pada commit perencanaan ini.
- Push tidak dilakukan.

## 2026-11-08 — Implementasi dan verifikasi backend surrender

Tujuan:
- Mengekspos transisi engine `surrender(state)` melalui endpoint action backend tanpa mengubah source engine atau frontend.
- Membuktikan finalisasi `gameOver` tersimpan dan active-save pointer dilepas.

Implementasi:
- Menambahkan action `surrender` dengan payload strict `{}` pada schema Zod, shared API contract, persisted action type, dan adapter engine.
- Meneruskan state langsung ke fungsi engine tanpa menyalin rumus atau mengubah field gameplay di backend.
- Memprioritaskan `GAME_ENDED` ketika action dikirim ke run yang telah final, meskipun active-save pointer sudah dilepas.
- Menambahkan regression test adapter/schema serta runner `npm run test:surrender`.
- Memperbarui kontrak, implementation plan, rencana surrender, dan panduan Postman/frontend.

Commit:
- `e0f1093 docs(backend): define surrender action contract`.
- `b90b3e5 feat(game): expose surrender through backend actions`.
- `fb44647 test(api): verify surrender finalization flow`.
- Commit dokumentasi closeout dibuat setelah pemeriksaan final.

Validasi aktual:
- `npm.cmd run test`: lulus, 14 file dan 47 test.
- `npm.cmd run typecheck`: lulus.
- `npm.cmd run lint`: lulus tanpa warning.
- `npm.cmd run build`: lulus production build.
- `npm.cmd run test:surrender`: lulus terhadap MongoDB development setelah origin runner disamakan dengan `APP_ORIGIN`.
- Smoke test membuktikan payload tambahan ditolak `400`, surrender sukses `200`, final run dapat dibaca `200`, active save menjadi `404`, dan action setelah final ditolak `409 GAME_ENDED`.

Database dan scope:
- Smoke test menambahkan satu user/run development dan mempertahankannya untuk audit; tidak ada reset atau penghapusan data.
- Tidak mengubah `src/game/**`, `src/ui/**`, root `docs/**`, atau file game engine.
- Tidak mengubah `app/components/**`, `app/app/(game)/**`, `app/lib/**`, atau `app/proxy.ts` milik frontend.
- `.env` lokal tidak diubah atau di-commit.
- Push tidak dilakukan.

## 2026-11-08 — Perencanaan persistent game timeline

Tujuan:
- Menindaklanjuti spec dan tiket baru `.scratch/game-runs-timeline/` tanpa mengubah frontend atau game engine.
- Menetapkan `game_runs.timeline` dan `GameView.timeline` sebagai kontrak backend untuk hydrate frontend.

Tindakan:
- Menambahkan `TIMELINE_BACKEND_PLAN.md` dengan pembagian scope tiket 01–02 backend dan tiket 03 frontend.
- Memperbarui API contract, database schema, implementation plan, dan test plan.
- Menetapkan entry ID deterministik, append atomik, fallback dokumen lama, dan timeline oldest-first.
- Mengubah kontrak retry identik dari `409 DUPLICATE_ACTION` menjadi replay sukses `200` tanpa write kedua sesuai spec terbaru.

Batas scope:
- Tidak mengubah `src/game/**`, root `docs/**`, `app/components/**`, `app/lib/**`, `app/app/(game)/**`, atau `app/proxy.ts`.
- Implementasi source belum dilakukan pada commit perencanaan ini.
- Push tidak dilakukan.

## 2026-11-08 — Implementasi dan verifikasi persistent game timeline

Tujuan:
- Menyelesaikan tiket backend timeline 01–02 dan menyediakan kontrak siap konsumsi untuk tiket frontend 03.
- Menjaga timeline, state, action log, report/event, serta active-save pointer tetap konsisten dalam transaksi yang sama.

Implementasi:
- Menambahkan tipe publik `TimelineEntry`, category, tone, dan icon serta field wajib `GameView.timeline`.
- Menambahkan `game_runs.timeline: []` pada run baru dan fallback `[]` untuk dokumen prototype lama.
- Menambahkan generator copy server-safe dari snapshot sebelum/sesudah dengan ID `${actionId}:${index}`.
- Menyimpan timeline oldest-first secara atomik bersama state/revision dan seluruh side effect action.
- Mengubah retry identik menjadi replay sukses `200`; payload berbeda tetap `ACTION_PAYLOAD_CONFLICT`.
- Menambahkan entry surrender dan mempertahankan `continueFromReport` tanpa entry sesuai perilaku timeline yang ada.
- Menambahkan runner `test:timeline` dan assertion timeline pada collection Postman.

Commit:
- `f77cf92 docs(backend): define persistent timeline contract`.
- `5a05ae2 feat(game): expose persisted timeline in game views`.
- `d56d3c1 feat(game): append idempotent action timeline`.
- `4c2ac31 test(api): verify persistent action timeline`.
- Commit dokumentasi closeout dibuat setelah pemeriksaan final.

Validasi aktual:
- `npm.cmd run test`: lulus, 16 file dan 52 test.
- `npm.cmd run typecheck`: lulus.
- `npm.cmd run lint`: lulus tanpa warning.
- `npm.cmd run build`: lulus production build.
- `npm.cmd run test:timeline`: lulus terhadap MongoDB development; empty, append, replay, conflict, rejected action, final replay, dan GET persistence terverifikasi.
- `npm.cmd run test:surrender`: lulus sebagai regression.
- `npm.cmd run test:campaign`: lulus 42 action sampai hari 20, revision 42, phase `victory`.

Database, handoff, dan scope:
- Smoke tests menambahkan user/run development dan mempertahankannya untuk audit; tidak ada reset atau penghapusan data.
- Frontend harus mengerjakan tiket 03 dengan hydrate dari `initialGame.timeline` dan mengganti timeline lokal dari setiap response action.
- Tidak mengubah `src/game/**`, `src/ui/**`, root `docs/**`, atau file engine.
- Tidak mengubah `app/components/**`, `app/lib/**`, `app/app/(game)/**`, atau `app/proxy.ts` milik frontend.
- `.env` lokal tidak diubah atau di-commit.
- Push tidak dilakukan.

## 2026-11-08 — Audit kompatibilitas patch validasi engine terbaru

Tujuan:
- Mengintegrasikan commit rekan `fba69be` dan memastikan backend timeline/surrender tetap sinkron sebelum push.

Tindakan:
- Menjalankan `git fetch origin --prune` dan menemukan patch engine baru pada remote branch.
- Membaca spec/tiket `engine-validation-patch` serta diff `src/game/events.ts`, `src/game/battle.ts`, dan kontrak engine.
- Memastikan patch tidak mengubah API publik, `GameState.version`, balancing, atau bentuk persisted state.
- Merge dilakukan memakai strategi Git `ort`; file engine/root docs berasal utuh dari commit rekan dan tidak diedit backend.
- Memasang dependency root sesuai lockfile agar test engine dapat dijalankan langsung pada checkout gabungan.

Validasi setelah merge:
- Root `npm.cmd run typecheck`: lulus.
- Root `npm.cmd test`: lulus, 2 file dan 30 test engine/UI.
- App `npm.cmd run typecheck`: lulus.
- App `npm.cmd run test`: lulus, 16 file dan 52 test backend.
- App `npm.cmd run lint`: lulus tanpa warning.
- App `npm.cmd run build`: lulus production build.
- App `npm.cmd run test:timeline`: lulus.
- App `npm.cmd run test:surrender`: lulus.
- App `npm.cmd run test:campaign`: lulus 42 action sampai `victory` pada engine terbaru.

Catatan dependency dan data:
- `npm ci` root tidak mengubah source atau lockfile; `node_modules` tetap ignored.
- Audit instalasi root melaporkan 1 moderate dan 2 critical vulnerability dependency development. `npm audit fix --force` tidak dijalankan karena dapat membuat perubahan breaking di luar scope.
- Smoke test menambah data development untuk audit dan tidak melakukan delete/reset.
- Push tidak dilakukan.

## 2026-11-09 — Perencanaan sinkronisasi engine v4

Tindakan:
- Membandingkan tree patch v4 yang sudah ter-merge dengan remote patch terbaru; isi file identik walaupun hash commit berbeda karena riwayat remote ditulis ulang.
- Mengaudit kontrak engine v4 dan menemukan delta backend pada state version, difficulty, campaign 100 hari, 10 wave, 20 scheduled event, consequence event, reward per wave, dan pilihan event 2-4.
- Menambahkan kontrak integrasi khusus `ENGINE_V4_BACKEND_INTEGRATION.md` dan memperbarui API contract, implementation plan, database schema, serta test plan.
- Menetapkan batas: source engine, root docs, dan frontend tidak diedit oleh pekerjaan backend ini.

Baseline sebelum implementasi:
- Backend typecheck gagal pada asumsi state v3 dan tipe wave 1-2; frontend juga masih mengacu pada reward config v3.
- Backend test: 20 gagal dan 32 lulus karena adapter menolak `GameState.version === 4`.
- Lint lulus.

Rencana commit bertahap:
1. Dokumentasi kontrak integrasi v4.
2. Dukungan run v4, difficulty, persistence, dan view contract dinamis.
3. Narasi event dinamis 2-4 pilihan dan consequence event.
4. Campaign API 100 hari, regression test, dan handoff final.
