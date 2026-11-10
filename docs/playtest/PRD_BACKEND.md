# PRD perbaikan — Backend / AI runtime

> **Superseded.** Create-run pre-generation and narrative-only authority in this draft are not the current runtime. Use [AI_EVENT_RUNTIME.md](../../app/docs/AI_EVENT_RUNTIME.md).

**Status:** Draft playtest follow-up  
**Baseline dibanding:** `development` @ `d84f600`  
**Owner:** Backend (Dev 3)  
**Terkait:** [DIFF_SUMMARY.md](./DIFF_SUMMARY.md), [AI_EVENT_RUNTIME.md](../../app/docs/AI_EVENT_RUNTIME.md), [FOR_BACKEND.md](../FOR_BACKEND.md)

## 1. Tujuan

Menjadikan create-run + event narrative **andal untuk playtest**: tiap run punya paket + narasi unik, AI tidak menentukan aturan, dan FE produk bisa mengonsumsi API tanpa Server Action rapuh.

## 2. Yang sudah masuk di working tree (jangan diulang)

- Split adapter OpenAI / Gemini + `AI_PROVIDER`
- Prompt English shared
- `prepareRunEventNarratives` + simpan `preparedEventNarratives` pada `createRun`
- Action hari event memakai prepared dulu, on-demand hanya fallback save lama
- `normalizeGameState` backfill `eventPlan`
- Campaign script & Postman guide: `choiceId` dari `eventNarrative`

## 3. Masalah yang harus diperbaiki

### P0 — Playtest AI harus jalan di semua cara akses

| ID | Masalah | Acceptance |
|---|---|---|
| BE-01 | `/play` memakai **Server Action** yang gagal di Dev Tunnel (`x-forwarded-host` ≠ `origin`) | Sediakan `POST /api/events/prepare` (atau extend `POST /api/runs`) yang dipanggil FE; jangan andalkan Server Action untuk generate |
| BE-02 | Origin/trusted host belum mencakup tunnel playtest | Dokumentasikan + dukung `APP_ORIGIN` / allowlist origin untuk lokal + tunnel playtest tanpa melemahkan prod |
| BE-03 | Create-run bisa timeout karena 4× AI serial | Parallelize generate (Promise.allSettled per paket) + batas timeout jelas; sebagian fallback tidak gagalkan seluruh create |

### P1 — Persistensi & kontrak run

| ID | Masalah | Acceptance |
|---|---|---|
| BE-04 | Schema Mongo/`DATABASE_SCHEMA_V3` belum resmi cantumkan `preparedEventNarratives` + `state.eventPlan` | Update schema docs + contoh dokumen |
| BE-05 | Create-run replay (`startRequestId`) harus mengembalikan prepared yang sama | Replay tidak generate ulang; deterministic terhadap prepared tersimpan |
| BE-06 | Response `POST /api/runs` tidak mengekspos ringkasan plan/prepared ke FE | Tambah field view opsional: `eventPlan`, `preparedCount`, `preparedSources` (ai/fallback) — tanpa prompt mentah |

### P1 — Observability playtest

| ID | Masalah | Acceptance |
|---|---|---|
| BE-07 | Sulit bedakan AI vs fallback saat playtest | Log terstruktur: `runId`, `eventId`, `source`, `provider`, `model`, `promptVersion` (tanpa API key / prompt penuh) |
| BE-08 | Health/readiness belum cukup untuk “AI configured?” | Endpoint health/readiness menyebutkan provider terpilih + configured boolean (tanpa secret) |

### P2 — Tes & hardening

| ID | Masalah | Acceptance |
|---|---|---|
| BE-09 | Vitest app runner bermasalah di lingkungan ini | Perbaiki config/isolation agar `server/**/*.test.ts` hijau di CI lokal |
| BE-10 | Belum ada test service-level: createRun mengisi prepared; action hari event tidak double-generate | Unit/integration dengan generator fake |
| BE-11 | Race: createRun transaction lalu update prepared — bila update gagal, run tanpa narasi | Transaksi atau status `narrativesStatus: pending\|ready\|fallback` + retry endpoint aman |

### P3 — Keamanan & biaya

| ID | Masalah | Acceptance |
|---|---|---|
| BE-12 | Prepare endpoint tidak boleh menerima effects arbitrer dari client | Hanya terima `runId` auth **atau** `packageId[]` yang divalidasi ke katalog engine |
| BE-13 | 4 request AI / run × banyak playtester = biaya | Cache prepared per run; jangan regenerate on refresh; pertimbangkan model flash + max tokens yang sudah ada |

## 4. Yang tidak dikerjakan backend

- Jangan duplikasi rumus ekonomi/battle di luar engine
- Jangan biarkan AI menambah choice / mengubah goldCost / effects
- Jangan anggap `/play` Server Action sebagai kontrak produksi

## 5. Rekomendasi

1. **API-first untuk narasi:** `POST /api/runs` = create + prepare; FE produk hanya konsumsi view. `/play` sementara memanggil endpoint HTTP yang sama (bukan Server Action) agar tunnel/localhost konsisten.
2. **Parallel prepare + partial fallback** agar create-run tidak terasa “hang” 30–120 detik.
3. **Surface `source` ke FE** (`activeEvent.source` sudah ada) + badge di UI (kerja sama FE).
4. Sinkronkan `APP_ORIGIN` playtest: untuk lokal `http://localhost:3000`; untuk tunnel, set origin tunnel secara eksplisit di `.env` playtest (jangan commit secret).
5. Setelah freeze, jalankan `npm run test:campaign` terhadap server lokal sebagai gate playtest.

## 6. Estimasi kasar

| Bucket | Effort |
|---|---|
| HTTP prepare + origin/tunnel (BE-01..03) | 1 hari |
| Schema/view/observability (BE-04..08) | 0.5–1 hari |
| Tests + narrative status (BE-09..11) | 1 hari |
| Cost/safety polish (BE-12..13) | 0.5 hari |
