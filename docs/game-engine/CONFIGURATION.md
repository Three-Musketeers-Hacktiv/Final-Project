# Konfigurasi Game Engine

Sumber: [`src/game/config.ts`](../../src/game/config.ts), [`src/game/difficulty.ts`](../../src/game/difficulty.ts), [`src/game/eventPackages.ts`](../../src/game/eventPackages.ts).  
Config bersifat **compile-time** (objek konstanta). Tidak ada API runtime untuk mengubah balancing dari UI.

`GAME_STATE_VERSION = 4`.

## Parameter dasar (`gameConfig`)

| Nama | Nilai | Satuan | Fungsi | Pemakai utama | Dampak jika diubah |
|---|---:|---|---|---|---|
| `startingDay` | 1 | hari | Hari pertama | `initialState`, calendar | Awal kalender |
| `lastDay` | 100 | hari | Akhir campaign | `endPreparationDay`, calendar | Panjang campaign |
| `startingGold` | 100 | gold | Gold sebelum income hari 1 | `createInitialState` | Ekonomi awal |
| `dailyIncome` | 28 | gold/hari | Basis income prep | `incomeAmountForDay` | Pace gold |
| `cityMaxHp` | 150 | HP | HP/MaxHP awal | `initialState` | Ketahanan awal |
| `baseAttack` | 10 | ATK | Attack tanpa troop | `getEffectiveAttack` | Damage kota |
| `baseDefense` | 2 | DEF | Defense tanpa wall | `getEffectiveDefense` | Mitigasi |
| `upgradeBaseCost` | 45 | gold | Biaya level 0→1 | `rawUpgradeCost` | Ekonomi upgrade |
| `upgradeCostStep` | 30 | gold/level | Kenaikan biaya per level | `rawUpgradeCost` | Kurva biaya |
| `maxTrackLevel` | 18 | level | Cap tiap jalur | `economy` | Ceiling power |
| `wallDefenseBonus` | 3 | DEF/level | Bonus tembok | `getEffectiveDefense` | Tankiness |
| `troopAttackBonus` | 5 | ATK/level | Bonus pasukan | `getEffectiveAttack` | DPS |
| `cityMaxHpBonus` | 35 | HP/level | Bonus MaxHP kota | `upgradeCity` | Pool HP |
| `cityIncomeBonus` | 5 | gold/level | Bonus income dari `cityLevel` | `incomeAmountForDay` | Income mid/late |
| `repairCost` | 25 | gold | Basis biaya repair | `getRepairCost` | Biaya heal |
| `repairHeal` | 60 | HP | Heal per repair | `repairCity` | Efisiensi repair |
| `eventsPerDecade` | 2 | event | Slot terjadwal / decade | `pickEventPlan` | Frekuensi event |
| `minEventGapDays` | 2 | hari | Jarak preferensi antar event decade | `pickTwoDays` | Sebaran event |
| `battleDays` | 10…100 step 10 | hari | Hari battle | calendar, transitions | Jadwal wave |

Rumus biaya upgrade mentah (sebelum difficulty/diskon):

```text
rawCost = upgradeBaseCost + level × upgradeCostStep
        = 45 + level × 30
```

## Modifier difficulty

| Modifier | Easy | Normal | Hard | Pembulatan saat dipakai |
|---|---:|---:|---:|---|
| `monsterHp` | 0.75 | 1.0 | 1.08 | `Math.round`, min 1 |
| `monsterAttack` | 0.80 | 1.0 | 1.06 | `Math.round`, min 1 |
| `upgradeCost` | 0.85 | 1.0 | 1.08 | `Math.ceil`, min 1 |
| `dailyIncome` | 1.15 | 1.0 | 0.95 | `Math.round`, min 0 |
| `repairCost` | 0.90 | 1.0 | 1.05 | `Math.ceil`, min 1 |
| `eventGoldCost` | 0.85 | 1.0 | 1.08 | `Math.ceil`, min 1; biaya 0 tetap 0 |

Magnitudo efek non-gold (mis. damage HP −18, defense +4) **tidak** di-scale difficulty pada implementasi saat ini.

## Urutan operasi (penting)

### Income harian (hari prep)

```text
base = dailyIncome + cityLevel × cityIncomeBonus + effects.prepIncomeBonus
effective = round(base × difficulty.dailyIncome)   // min 0
```

