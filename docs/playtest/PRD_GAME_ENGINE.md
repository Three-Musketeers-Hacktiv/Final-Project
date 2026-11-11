# PRD perbaikan — Developer 1 (Game Engine)

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../PRD.md).

**Status:** Draft playtest follow-up  
**Baseline dibanding:** `development` @ `d84f600`  
**Owner:** Game engine  
**Terkait:** [DIFF_SUMMARY.md](./DIFF_SUMMARY.md), [DEV1_CONTRACT.md](../DEV1_CONTRACT.md), root [PRD.md](../../PRD.md)

## 1. Tujuan

Menjaga engine sebagai **satu sumber kebenaran aturan**, mendukung event dinamis per run tanpa menyerahkan cost/effect ke AI, dan merapikan kontrak state agar FE/BE playtest tidak pecah.

## 2. Yang sudah masuk di working tree (jangan diulang)

- Pool paket tepercaya (2 per hari event) di `src/game/config.ts`
- `eventPlan` di `GameState` + `pickEventPlan(runId)` / `resolveEventPackage`
- `decorateActiveEvent` murni di `src/game/narrative.ts`
- Copy event/reward/wave → English
- Tes plan deterministik + campaign 20 hari memakai choice index dinamis

## 3. Masalah yang harus diperbaiki

### P0 — Kontrak state terdokumentasi

| ID | Masalah | Acceptance |
|---|---|---|
| GE-01 | `docs/DEV1_CONTRACT.md` belum menyebut `eventPlan` | Kontrak state `version: 3` memuat `eventPlan: EventPlanEntry[]` + aturan resolve paket |
| GE-02 | ID event/choice lama masih tersebar di docs harness / proposal | Docs engine-facing menyebut pool ID baru atau “ambil dari plan/activeEvent” |

### P1 — Kekayaan & fairness pool event

| ID | Masalah | Acceptance |
|---|---|---|
| GE-03 | Pool saat ini **skin berbeda, mekanik hampir identik** per hari | Putuskan: (A) tetap skin-only, atau (B) tambah 1–2 varian mekanik tepercaya per hari (tetap dalam efek union yang ada) — dokumentasikan di config |
| GE-04 | Tidak ada assert invariant “satu paket terpilih per scheduled day” di luar test dasar | Tambah test: plan length = jumlah hari event; tiap entry resolve ke package yang valid |
| GE-05 | Backfill plan untuk save tanpa `eventPlan` hanya di adapter BE | Export helper `ensureEventPlan(state)` di engine agar harness/FE lokal konsisten |

### P2 — Playtest balancing & observability

| ID | Masalah | Acceptance |
|---|---|---|
| GE-06 | `dailyIncome: 25` vs tabel AGENTS 15 — mudah membingungkan playtester | Satu komentar + baris di DEV1_CONTRACT / PRD playtest “income playtest = 25” (sudah ada sebagian; pastikan sinkron) |
| GE-07 | Tidak ada fingerprint/helper “package set summary” untuk laporan playtest | Helper opsional: dari state → daftar `{day, packageId}` untuk ditampilkan di harness |

### P3 — Hardening

| ID | Masalah | Acceptance |
|---|---|---|
| GE-08 | `chooseEventOption` percaya `eventPackageById` meski plan mismatch edge-case | Tolak bila `event.packageId` tidak cocok entry plan hari itu (kecuali test fixture eksplisit) |
| GE-09 | Root Vitest hijau; pastikan tidak regresi setelah ID baru | `npm test` root tetap hijau setelah setiap ubah config |

## 4. Yang tidak dikerjakan engine

- Jangan panggil AI / `fetch` / timer
- Jangan simpan narasi AI di dalam aturan murni (narasi = overlay BE/FE)
- Jangan naikkan `version` ke 4 kecuali ada breaking field yang tidak bisa di-backfill

## 5. Rekomendasi

1. **Pertahankan model “trusted pool + seed”** — ini sudah cukup untuk “tiap player beda” tanpa merusak balance.
2. Jika playtest minta event “benar-benar beda”: perluas **pool mekanik** (bukan freeform AI). Contoh aman: varian cost/amount dalam rentang yang sudah di-playtest.
3. Tambahkan fixture builder `stateAtEventDay(runId, day)` untuk mengurangi boilerplate test FE/BE.
4. Setelah freeze ID paket playtest, buat tabel “hari → packageId options → choice roles (pay/skip)” di DEV1_CONTRACT agar Postman tidak hardcode.

## 6. Estimasi kasar

| Bucket | Effort |
|---|---|
| Docs + invariant tests (GE-01..05, GE-09) | 0.5–1 hari |
| Pool mekanik opsional (GE-03 B) | 0.5–1 hari |
| Hardening plan match (GE-08) | <0.5 hari |
