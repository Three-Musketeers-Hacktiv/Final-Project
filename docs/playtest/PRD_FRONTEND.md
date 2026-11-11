# PRD perbaikan — Frontend (Developer 2)

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../PRD.md).

**Status:** Draft playtest follow-up  
**Baseline dibanding:** `development` @ `d84f600`  
**Owner:** Frontend  
**Terkait:** [DIFF_SUMMARY.md](./DIFF_SUMMARY.md), [FOR_FRONTEND.md](../FOR_FRONTEND.md), [API_CONTRACT.md](../../app/docs/API_CONTRACT.md)

## 1. Tujuan

Menjadikan `/play` (dan UI produk berikutnya) **playtest-ready**: English, reward jelas, event dinamis terbaca, state dari backend bila ada, dan tidak rusak saat diakses lewat tunnel/localhost.

## 2. Yang sudah masuk di working tree (jangan diulang)

- `PlayClient` wired ke engine lokal (upgrade/repair/advance/battle/event/reward/auto)
- UI string English (TopBar, Actions, Advisor, reward hints)
- Reward menampilkan **detail efek** (gold / income / discount)
- Prep narasi via Server Action saat New Game
- `AdvisorBriefing` untuk fase event
- Layout reward “Choose reward” + hint wave 1

## 3. Masalah yang harus diperbaiki

### P0 — Playtest narasi & akses

| ID | Masalah | Acceptance |
|---|---|---|
| FE-01 | Server Action prepare gagal di Dev Tunnel → event sering fallback lokal | Ganti ke `fetch('/api/...')` (kerja sama BE); sukses di `localhost` **dan** tunnel |
| FE-02 | Saat prepare gagal, notice kurang actionable | Tampilkan error singkat + “using local package text” + tombol Retry prepare |
| FE-03 | Pemain bisa spam Advance Day sebelum prepare selesai | Disable advance/auto enable sampai prepare selesai **atau** pastikan fallback map sudah terisi |

### P1 — `/play` masih semi-mock

| ID | Masalah | Acceptance |
|---|---|---|
| FE-04 | State hanya di memori browser; refresh hilang | Opsi playtest: login + `POST /api/runs` + `POST /api/runs/:id/actions` (ikuti API contract); tampilkan `runId` + revision |
| FE-05 | `CityRecord` memakai `mockRun.city` palsu | Ikat ke data run nyata atau sembunyikan panel “flavor” dengan label Mock, atau ganti copy generik dari state |
| FE-06 | Tidak ada indikator `activeEvent.source` (`ai` \| `fallback`) | Badge kecil di AdvisorBriefing: “AI narrative” / “Local fallback” |

### P1 — Kejelasan UX playtest

| ID | Masalah | Acceptance |
|---|---|---|
| FE-07 | Battle report: log ronde hampir tidak terlihat | Panel report: HP lost, rounds, ATK/DEF terpakai, list ronde dari `battleResult.rounds` (jangan hitung ulang damage) |
| FE-08 | Phase slug mentah (`preparation`, `battleReady`) di TopBar | Map ke label human: Preparation / Event / Battle ready / Report / Reward / Victory / Defeat |
| FE-09 | Event plan tidak terlihat untuk QA | Debug strip (dev only): hari → `packageId` terpilih |
| FE-10 | Timeline masih generik (`phase preparation`) | Highlight aksi + ringkasan bermakna (gold delta / level / event title) |

### P2 — Polish & konsistensi

| ID | Masalah | Acceptance |
|---|---|---|
| FE-11 | Home `/` masih template Next.js | Redirect ke `/play` atau landing singkat City Defense |
| FE-12 | Auth UI belum ada meski API auth sudah ada | Minimal login/register playtest page bila FE-04 dikerjakan |
| FE-13 | Auto-run + event: pastikan pause reason English (sudah) dan tidak auto-resolve event | Auto tetap pause di event/reward/battle (sudah di lib) — tambah tes UI/manual checklist |
| FE-14 | Image LCP warning background | `loading="eager"` / priority pada art hero battle scene |

### P3 — Kontrak FE ↔ engine

| ID | Masalah | Acceptance |
|---|---|---|
| FE-15 | Jangan hardcode `day3-skip` dll. di client | Semua choice dari `state.activeEvent.choices` / API view |
| FE-16 | Jangan hitung biaya di UI | Tetap pakai `getUpgradeCost` / stats dari engine atau fields API `stats` |

## 4. Yang tidak dikerjakan FE

- Jangan implement rumus battle/economy kedua
- Jangan treat `src/ui/` harness sebagai UI produk
- Jangan kirim cost/effects hasil karangan ke API

## 5. Rekomendasi

1. **Urutan playtest FE:** FE-01 → FE-03 → FE-06 → FE-07 → FE-04.  
   Tanpa FE-01, playtest narasi AI di tunnel akan terus “salah kesimpulan”.
2. **Dua mode `/play` (jelas di UI):**
   - *Engine sandbox* (lokal, cepat, no auth) — label “Sandbox”
   - *Server run* (auth + Mongo) — label “Saved run”
3. Reward detail sudah baik; terapkan pola `detail:` yang sama untuk upgrade (sudah ada cost) dan event (sudah ada cost line).
4. Checklist manual playtest FE (lampirkan di PR):
   - [ ] New Game → notice prepare sukses/fallback
   - [ ] Hari 3 event English + 2 pilihan + source badge
   - [ ] New Game kedua → package/narasi bisa beda
   - [ ] Wave 1 reward menampilkan 3 detail bonus
   - [ ] Refresh di `battleReport` tidak mengubah HP
   - [ ] Tunnel URL tidak 500 saat prepare

## 6. Estimasi kasar

| Bucket | Effort |
|---|---|
| Prepare via API + gating (FE-01..03) | 0.5–1 hari |
| Source badge + battle report + phase labels (FE-06..08) | 0.5–1 hari |
| Wire auth/run API sandbox dual-mode (FE-04, FE-12) | 1–2 hari |
| Polish mock/timeline/LCP (FE-05, FE-09..11, FE-14) | 0.5 hari |