Diberikan tepat sekali saat memasuki hari prep (`enterCalendarDay` / state awal hari 1). Hari battle = 0.

### Biaya upgrade

```text
raw = 45 + level × 30
afterDifficulty = ceil(raw × difficulty.upgradeCost)   // min 1
if discountRate > 0:
  final = ceil(afterDifficulty × (1 − discountRate))   // min 1
else:
  final = afterDifficulty
```

Diskon **tidak** memakai `upgradeDiscountUntilWave` di rumus biaya; expiry dijalankan saat battle wave target selesai (`clearWaveDefense`). Repair **tidak** didiskon.

### Biaya event berbayar

```text
if baseGoldCost <= 0: 0
else: ceil(baseGoldCost × difficulty.eventGoldCost)   // min 1
```

Paket menyimpan **base**; `activeEvent.choices[].goldCost` sudah efektif setelah scaling.

### Stat monster

```text
hp = max(1, round(baseHp × monsterHp))
attack = max(1, round(baseAtk × monsterAttack))
```

## Contoh hitungan

| Skenario | Hitung | Hasil |
|---|---|---:|
| Gold awal normal | 100 + income hari 1 (28) | **128** |
| Income hari 1 easy | `round(28 × 1.15)` | **32** → gold awal **132** |
| Income hari 1 hard | `round(28 × 0.95)` | **27** → gold awal **127** |
| Upgrade L0 normal | 45 | **45** |
| Upgrade L0 easy | `ceil(45 × 0.85)` | **39** |
| Upgrade L0 hard | `ceil(45 × 1.08)` | **49** |
| Upgrade L0 normal + 25% diskon | `ceil(45 × 0.75)` | **34** |
| Repair easy | `ceil(25 × 0.9)` | **23** |
| Repair hard | `ceil(25 × 1.05)` | **27** |
| ATK `troopLevel` 3 | 10 + 3×5 | **25** |
| DEF `wallLevel` 4 tanpa bonus wave | 2 + 4×3 | **14** |
| Income `cityLevel` 2 + prepBonus 6 (normal) | 28 + 10 + 6 | **44** |

## Tabel wave lengkap (basis = normal)

| Wave | Hari | Nama | Role | HP | Attack |
|---:|---:|---|---|---:|---:|
| 1 | 10 | Goblin Horde | tutorial | 150 | 22 |
| 2 | 20 | Orc Host | check | 200 | 28 |
| 3 | 30 | Great Wolf | spike | 240 | 34 |
| 4 | 40 | Cyclops | tank | 290 | 36 |
| 5 | 50 | Wyvern | midboss | 340 | 40 |
| 6 | 60 | Lich | attrition | 390 | 44 |
| 7 | 70 | Lesser Demon | spike | 440 | 48 |
| 8 | 80 | Demon | tank | 490 | 54 |
| 9 | 90 | Dragon | spike | 540 | 58 |
| 10 | 100 | Demon King | finale | 600 | 64 |

### Stat efektif per difficulty (pasti, dari rumus di atas)

| Wave | Easy HP/ATK | Normal HP/ATK | Hard HP/ATK |
|---:|---|---|---|
| 1 | 113 / 18 | 150 / 22 | 162 / 23 |
| 2 | 150 / 22 | 200 / 28 | 216 / 30 |
| 3 | 180 / 27 | 240 / 34 | 259 / 36 |
| 4 | 218 / 29 | 290 / 36 | 313 / 38 |
| 5 | 255 / 32 | 340 / 40 | 367 / 42 |
| 6 | 293 / 35 | 390 / 44 | 421 / 47 |
| 7 | 330 / 38 | 440 / 48 | 475 / 51 |
| 8 | 368 / 43 | 490 / 54 | 529 / 57 |
| 9 | 405 / 46 | 540 / 58 | 583 / 61 |
| 10 | 450 / 51 | 600 / 64 | 648 / 68 |

## Reward (`gameConfig.waveRewards`)

Tepat 3 opsi setelah wave 1–9. Wave 10 tidak punya reward set.

