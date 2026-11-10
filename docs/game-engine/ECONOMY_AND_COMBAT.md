# Ekonomi dan Combat

## Income

Diberikan hanya pada hari persiapan, tepat sekali per hari (termasuk hari 1).

```text
base = dailyIncome(28) + cityLevel × 5 + effects.prepIncomeBonus
gold += round(base × difficulty.dailyIncome)
```

- Penanda: `incomeGrantedDays`.
- Hari battle: 0.
- `prepIncomeBonus` dari reward; dibersihkan saat `startBattle` wave berikutnya.

## Tiga jalur upgrade

| Jalur | API | Field level | Bonus per level |
|---|---|---|---|
| Tembok | `upgradeWall` | `wallLevel` | Defense +3 |
| Pasukan | `upgradeTroops` | `troopLevel` | Attack +5 |
| Kota | `upgradeCity` | `cityLevel` | MaxHP +35 (dan `cityHp` +35, clamp ke max); income +5 |

- Level mulai 0, maksimal **18** per jalur.
- Biaya mentah: `45 + level × 30`, lalu difficulty, lalu diskon (jika ada).
- Ketiga jalur + repair berbagi **satu** slot `actionUsedToday`.

### City upgrade versus repair

| | Upgrade kota | Repair |
|---|---|---|
| Biaya | Kurva upgrade (± diskon) | `repairCost` × difficulty (**tanpa** diskon) |
| Efek | Naikkan MaxHP + isi HP sebesar bonus | Heal hingga **60** HP, tidak naik MaxHP |
| Saat HP penuh | Boleh (tetap naik MaxHP) | Ditolak `HP_FULL` |

## Satu aksi ekonomi per hari

- Sukses → `actionUsedToday = true`.
- Gagal (gold, max level, HP penuh, fase/event) → jatah tetap.
- Skip hari tanpa aksi diperbolehkan.

## Diskon upgrade

- Sumber: efek event (`upgradeDiscount`) atau reward.
- Rate aktif = `max` dari rate yang diterapkan; `untilWave` = `max` dari target wave.
- Berlaku ke biaya wall/troops/city.
- Tidak berlaku ke repair atau biaya event.
- Pembulatan: `ceil` setelah `(1 − rate)`.
- Dihapus ketika battle untuk `untilWave` selesai.

Catatan implementasi: `discountedUpgradeCost` tidak membandingkan wave berjalan dengan `upgradeDiscountUntilWave`; pembersihan mengandalkan resolusi battle. Jika battle dilewati secara tidak sah, diskon bisa bertahan (jalur normal FE/BE tidak boleh melewati `startBattle`).

## Attack dan defense efektif

```text
attack  = 10 + troopLevel × 5
defense = 2 + wallLevel × 3 + (defenseByWave[wave] ?? 0)
```

Tidak ada randomness, critical, mana, atau skill.

## Battle deterministik

`resolveBattle(snapshot)` — fungsi murni.

Per ronde:

1. `damageToMonster = cityAttack`
2. `damageToCity = max(1, monsterAttack − cityDefense)`
3. Terapkan keduanya dari HP awal ronde (bersamaan)
4. Clamp HP ≥ 0; catat log
5. Ulangi sampai salah satu HP = 0

Hasil:

- Monster 0 dan kota > 0 → menang
- Kota 0 (termasuk mutual kill) → kalah
- `cityHpLost` / `monsterHpLost` = selisih HP aktual, bukan jumlah damage overkill

Validasi snapshot: wave/hari cocok config; HP & attack kedua pihak > 0; defense ≥ 0; angka finite.

`startBattle` menolak jika sudah ada hasil untuk hari itu (`BATTLE_ALREADY_RESOLVED`). UI boleh memutar log tanpa memanggil engine lagi.

### Contoh singkat (normal, Goblin)

Asumsi kota: HP 150, ATK 25 (`troopLevel` 3), DEF 14 (`wallLevel` 4). Monster: 150/22.

| Ronde | Dmg monster | Dmg kota | HP kota | HP monster |
|---:|---:|---:|---:|---:|
| 1 | 25 | 8 | 142 | 125 |
| 2 | 25 | 8 | 134 | 100 |
| 3 | 25 | 8 | 126 | 75 |
| 4 | 25 | 8 | 118 | 50 |
| 5 | 25 | 8 | 110 | 25 |
| 6 | 25 | 8 | 102 | 0 |

Menang. `cityHpLost = 48`, `monsterHpLost = 150`. HP 102 dibawa ke hari 11.

### Kasus khusus

| Kasus | Perilaku |
|---|---|
| Defense ≥ monster attack | Damage ke kota tetap **1** (minimum) |
| Overkill | Log mencatat damage penuh; HP after = 0; `*HpLost` = HP sebelum |
| Kedua pihak 0 di ronde sama | Kalah (`won = false`) |
| HP carry-over | `cityHp` setelah battle dipakai di state |
| Damage nominal vs aktual | Jumlah `damageTo*` bisa > HP yang hilang karena overkill |

Dokumen ini tidak menyimpulkan strategi optimal atau win rate pemain. Untuk hasil simulasi historis, lihat laporan di `tests/game-engine/reports/` beserta caveat strateginya.
