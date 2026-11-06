# Frontend — cara pakai Game Engine

Baca dulu: [DEV1_CONTRACT.md](./DEV1_CONTRACT.md)

## Yang FE kerjakan

- UI produk: dashboard kota, tombol aksi, animasi battle, halaman event/reward
- Tampilkan state dari backend (`GameState` version 3)
- Map `error.code` ke pesan UI (jangan hardcode rumus biaya/damage di UI)
- Auth: simpan JWT dari login BE dan kirim di `Authorization: Bearer <token>`; buang token saat logout

## Yang jangan dikerjakan FE

- Jangan hitung ulang biaya upgrade, damage battle, income, atau reward
- Jangan percaya angka efek dari AI mentah; pakai ID pilihan yang divalidasi engine/BE
- Folder `src/ui/` milik Dev1 adalah try UI, **bukan** UI produk

## State yang perlu ditampilkan

- `day`, `phase`, `gold`, `cityHp` / `cityMaxHp`
- `wallLevel`, `troopLevel`, `cityLevel`
- `actionUsedToday`, efek aktif, `battleResult`, pilihan reward

## Phase → UI

| Phase | UI |
|---|---|
| `preparation` | upgrade / repair / lanjut hari |
| `event` | 2 pilihan event |
| `battleReady` | tombol mulai battle |
| `battleReport` | putar log (tanpa hitung ulang damage) |
| `reward` | 3 pilihan (hanya setelah wave 1) |
| `gameOver` / `victory` | layar akhir |

## Aksi ke backend

Kirim action id + payload; terima `{ ok, state }` atau `{ ok:false, error:{ code, message } }`.

Contoh action:

- `upgradeWall`
- `upgradeTroops`
- `upgradeCity`
- `repairCity`
- `endPreparationDay`
- `startBattle`
- `continueFromReport`
- `chooseEventOption`
- `chooseReward`

## Selector (opsional di client untuk preview)

Import dari `src/game` hanya untuk baca:

- `getEffectiveStats(state)`
- `getUpgradeCost(state, track)`
- `getRepairCost(state)`
- `getWavePreview(state)`

Mutasi state tetap lewat API backend.

## Error codes untuk pesan UI

| Code | Arti singkat |
|---|---|
| `INVALID_PHASE` | Aksi tidak sesuai fase |
| `INVALID_TRANSITION` | Transisi hari tidak valid |
| `EVENT_REQUIRED` | Event harus diselesaikan dulu |
| `NO_ACTION_LEFT` | Slot aksi harian sudah terpakai |
| `INSUFFICIENT_GOLD` | Gold tidak cukup |
| `MAX_UPGRADE` | Track sudah max level |
| `HP_FULL` | Repair tidak diperlukan |
| `INVALID_CHOICE` | Pilihan tidak valid |
| `EVENT_ALREADY_RESOLVED` | Event sudah selesai |
| `REWARD_ALREADY_CHOSEN` | Reward sudah diambil |
| `BATTLE_INVALID` | Battle tidak valid |
| `BATTLE_ALREADY_RESOLVED` | Battle sudah dihitung |
| `GAME_ENDED` | Run sudah `gameOver` / `victory` |
