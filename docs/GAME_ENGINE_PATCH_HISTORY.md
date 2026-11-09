# Riwayat patching — Game Engine (`src/game`)

Dokumen ini merangkum **urutan perubahan engine** dari fondasi sampai patch validasi terkini, agar FE/BE dan playtest punya acuan yang sama.  
Kontrak hidup: [DEV1_CONTRACT.md](./DEV1_CONTRACT.md). Ringkas breaking v1→v3: [../Patch.md](../Patch.md).

| | |
|---|---|
| Lokasi kode | `src/game/` |
| Format save saat ini | `GameState.version: 4` |
| Baseline awal | `cc9840e` (*alpha 0.1*) pada branch `development-game-engine` |
| Status patch terakhir | Kampanye 100 hari + difficulty + v4 (lihat §12) |

```text
alpha 0.1
  → prototipe tiket 01–07 (kalender, ekonomi, event, battle, reward, 20 hari)
  → tiga jalur upgrade + state v3
  → pengamanan transisi hari (hapus enterDay, incomeGrantedDays, revision)
  → publish kontrak FE/BE
  → eventPlan + pool paket + narrative overlay
  → surrender
  → perketat validasi event & battle
  → kampanye 100 hari / 10 wave / difficulty / consequences   ← sekarang (v4)
```

---

## 0. Alpha 0.1 — `cc9840e`

Titik awal repository engine. Belum ada loop 20 hari lengkap di `src/game` seperti bentuk sekarang. Spek modul dan pembagian kerja ditulis di [plans/game-engine-modules.md](../plans/game-engine-modules.md) serta [AGENTS.md](../AGENTS.md).

---

## 1. Prototipe inti (tiket 01–07)

**Commit berantai** (urutan implementasi):

| Commit | Tiket | Isi |
|---|---|---|
| `6aaf3ae` | 01 | Fondasi state + `createInitialState` |
| `0beca6e` | 02 | Ekonomi upgrade + repair |
| `754d73b` | 03 | Kalender / lanjut hari persiapan |
| `82c20c6` | 04 | Event terjadwal + efek |
| `14e319e` | 05 | Battle deterministik + laporan |
| `408f342` | 06 | Reward wave 1 → hari 11 |
| `9adfae0` | 07 | Wave 2, akhir kampanye, integrasi 20 hari |

**Spek / tiket:** [.scratch/game-engine-prototype/](../.scratch/game-engine-prototype/)

**Hasil yang terkunci di fase ini**

- Engine murni (tanpa React, DOM, `fetch`, timer, `process.env`).
- Fase: `preparation` | `event` | `battleReady` | `battleReport` | `reward` | `gameOver` | `victory`.
- Kalender 20 hari; battle hari 10 & 20; event hari 3, 7, 13, 17.
- Battle simultan, hasil dihitung sekali, log ronde disimpan di state.
- Error terstruktur (`INVALID_PHASE`, `INSUFFICIENT_GOLD`, `BATTLE_INVALID`, …).
- Integration test alur 20 hari lewat aksi publik.

Pada gelombang pertama, model ekonomi masih mengarah ke **satu jalur upgrade** (ATK+DEF) sebelum keputusan tiga jalur di bawah.

---

## 2. Tiga jalur upgrade + `version: 3`

**Keputusan:** [plans/split-three-upgrades.md](../plans/split-three-upgrades.md) · spek [.scratch/split-three-upgrades/](../.scratch/split-three-upgrades/)

| Sebelum | Sesudah |
|---|---|
| `upgradeLevel` tunggal (ATK+DEF) | `wallLevel` (DEF), `troopLevel` (ATK), `cityLevel` (MaxHP + income) |
| Satu tombol upgrade kota = ATK+DEF | `upgradeWall` / `upgradeTroops` / `upgradeCity` + `repairCity` |
| Save lama | **`version: 3`** — tidak ada migrasi dari v1/v2 |

**Aturan playtest yang ikut terkunci**

- Satu aksi ekonomi sukses per hari persiapan (salah satu dari tiga upgrade atau repair).
- Biaya: `50 + level × 20`; diskon upgrade (bukan repair) ke ketiga jalur; max level 5.
- Bonus: tembok DEF +2, pasukan ATK +5, kota MaxHP +20 dan income +8.
- `dailyIncome` playtest **25** (bukan 15 di tabel AGENTS lama).
- Upgrade kota menambah MaxHP dan HP saat ini sebesar bonus (bukan heal penuh).

