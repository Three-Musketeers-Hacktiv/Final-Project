# API Publik dan Integrasi

Import dari barrel [`src/game/index.ts`](../../src/game/index.ts) (atau path setara di app).

## Pola pemanggilan

```ts
import {
  createInitialState,
  getEffectiveStats,
  getWavePreview,
  upgradeWall,
  repairCity,
  endPreparationDay,
  chooseEventOption,
  startBattle,
  continueFromReport,
  chooseReward,
  surrender,
  type GameState,
  type ActionResult,
} from "../../src/game";

let state = createInitialState({ runId: "demo-run", difficulty: "normal" });

function apply(result: ActionResult): void {
  if (!result.ok) {
    // tampilkan result.error.code; jangan mutasi state
    return;
  }
  state = result.state; // selalu pakai state terbaru
}
```

## Lifecycle singkat

```ts
apply(upgradeWall(state));
apply(endPreparationDay(state));
// … sampai battleReady
apply(startBattle(state));
apply(continueFromReport(state));
// jika phase reward setelah wave 1–9:
apply(chooseReward(state, "w1-gold"));
```

## Fungsi publik (ringkas)

### State & config

| Fungsi | Tujuan | Catatan |
|---|---|---|
| `createInitialState(opts?)` | State awal v4 | Default `runId="run-1"`, `difficulty="normal"`; income hari 1 sudah masuk |
| `GAME_STATE_VERSION` | Konstanta `4` | Tolak save ≠ 4 di boundary BE |
| `gameConfig` | Objek config | Read-only |
| `getWaveByDay` / `getWaveByNumber` / `lastWaveNumber` | Lookup wave | |
| `rewardsForWave` / `rewardById` | Lookup reward | |
| `eventPackageById` / `eventPackagesForDecade` | Lookup paket | |
| `scheduledEventDays()` | Legacy | Selalu `[]` |
| `eventPackagesForDay` / `eventPackageForDay` | Legacy | Lihat [ARCHITECTURE.md](./ARCHITECTURE.md) |

### Selector

| Fungsi | Output |
|---|---|
| `getEffectiveAttack` / `getEffectiveDefense` / `getEffectiveStats` | Stat & biaya tampilan |
| `getUpgradeCost(state, track)` | Biaya jalur |
| `getRepairCost(state?)` | Biaya repair |
| `getWavePreview(state)` | Monster efektif + ATK/DEF kota |
| `incomeAmountForDay(state, day)` | Income teoritis hari itu |
| `isBattleDay` / `isPreparationDay` / `nextBattleDay` / `previousBattleDay` / `prepSegmentForDay` | Kalender |
| `hasUnresolvedEvent(state)` | Blok belanja/lanjut |
| `getDifficultyModifiers` / `isDifficulty` / `scale*` | Difficulty helpers |

### Event plan

| Fungsi | Tujuan |
|---|---|
| `pickEventPlan(runId)` | Bangun 20 entri |
| `hashString` | Hash stabil |
| `planEntryForDay` / `resolveEventPackage` / `shiftPlanEntryDay` | Resolve/geser |

### Aksi mutasi (`ActionResult`)

| Fungsi | Prasyarat utama | Sukses mengubah |
|---|---|---|
| `upgradeWall/Troops/City` | Prep, no event, slot aksi, gold, level < 18 | Level, gold, mungkin MaxHP/HP |
| `repairCity` | Prep, HP < max, gold | HP, gold |
| `endPreparationDay` | Prep/event resolved | Hari berikutnya via `enterCalendarDay` |
| `attachActiveEvent` | Identitas valid | `activeEvent` |
| `ensureLocalEvent` | Hari butuh event | Isi `activeEvent` lokal |
| `chooseEventOption(state, choiceId)` | Event aktif, pilihan valid | Gold/HP/efek/consequence/fase |
| `decorateActiveEvent(state, overlay)` | — | Mengembalikan **GameState** (bukan `ActionResult`) |
| `startBattle` | `battleReady`, belum resolved | `battleResult`, HP, fase |
| `continueFromReport` | `battleReport` | `reward` / `victory` / `gameOver` |
| `chooseReward(state, rewardId)` | `reward`, ID wave ini | Efek + hari berikutnya |
| `surrender` | Belum ended | `gameOver` |
| `resolveBattle(snapshot)` | Snapshot valid | `BattleResult \| null` (murni, tanpa state) |

