# Patch validasi event dan battle (engine)

Status: ready-for-agent

**Implementation status:** done (2026-11-08) — perubahan di `src/game/events.ts`, `src/game/battle.ts`, `src/game/game.test.ts`.  
**Riwayat kronologi:** [docs/GAME_ENGINE_PATCH_HISTORY.md](../../docs/GAME_ENGINE_PATCH_HISTORY.md) §7.

## Problem Statement

Dua celah validasi di engine murni sudah direproduksi:

1. **Event** — Setelah event hari 3 diselesaikan dengan pilihan defense +4, paket yang sama bisa dipasang lagi lewat `attachActiveEvent` dengan `eventId` berbeda. `chooseEventOption` menerima pilihan itu sehingga defense bertambah menjadi +8.
2. **Battle** — `resolveBattle` menerima `cityAttack` `NaN` atau `Infinity`. Guard lama memakai `<= 0`; `NaN <= 0` adalah `false`, sehingga HP di laporan bisa menjadi `NaN`.

Tanpa patch, FE/BE yang menyambungkan narasi terlambat atau snapshot rusak dapat menumpuk efek atau menulis laporan tidak valid.

## Solution

Perketat validasi di `attachActiveEvent` / `chooseEventOption` terhadap `eventPlan`, hari, dan fase; serta validasi `BattleSnapshot` dengan `Number.isFinite` dan rentang kontrak sebelum perhitungan. Tambah regression test. Tidak mengubah rumus damage, balancing, API publik, atau `GameState.version` (tetap 3).

## Scope

| Termasuk | Tidak termasuk |
|---|---|
| `src/game/events.ts` | UI produk, backend AI, database, persistensi |
| `src/game/battle.ts` | Perubahan balancing / rumus damage |
| Tes di `src/game/game.test.ts` | Dependency baru, refactor besar, commit/push |
| Error codes yang sudah ada | Naikkan `version` state |

## Decision log

| Keputusan | Isi |
|---|---|
| Sumber kepercayaan event | Hanya entry `eventPlan` run + `eventPackageById`; tanpa fallback `eventPackagesForDay(day)[0]` pada jalur attach/choose |
| Identitas event | `eventId` + `packageId` + `day` harus cocok plan dan config |
| Fase attach | Hanya `preparation` \| `event` |
| Fase choose | Hanya `event` |
| Attach identik | No-op, revision tidak naik |
| Late narrative | Tidak mengganti `activeEvent` yang berbeda identitas |
| Cost/effect | Selalu dari config terpercaya; abaikan effects di payload |
| Battle invalid | `resolveBattle` → `null`; `startBattle` tetap `BATTLE_INVALID` |
| Defense | Tolak negatif; `0` tetap sah |

## Detailed plan

### 1. Validasi event — `src/game/events.ts`

Helper internal menyelesaikan paket terpercaya hanya jika:

- Ada entry `eventPlan` untuk `event.day`
- `event.packageId` dan `event.eventId` sama persis dengan entry
- Paket di config ada, `day` cocok, identitas config konsisten dengan entry
- `event.day === state.day`

#### `attachActiveEvent` (urut cek)

1. `GAME_ENDED` jika run berakhir
2. `INVALID_PHASE` jika fase bukan `preparation` atau `event`
3. `INVALID_TRANSITION` jika hari tidak cocok / di luar jadwal plan
4. `INVALID_CHOICE` jika `packageId` / `eventId` tidak cocok plan/config
5. `EVENT_ALREADY_RESOLVED` jika `plan.eventId` atau `event.eventId` sudah di `completedEventIds`
6. Active dengan identitas sama → no-op `ok(state)`
7. Active berbeda → `INVALID_PHASE` (jangan diganti)
8. Sukses → `phase: "event"`, simpan event, `revision + 1`

#### `chooseEventOption`

1. Guard ended / no active / already resolved
2. `INVALID_PHASE` jika `phase !== "event"`
3. `INVALID_TRANSITION` jika `activeEvent.day !== state.day`
4. Identitas tidak konsisten terhadap plan → `INVALID_CHOICE`
5. Choice/cost/effects hanya dari paket config yang match plan
6. Apply atomik; gagal tidak mengubah state asal

Sesuaikan fixture fatal day-7 di test agar memakai paket dari `eventPlan` run (bukan `gameConfig.events.find(day === 7)` sembarang).

### 2. Validasi battle — `src/game/battle.ts`

Sebelum loop damage:

- Semua field numerik wajib `Number.isFinite` (`wave`, `day`, `cityHp`, `cityAttack`, `cityDefense`, `monsterHp`, `monsterAttack`)
- `cityHp > 0`, `monsterHp > 0`, `cityAttack > 0`, `monsterAttack > 0`
- `cityDefense >= 0`
- `wave` ∈ {1, 2} dan pasangan `(wave, day)` ada di `gameConfig.waves`

Jangan ubah rumus damage, simultan, double-KO, atau `cityHpLost`.

### 3. Regression tests — `src/game/game.test.ts`

**Event**

- [x] EventId baru + paket sama tidak bisa memberi bonus kedua kali
- [x] `packageId` di luar `eventPlan` ditolak
- [x] Hari / fase salah ditolak
- [x] Pemilihan dengan identitas tidak konsisten ditolak
- [x] Attach ulang aktif identik = no-op
- [x] Respons terlambat tidak mengganti event aktif
- [x] Efek palsu di payload tidak dipakai
- [x] State asal + revision tidak berubah saat gagal

**Battle**

- [x] `NaN` / `Infinity` / `-Infinity` pada tiap field numerik → `null`
- [x] HP/attack invalid, defense negatif, wave/hari invalid → `null`
- [x] Battle valid tetap deterministik, HP finite

**Regresi**

- [x] Integration test alur 20 hari tetap berhasil

### 4. Verifikasi

```bash
npm run typecheck
npm test
```

Hasil aktual (2026-11-08): typecheck lulus; Vitest 30/30 lulus (termasuk campaign 20 hari). Tidak ada script lint/build di root `package.json`.

## Tickets

| ID | File | Fokus |
|---|---|---|
| 01 | [issues/01-event-validation.md](./issues/01-event-validation.md) | Perketat attach + choose terhadap plan/fase/hari |
| 02 | [issues/02-battle-validation.md](./issues/02-battle-validation.md) | Guard finite + kontrak wave di `resolveBattle` |
| 03 | [issues/03-regression-tests-and-verify.md](./issues/03-regression-tests-and-verify.md) | Tes regresi + typecheck/vitest |

## Out of scope

- UI, BE AI, Mongo, harness produk
- Balancing angka
- Wiring surrender FE/BE (lihat [.scratch/surrender-action/](../surrender-action/))
- Commit atau push

## Comments

- 2026-11-08: Spek dipindahkan dari plan Cursor `engine_validation_patch` ke issue tracker lokal agar dokumentasi patch jelas bersama [GAME_ENGINE_PATCH_HISTORY.md](../../docs/GAME_ENGINE_PATCH_HISTORY.md).
- 2026-11-08: Implementasi engine selesai; tiket ditandai selesai di acceptance criteria.