---

## 3. Pengamanan transisi hari

**Spek:** [.scratch/pengamanan-transisi-hari/](../.scratch/pengamanan-transisi-hari/)

Masalah: `enterDay(day)` memungkinkan lompat/mundur hari, double income, dan melewati event/battle/reward.

| Perubahan | Detail |
|---|---|
| Hapus API publik | `enterDay` dihilangkan |
| Maju hari | Hanya `endPreparationDay` (dan masuk hari 11 lewat `chooseReward`) |
| Pemasukan | `incomeGrantedDays: number[]` — tepat sekali per hari persiapan |
| Revisi | `revision` naik +1 tiap aksi sukses yang mengubah state |
| Event wajib | Belanja / lanjut hari ditolak dengan `EVENT_REQUIRED` jika event belum selesai |
| Error baru | `INVALID_TRANSITION` untuk lompatan kalender ilegal |

Income hari 1 hanya lewat `createInitialState` (satu kali).

---

## 4. Publish kontrak FE/BE — `01dfe2e` (2026-11-06)

Engine dipublikasikan sebagai sumber kebenaran aturan untuk integrasi produk.

| Dokumen | Peran |
|---|---|
| [DEV1_CONTRACT.md](./DEV1_CONTRACT.md) | Schema state v3 + API publik |
| [FOR_FRONTEND.md](./FOR_FRONTEND.md) | Cara FE mengonsumsi state/error |
| [FOR_BACKEND.md](./FOR_BACKEND.md) | Cara BE memanggil engine + persist |
| [../Patch.md](../Patch.md) | Checklist breaking v1 → v3 |

Freeze fitur spekulatif sampai playtest: [plans/feature-freeze-playtest.md](../plans/feature-freeze-playtest.md).

---

## 5. Event plan, pool paket, narrative overlay — `3c14d24` (2026-11-08)

**Ringkas vs baseline playtest:** [playtest/DIFF_SUMMARY.md](./playtest/DIFF_SUMMARY.md) · PRD engine: [playtest/PRD_GAME_ENGINE.md](./playtest/PRD_GAME_ENGINE.md)

| Sebelum | Sesudah |
|---|---|
| 1 paket tetap per hari event | **Pool 2 paket/hari**; run memilih satu lewat `eventPlan` ber-seed `runId` |
| ID lama (`event-day-3`, `day3-pay`, …) | ID dinamis (`event-day-3-scouts`, `day3-scouts-pay`, …) |
| Narasi di luar engine | `decorateActiveEvent` murni — ubah title/description/label saja |
| Copy campuran | Fixture English (“my lord”) |

**File baru / kunci**

- `eventPlan.ts` — `pickEventPlan`, `resolveEventPackage`
- `narrative.ts` — `decorateActiveEvent`
- `config.ts` — 8 paket tepercaya (2×4 hari)
- State: `eventPlan: EventPlanEntry[]` (tetap `version: 3`)

AI/mock **tidak** boleh menentukan cost/effect; hanya overlay narasi setelah ID tervalidasi.

---

## 6. Surrender — `a0cc71b` (2026-11-08)

| Item | Isi |
|---|---|
| API | `surrender(state)` di `transitions.ts`, diekspor dari `index.ts` |
| Perilaku | Run aktif → `phase: "gameOver"`, `revision + 1`; field lain tidak diubah |
| Penolakan | Sudah `gameOver` / `victory` → `GAME_ENDED` |
| Di luar engine | Wiring BE (`applyGameAction` / schema) dan tombol Settings FE — lihat [.scratch/surrender-action/](../.scratch/surrender-action/) |

Surrender **tidak** mengubah balancing atau alur 20 hari; hanya jalur keluar sukarela ke `gameOver`.

---

## 7. Patch validasi event & battle (terkini)

**Spek / tiket:** [.scratch/engine-validation-patch/](../.scratch/engine-validation-patch/) (`spec.md` + issues 01–03)  
**Status:** diterapkan di working tree (`src/game/events.ts`, `battle.ts`, `game.test.ts`); belum digambarkan sebagai commit terpisah di log di atas.

### 7.1 Masalah yang direproduksi

1. **Event** — Setelah pilihan defense +4, paket yang sama bisa dipasang lagi lewat `attachActiveEvent` dengan `eventId` berbeda; `chooseEventOption` menerima dan menumpuk defense menjadi +8.
2. **Battle** — `resolveBattle` menerima `cityAttack` `NaN` / `Infinity` karena guard lama memakai `<= 0` (`NaN <= 0` adalah `false`), sehingga HP di laporan bisa `NaN`.

