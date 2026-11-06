# Backend — cara integrasi Game Engine

Baca dulu: [DEV1_CONTRACT.md](./DEV1_CONTRACT.md)

## Yang BE kerjakan

- Persist `GameState` (JSON-serializable, `version: 3`)
- Auth: `bcrypt` untuk password, JWT via `jsonwebtoken`; run ownership / Mongo collections
- Endpoint aksi: load state → panggil fungsi engine → commit state baru; simpan `actionId` client untuk dedupe
- Narasi event AI: hanya label/teks; efek tetap dari paket terpercaya di `src/game/config.ts`
- `game_report` ditulis saat battle sukses (`gameRunId` + `wave` + `actionId` client); event outcome bukan `game_report`

## Yang jangan dikerjakan BE

- Jangan duplikasi aturan ekonomi/battle di server terpisah dari engine
- Jangan terima biaya/bonus/stat arbitrer dari client
- Jangan anggap mock harness Dev1 sebagai backend produksi

## Pola apply action

```ts
import {
  createInitialState,
  upgradeWall,
  upgradeTroops,
  upgradeCity,
  repairCity,
  endPreparationDay,
  startBattle,
  continueFromReport,
  chooseEventOption,
  chooseReward,
  attachActiveEvent,
  ensureLocalEvent,
} from "../game";

// 1. load GameState terbaru untuk runId
// 2. panggil satu fungsi engine murni
// 3. jika ok:false → return error.code tanpa menulis DB
// 4. jika ok:true → simpan state (atomic) + catat action log
```

## Aturan penting

- Engine pure: no DB / fetch / timer di dalam `src/game`
- Pakai `revision` untuk deteksi stale write (tolak apply dari snapshot lama)
- Event: validasi `packageId` / `choiceId` terhadap config lokal sebelum apply
- Fallback narasi AI tidak boleh mengubah efek
- Tidak ada public API `enterDay(day)` — maju hari hanya lewat `endPreparationDay` / `chooseReward`

## Public API engine (`src/game`)

| Fungsi | Kegunaan |
|---|---|
| `createInitialState` | Buat run baru (`revision: 0`) |
| `upgradeWall` / `upgradeTroops` / `upgradeCity` | 3 jalur upgrade |
| `repairCity` | Repair HP (tidak didiskon) |
| `endPreparationDay` | Prep → hari berikutnya |
| `startBattle` | Mulai battle di hari 10/20 |
| `continueFromReport` | Lanjut dari laporan battle |
| `chooseEventOption` | Resolve event |
| `chooseReward` | Pilih reward setelah wave 1 |
| `attachActiveEvent` / `ensureLocalEvent` | Pasang event terjadwal |

## Error codes stabil untuk API response

`INVALID_PHASE` · `INVALID_TRANSITION` · `EVENT_REQUIRED` · `NO_ACTION_LEFT` · `INSUFFICIENT_GOLD` · `MAX_UPGRADE` · `HP_FULL` · `INVALID_CHOICE` · `EVENT_ALREADY_RESOLVED` · `REWARD_ALREADY_CHOSEN` · `BATTLE_INVALID` · `BATTLE_ALREADY_RESOLVED` · `GAME_ENDED`

Reserved (belum di-enforce engine): `RUN_MISMATCH` · `STALE_REVISION` · `DUPLICATE_ACTION` · `UNSUPPORTED_STATE_VERSION`

## Defaults terkunci

- 3 jalur upgrade: wall = DEF, troops = ATK, city = MaxHP + income
- Tidak ada rekrut unit individual
- Diskon upgrade berlaku ke 3 track; repair tidak didiskon
- Save format: `version: 3` (bukan migrasi dari `version: 2`)