| After wave | ID | Kind | Nilai utama |
|---:|---|---|---|
| 1 | `w1-income` | prepIncomeBonus | +6 sampai battle berikutnya |
| 1 | `w1-discount` | upgradeDiscount | 25% until wave 2 |
| 1 | `w1-gold` | grantGold | +35 |
| 2 | `w2-gold` | grantGold | +60 |
| 2 | `w2-heal` | healCity | +35 HP |
| 2 | `w2-def` | nextWaveDefense | +5 DEF wave 3 |
| 3 | `w3-income` | prepIncomeBonus | +8 |
| 3 | `w3-maxhp` | maxHpBonus | +20 MaxHP (+HP) |
| 3 | `w3-heal` | healCity | +45 |
| 4 | `w4-discount` | upgradeDiscount | 30% until wave 5 |
| 4 | `w4-gold` | grantGold | +80 |
| 4 | `w4-heal` | healCity | +40 |
| 5 | `w5-gold` | grantGold | +110 |
| 5 | `w5-def` | nextWaveDefense | +6 DEF wave 6 |
| 5 | `w5-income` | prepIncomeBonus | +10 |
| 6 | `w6-maxhp` | maxHpBonus | +25 |
| 6 | `w6-heal` | healCity | +55 |
| 6 | `w6-discount` | upgradeDiscount | 30% until wave 7 |
| 7 | `w7-gold` | grantGold | +130 |
| 7 | `w7-heal` | healCity | +50 |
| 7 | `w7-def` | nextWaveDefense | +8 DEF wave 8 |
| 8 | `w8-income` | prepIncomeBonus | +12 |
| 8 | `w8-maxhp` | maxHpBonus | +30 |
| 8 | `w8-gold` | grantGold | +150 |
| 9 | `w9-discount` | upgradeDiscount | 35% until wave 10 |
| 9 | `w9-combo` | combo | heal 40 + +6 DEF wave 10 |
| 9 | `w9-gold` | grantGold | +170 |

Expiry:

- `prepIncomeBonus` dibersihkan di `startBattle` (`clearPrepIncomeBonus`).
- `upgradeDiscount` dibersihkan saat battle wave `untilWave` selesai.
- `nextWaveDefense[wave]` dibersihkan saat battle wave itu selesai.
- Akhir campaign (`victory` / wave terakhir) memanggil `clearEndOfCampaignEffects`.

## Sumber event dan consequence

| Sumber | Lokasi | Catatan |
|---|---|---|
| Paket terjadwal | `SCHEDULED_EVENT_PACKAGES` di `eventPackages.ts` | Decade 1–2: 4 paket; decade 3–10: `d{N}-threat-a` + `d{N}-market-b` |
| Paket consequence | `CONSEQUENCE_PACKAGES` | `decade: 0`; diaktifkan lewat `pendingConsequences` |
| Rantai successor | `CONSEQUENCE_SUCCESSOR` | Jika jendela sebelum `targetWave` penuh |
| Target wave | `CONSEQUENCE_TARGET_WAVE` | Preferensi penjadwalan delay |
| Inventaris detail | [EVENTS_AND_REWARDS.md](./EVENTS_AND_REWARDS.md) | Pilihan, biaya base, efek |

## Ketergantungan antarparameter

- Menaikkan `maxTrackLevel` tanpa menaikkan kurva biaya / wave HP memperpanjang power creep.
- `cityMaxHpBonus` dan `repairHeal` berinteraksi: MaxHP tinggi + heal 60 mengubah nilai repair.
- `eventsPerDecade` × 10 decade = panjang `eventPlan` (default 20).
- Difficulty memengaruhi pace gold **dan** tekanan monster sekaligus; mengubah satu sisi saja mengubah win rate scripted.
- `chooseReward` saat ini membandingkan `wave >= 10` secara literal (bukan `lastWaveNumber()`); mengubah jumlah wave tanpa menyelaraskan fungsi itu berisiko (lihat keterbatasan).

## Ruleset id (produk / BE)

Engine hanya mengenal `version: 4` di state. Identifier balancing sisi app (contoh `campaign-v4-100-day-v3`) adalah metadata produk, bukan field engine. Dokumen kontrak lama yang masih menyebut `…-v2` perlu diselaraskan dengan id yang dipublikasikan app — lihat [DOCUMENTATION_SYNC.md](./DOCUMENTATION_SYNC.md).