### 7.2 Perbaikan event (`events.ts`)

- Paket terpercaya hanya jika `eventId`, `packageId`, dan `day` cocok **entry `eventPlan` run** serta config; tanpa fallback pool longgar.
- `event.day` harus sama `state.day`; attach hanya di fase `preparation` | `event`; pilih hanya di fase `event`.
- Tolak di luar jadwal, paket lain di luar plan, identitas palsu, event sudah selesai.
- Attach ulang identitas aktif yang sama → **no-op** (revision tidak naik).
- Event aktif tidak diganti respons narasi terlambat.
- Cost/effect selalu dari config terpercaya, bukan payload AI/event.

### 7.3 Perbaikan battle (`battle.ts`)

- Semua field numerik snapshot wajib `Number.isFinite`.
- HP awal & attack kota/monster harus positif; defense ≥ 0.
- Pasangan `(wave, day)` harus ada di `gameConfig.waves`.
- Invalid → `null` (kontrak `resolveBattle`); `startBattle` tetap `BATTLE_INVALID`.
- Rumus damage, simultan, double-KO, dan `cityHpLost` **tidak** diubah.

### 7.4 Regresi

Tes di `game.test.ts` mencakup: double-bonus event ditolak, plan/fase/hari salah, identitas inkonsisten, no-op attach, late replace, efek palsu diabaikan, non-finite battle, wave/hari invalid, battle valid deterministik, campaign 20 hari tetap hijau.

Verifikasi yang dijalankan saat patch: `npm run typecheck`, `npm test` (root).

---

## 8. Peta file `src/game` (era v3 — historis)

Pada era validasi event/battle, pohon file masih `version: 3` / 20 hari. Setelah §12, lihat peta file terkini di situ.

---

## 9. Apa yang sengaja tidak diubah oleh patch engine

- UI produk, backend AI, Mongo/auth, balancing angka wave.
- Format `GameState.version` (tetap 3).
- Dependency baru atau refactor besar di luar `src/game`.
- Timer / auto-run (milik UI; lihat `src/ui/autoRun.ts` / app `lib/autoRun`).

---

## 10. Cara verifikasi cepat

```bash
npm run typecheck
npm test
```

Fokus engine: `src/game/game.test.ts` (termasuk describe event validation, `resolveBattle validation`, dan `20-day campaign`).

---

## 11. Indeks dokumen terkait

| Dokumen | Isi |
|---|---|
| [DEV1_CONTRACT.md](./DEV1_CONTRACT.md) | Kontrak state & API |
| [../Patch.md](../Patch.md) | Breaking change v1→v3 untuk FE/BE |
| [playtest/DIFF_SUMMARY.md](./playtest/DIFF_SUMMARY.md) | Diff playtest (eventPlan, English, AI prep) |
| [playtest/PRD_GAME_ENGINE.md](./playtest/PRD_GAME_ENGINE.md) | Follow-up polish engine |
| [HARNESS.md](./HARNESS.md) | Mock harness (bukan UI produk) |
| [FOR_FRONTEND.md](./FOR_FRONTEND.md) / [FOR_BACKEND.md](./FOR_BACKEND.md) | Integrasi peran |
| [../AGENTS.md](../AGENTS.md) | Instruksi Developer 1 |
| [../MVP.md](../MVP.md) | Lingkup MVP v2.1 |
| [../.scratch/engine-validation-patch/](../.scratch/engine-validation-patch/) | Spek + tiket patch validasi event/battle |

---

## 12. Kampanye 100 hari + difficulty + state v4 (2026-11-09)

**Lingkup:** rewrite `src/game` saja. Produk FE/BE (`app/`) **belum** di-wire; kontrak ada di [CAMPAIGN_100_DAY_CONTRACT.md](./CAMPAIGN_100_DAY_CONTRACT.md), [FOR_FRONTEND.md](./FOR_FRONTEND.md), [FOR_BACKEND.md](./FOR_BACKEND.md), [DEV1_CONTRACT.md](./DEV1_CONTRACT.md), [../Patch.md](../Patch.md).

### 12.1 Keputusan