### Narrative helpers

`choiceLabelRespectsGoldCost`, `labelStatesCurrencyAmount`, `narrativeChoiceIdsMatch`, `trustedChoiceLabel` — validasi overlay.

### Consequence exports

`CONSEQUENCE_SUCCESSOR`, `CONSEQUENCE_TARGET_WAVE`, `isTrustedConsequencePackage`.

## Kode error engine

| Code | Arti |
|---|---|
| `INVALID_PHASE` | Fase tidak mengizinkan aksi |
| `INVALID_TRANSITION` | Transisi kalender/reward tidak sah |
| `EVENT_REQUIRED` | Event belum selesai |
| `NO_ACTION_LEFT` | Slot ekonomi hari ini habis |
| `INSUFFICIENT_GOLD` | Gold kurang |
| `MAX_UPGRADE` | Level track maksimal |
| `HP_FULL` | Repair tidak perlu |
| `INVALID_CHOICE` | Pilihan/reward tidak dikenal |
| `EVENT_ALREADY_RESOLVED` | Event sudah selesai |
| `REWARD_ALREADY_CHOSEN` | Reward wave sudah diambil |
| `BATTLE_INVALID` | Konfigurasi battle invalid |
| `BATTLE_ALREADY_RESOLVED` | Battle hari ini sudah dihitung |
| `GAME_ENDED` | Sudah `gameOver` / `victory` |

Reserved untuk lapisan BE (bukan engine): `RUN_MISMATCH`, `STALE_REVISION`, `DUPLICATE_ACTION`, `UNSUPPORTED_STATE_VERSION`.

## State version, save, laporan

- Persist hanya `version: 4`. Migrasi otomatis dari v1–v3 **tidak** disediakan engine.
- Setelah `startBattle`, simpan `battleResult`. Refresh UI harus membaca hasil tersimpan, bukan memanggil `startBattle` lagi.
- `revision` untuk optimistic concurrency di BE.

## Kontrak FE/BE

| Dokumen | Isi |
|---|---|
| [`../DEV1_CONTRACT.md`](../DEV1_CONTRACT.md) | Schema + API ringkas |
| [`../CAMPAIGN_100_DAY_CONTRACT.md`](../CAMPAIGN_100_DAY_CONTRACT.md) | Wire 100-hari |
| [`../FOR_FRONTEND.md`](../FOR_FRONTEND.md) / [`../FOR_BACKEND.md`](../FOR_BACKEND.md) | Panduan role |
| [`../ENGINE_TO_FE_CONTRACT.md`](../ENGINE_TO_FE_CONTRACT.md) / [`../ENGINE_TO_BE_CONTRACT.md`](../ENGINE_TO_BE_CONTRACT.md) | Narasi/harga |

### Gap yang perlu diperhatikan

- [`../CAMPAIGN_100_DAY_CONTRACT.md`](../CAMPAIGN_100_DAY_CONTRACT.md) masih menyebut produk FE/BE “belum di-wire” di pembuka; app memiliki dokumen integrasi v4 sendiri (`app/docs/ENGINE_V4_BACKEND_INTEGRATION.md`). Jangan mengklaim FE/BE selesai tanpa verifikasi endpoint/UI aktual.
- Beberapa dokumen masih menyarankan ruleset id `campaign-v4-100-day-v2` sementara app mencatat `…-v3` — metadata produk, bukan field engine.
- Helper legacy `scheduledEventDays` / `eventPackagesForDay` dapat menyesatkan adapter lama yang mengharapkan hari tetap.

Batas kepercayaan AI: hanya narasi; angka efek/biaya dari paket engine.