| Topik | Isi |
|---|---|
| Kalender | Hari 1–100; battle tiap 10 hari (10 wave) |
| Wave | Spike/tank roles; Goblin→Demon King (lihat `gameConfig.waves`) |
| Difficulty | `easy` / `normal` / `hard` di state; skala monster + ekonomi |
| Event days | 2 hari prep / dekade dari `pickEventPlan(runId)` (bukan 3/7 tetap) |
| Choices | 2–4 per paket; ≥1 gratis; multi-effect tepercaya |
| Consequences | Skip/refuse → `pendingConsequences`; tembak 1–3 hari sebelum battle |
| Rewards | Unik per wave 1–9; `rewardsChosenByWave`; wave 10 → victory |
| Ekonomi | Max track 18; biaya 45+30×L; income 28; repair 35/45 |
| Save | `version: 4` — tolak v3 ke bawah, tanpa migrasi |

### 12.2 File kunci

| File | Peran |
|---|---|
| `types.ts` | State v4, Difficulty, PendingConsequence, efek baru |
| `difficulty.ts` | Multiplier easy/normal/hard |
| `config.ts` | 100-hari waves, waveRewards, re-export packages |
| `eventPackages.ts` | Paket terjadwal per dekade + consequence |
| `eventPlan.ts` | Hari + paket per dekade; `shiftPlanEntryDay` |
| `calendar.ts` / `dayEnter.ts` | Prep/battle derived; masuk hari + prioritas consequence |
| `effects.ts` / `stats.ts` / `economy.ts` / `battle.ts` | Scaling + efek heal/maxHp |
| `events.ts` / `rewards.ts` / `transitions.ts` | Consequence schedule, reward per wave, victory wave 10 |
| `narrative.ts` | Overlay 2–4 label |
| `game.test.ts` | Regresi kampanye v4 |

### 12.3 Verifikasi

```bash
npm run typecheck
npm test
```

Hasil saat patch: typecheck OK; Vitest 27/27 hijau (`src/game/game.test.ts` + `src/ui/autoRun.test.ts`). Harness try-UI (`src/ui/main.ts`) disesuaikan minimal ke v4 agar typecheck root lulus — **bukan** produk `app/`.

### 12.4 Yang sengaja belum disentuh

- `app/components`, `app/server`, adapter, Mongo schema, AI runtime produk.
- FE/BE harus mengadopsi kontrak v4 secara terpisah.

---

Bila menambah patch engine berikutnya, **tambahkan seksi baru di bawah §12** (tanggal, masalah, file, tes, hasil verifikasi) dan folder `.scratch/<nama-fitur>/` sesuai [agents/issue-tracker.md](./agents/issue-tracker.md).

---

## 13. Demon King, consequence wave, label harga (2026-11-09)

Diterapkan di `development-backend-v3` (engine v4 yang sama, plus perbaikan antrian consequence). Save tetap `version: 4`.

| Masalah | Perbaikan |
|---|---|
| Demon King tidak terkalahkan pada plafon upgrade | Wave 5–10 diturunkan di `config.ts` supaya progresi (bukan hanya boss) bisa dilewati dengan upgrade sungguhan; hard monster HP 1.20 / ATK 1.12; wall +3 DEF; city +35 MaxHP |
| Consequence memberi bonus wave yang sudah lewat | Jadwal mengutamakan hari sebelum `targetWave`; jika penuh, paket diganti successor tepercaya; apply menggeser defense/discount ke wave berikutnya |
| Label harga ≠ biaya efektif | Placeholder `{goldCost}` diisi saat scale; label AI yang menyebut angka lain dibuang |

Tes: plafon wave 9–10 easy/normal, kampanye 100 hari easy lewat aksi publik, repro `late-3`, expiry defense, label easy/hard.

---

## 14. Label AI tanpa nominal + kontrak successor (2026-11-09)

- Overlay label yang menyebut nominal mata uang (urutan apa pun, digit, angka tertulis, alias `gold`/`coin`/`treasury`/`gp`) ditolak; `decorateActiveEvent` memakai label engine. Deskripsi tidak dipindai.
- `isTrustedConsequencePackage` diekspor agar BE menerima successor di `CONSEQUENCE_SUCCESSOR`, bukan hanya paket asal.
- Kontrak implementasi: [ENGINE_TO_BE_CONTRACT.md](./ENGINE_TO_BE_CONTRACT.md), [ENGINE_TO_FE_CONTRACT.md](./ENGINE_TO_FE_CONTRACT.md). Kode `app/` dan `src/ui/` tidak diubah pada patch ini.
