# Matriks pengujian

Status di kolom terakhir berasal dari `npm test` pada 10 November 2026, 09:10 WIB. Semua baris di bawah lulus pada eksekusi itu. Arti status: belum dibuat, belum dijalankan, pass, fail, blocked.

| ID | Prioritas | Area | Aturan/sumber | Kondisi awal | Langkah/action | Expected result | File test | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAL-01 | P1 | Kalender | `createInitialState`, versi 4 | `runId` qa-calendar | Buat state | version 4, revision 0, hari 1, phase preparation, 20 entri eventPlan | unit/calendar.test.ts | pass |
| CAL-02 | P1 | Kalender | income hari pertama | normal | Buat state | gold 128, `incomeGrantedDays` hanya [1] | unit/calendar.test.ts | pass |
| CAL-03 | P1 | Kalender | modifier income | easy dan hard | Buat state | easy gold 132, hard gold 127 | unit/calendar.test.ts | pass |
| CAL-04 | P1 | Kalender | `gameConfig.battleDays` | hari 1 sampai 100 | Cek `isBattleDay` dan `incomeAmountForDay` | Battle pada 10, 20, ..., 100. Income hari itu 0. Hari lain 28 pada normal | unit/calendar.test.ts | pass |
| CAL-05 | P1 | Kalender | tidak ada belanja di hari battle | skip sampai battleReady | `upgradeWall` | Hari 10, income tercatat hari 1 sampai 9, kode `INVALID_PHASE` | unit/calendar.test.ts | pass |
| CAL-06 | P1 | Kalender | jatah aksi reset | hari 1 tanpa belanja | `endPreparationDay` | Hari 2, `actionUsedToday` false, gold bertambah 28 | unit/calendar.test.ts | pass |
| ECO-01 | P1 | Ekonomi | tiga jalur upgrade | hari 1, dan boundary HP 100 | upgrade wall, troops, city | DEF +3, ATK +5, MaxHP +35 dan HP +35 (jadi 135, bukan 185) | unit/economy.test.ts | pass |
| ECO-02 | P1 | Ekonomi | biaya bertingkat | hari 1 lalu hari prep berikutnya | `upgradeTroops` dua kali | Biaya 45, lalu 75, biaya berikut 105 | unit/economy.test.ts | pass |
| ECO-03 | P1 | Ekonomi | difficulty dan gold pas | easy, hard, gold 45 dan 44 | `getUpgradeCost`, `upgradeWall` | easy 39, hard 49. Gold 45 diterima. Gold 44 `INSUFFICIENT_GOLD` dan jatah tetap | unit/economy.test.ts | pass |
| ECO-04 | P1 | Ekonomi | `maxTrackLevel` 18 | boundary wall 17 dan 18 | `upgradeWall` | Level 17 biaya 555, naik ke 18. Level 18 `MAX_UPGRADE` | unit/economy.test.ts | pass |
| ECO-05 | P1 | Ekonomi | satu aksi per hari | hari 1 | upgrade, upgrade lagi, gold 10, skip | Kedua aksi `NO_ACTION_LEFT`. Gagal tidak memakai jatah. Skip sampai hari 2 | unit/economy.test.ts | pass |
| ECO-06 | P1 | Ekonomi | repair | HP 80, HP 140, HP penuh | `repairCity` | 140, lalu 150, lalu `HP_FULL` | unit/economy.test.ts | pass |
| ECO-07 | P1 | Ekonomi | diskon tidak untuk repair | rate 0,25 dan 0,30 | `getUpgradeCost`, `getRepairCost` | 45 menjadi 34 pada 25%, 32 pada 30%. Repair tetap 25. Hard + 25% = 37 | unit/economy.test.ts | pass |
| BAT-01 | P1 | Battle | damage bersamaan | snapshot wave 1 | `resolveBattle` | Ronde 1: kota 130, monster 140 | unit/battle.test.ts | pass |
| BAT-02 | P1 | Battle | damage minimum 1 | defense 100 | `resolveBattle` | Damage ke kota 1, `cityHpLost` 1 | unit/battle.test.ts | pass |
| BAT-03 | P1 | Battle | overkill | attack 100, monster HP 30 | `resolveBattle` | Log mencatat 100, `monsterHpLost` 30 | unit/battle.test.ts | pass |
| BAT-04 | P1 | Battle | kedua pihak nol | HP dan attack 10 lawan 10/20 | `resolveBattle` | `won` false, `cityHpLost` 10 | unit/battle.test.ts | pass |
| BAT-05 | P1 | Battle | deterministik | snapshot sama | `resolveBattle` dua kali | JSON hasil sama | unit/battle.test.ts | pass |
| BAT-06 | P1 | Battle | input invalid | NaN, Infinity, HP 0, hari salah | `resolveBattle` | `null` | unit/battle.test.ts | pass |
| BAT-07 | P1 | Battle | preview dan tidak dihitung ulang | menang easy, lalu kalah tanpa upgrade | `getWavePreview`, `startBattle`, round-trip | Preview sama dengan hasil. Menang: `BATTLE_ALREADY_RESOLVED`. Kalah: `GAME_ENDED`. HP tidak berubah | unit/battle.test.ts | pass |
| EVT-01 | P1 | Event | `pickEventPlan` | runId tetap | Panggil dua kali, baca paket | 20 entri stabil, 2 sampai 4 pilihan, minimal satu gratis | unit/events-narrative.test.ts | pass |
| EVT-02 | P1 | Event | pilihan harus dari event aktif | hari 1 dan event scouts | pilihan asing, `attachActiveEvent` palsu | `INVALID_PHASE` atau `INVALID_CHOICE`, state tidak berubah | unit/events-narrative.test.ts | pass |
| EVT-03 | P1 | Event | biaya tidak diskalakan dua kali | hard, paket biaya dasar 20 | baca `goldCost`, `decorateActiveEvent` | Biaya 22. Overlay tidak mengubah biaya atau efek | unit/events-narrative.test.ts | pass |
| EVT-04 | P1 | Event | efek atomik | paket supplies | pilih gold +12, pilih lagi | Gold naik 12 sekali. Panggilan kedua gagal | unit/events-narrative.test.ts | pass |
| EVT-05 | P1 | Event | HP fatal | boundary HP 10 | pilihan damage 10 | `gameOver`, HP 0, aksi berikut `GAME_ENDED` | unit/events-narrative.test.ts | pass |
| EVT-06 | P2 | Narasi | label AI | event aktif | overlay dengan dan tanpa kata gold | Label ber-gold ditolak. ID dan efek tetap | unit/events-narrative.test.ts | pass |
| EVT-07 | P1 | Event | identitas paket | event aktif, lalu identitas diganti | `attachActiveEvent`, `chooseEventOption` | Identitas sama tidak menaikkan revision. Identitas lain `INVALID_CHOICE` | unit/events-narrative.test.ts | pass |
| CON-01 | P1 | Consequence | jadwal deterministik | runId qa-consequence | pilih consequence dua kali dari state awal | `pendingConsequences` sama | unit/consequences.test.ts | pass |
| CON-02 | P1 | Consequence | trigger di hari prep | setelah CON-01 | mainkan sampai `triggerDay` | Phase `event`, `isConsequence` true, paket sesuai | unit/consequences.test.ts | pass |
| CON-03 | P2 | Consequence | shift tidak menghapus entri | plan qa-shift | `shiftPlanEntryDay` | Panjang plan tetap, hari pindah ke hari prep lain | unit/consequences.test.ts | pass |
| CON-04 | P2 | Consequence | dua consequence | dua pilihan ber-consequence | mainkan dan pilih keduanya | Dua id berbeda, keduanya hari prep | unit/consequences.test.ts | pass |
| CON-05 | P1 | Consequence | successor | peta `CONSEQUENCE_SUCCESSOR` | `isTrustedConsequencePackage` | Maju diterima. Mundur dan paket asing ditolak | unit/consequences.test.ts | pass |
| REW-01 | P1 | Reward | tiga pilihan per wave | easy sampai phase reward wave 1 | `rewardsForWave`, id wave 2 | Wave 1 sampai 9 punya 3 id unik. Wave 10 tidak ada. `w2-gold` `INVALID_CHOICE` | unit/rewards-expiry.test.ts | pass |
| REW-02 | P1 | Reward | `prepIncomeBonus` | normal, pilih `w1-income` | bandingkan income, lalu battle hari 20 | Selisih income 6. Setelah battle, bonus 0 | unit/rewards-expiry.test.ts | pass |
| REW-03 | P1 | Reward | defense wave target | easy, pilih `w2-def` | lihat defense, selesaikan hari 30 | Bonus wave 3 ada sebelum battle dan hilang di laporan | unit/rewards-expiry.test.ts | pass |
| REW-04 | P1 | Reward | diskon tidak dijumlahkan | normal, `w1-discount` dan caravan 25% | `getUpgradeCost` | Rate tetap 0,25. Biaya `ceil(raw ├ù 0,75)`, bukan `ceil(raw ├ù 0,5)` | unit/rewards-expiry.test.ts | pass |
| REW-05 | P1 | Reward | sekali per wave | round-trip di phase reward, normal | `chooseReward` `w1-gold` | Gold = gold awal + 35 + income hari 11. Pilihan kedua ditolak. Round-trip tidak menggandakan | unit/rewards-expiry.test.ts | pass |
| STA-01 | P1 | Transisi | fase salah tidak mengubah asal | hari 1 | battle, reward, lalu upgrade | Tiga aksi awal gagal. Upgrade menaikkan revision salinan, asal tetap | unit/transitions-state.test.ts | pass |
| STA-02 | P1 | Transisi | event dulu | phase event | upgrade, repair, lanjut hari | `EVENT_REQUIRED`, state asal utuh | unit/transitions-state.test.ts | pass |
| STA-03 | P1 | Transisi | laporan ke reward | easy, wave 1 menang | `continueFromReport`, round-trip, `w1-gold` | Phase reward, revision +1, pilihan tersimpan | unit/transitions-state.test.ts | pass |
| STA-04 | P1 | Transisi | HP 0 | tanpa upgrade sampai battle | `startBattle` | `gameOver`, HP 0, aksi berikut `GAME_ENDED` | unit/transitions-state.test.ts | pass |
| STA-05 | P1 | State | round-trip event | event aktif diserialisasi | pilihan salah lalu pilihan gratis | Gagal tidak menaikkan revision. Berhasil +1 | unit/transitions-state.test.ts | pass |
| STA-06 | P2 | State | snapshot lama | hari 1 yang sama dipanggil dua kali | `endPreparationDay` | Engine menerima keduanya. Penolakan revision lama bukan tugas engine | unit/transitions-state.test.ts | pass |
| INT-01 | P1 | Campaign | 100 hari lewat API | `easy-campaign`, easy, knownWin | `play` sampai akhir | `victory` hari 100, wave 10, reward hanya wave 1 sampai 9, 90 income prep | integration/campaign-victory.test.ts | pass |
| INT-02 | P1 | Campaign | normal dan hard berhenti | runId easy-campaign, knownWin | `play` sampai akhir | Keduanya berhenti di `victory` atau `gameOver`. Tidak menulis laporan historis | integration/campaign-difficulty.test.ts | pass |
| INT-04 | P1 | Campaign | regresi normal menang | easy-campaign, normal, knownWin | `play` lewat aksi publik | `victory`, hari `lastDay`, 10 wave, HP > 0, reward hanya wave 1 sampai 9, level Γëñ 18 | integration/campaign-normal-victory.test.ts | pass |
| INT-03 | P1 | Campaign | jalur kalah | normal, tidak upgrade | `play` | `gameOver` di hari battle, wave cleared 0, tidak ada reward | integration/campaign-defeat.test.ts | pass |
| REG-01 | P1 | Kontrak | API publik | modul engine | cek ekspor | versi 4, `enterCalendarDay` tidak diekspor, `scheduledEventDays()` kosong | regression/known-contracts.test.ts | pass |
| REG-02 | P1 | Kontrak | successor | id paket consequence | `isTrustedConsequencePackage` | Rantai maju diterima, rantai balik ditolak | regression/known-contracts.test.ts | pass |
| SIM-01 | P2 | Balancing | lima strategi tanpa repair | 3 runId ├ù 3 difficulty | `play` | Semua selesai. Artefak `simulation-baseline-latest.json`, bukan file bertanggal | simulation/runSimulation.test.ts | pass |
| SIM-02 | P2 | Balancing | repair berpasangan | 6 runId, normal dan hard | prioritas upgrade sama, repair off vs below80 | 108 permainan selesai. Pasangan seed sama. Artefak `paired-simulation-latest.json` | simulation/pairedRepair.test.ts | pass |
| SIM-03 | P2 | Balancing | evaluasi hard | 6 runId, 5 strategi, 3 kebijakan reward | `play` difficulty hard | Semua berhenti di fase akhir. Tidak mewajibkan menang. Artefak `hard-eval-latest.json` | simulation/hard-eval.test.ts | pass |
| DSC-01 | P1 | Diskon | tiga jalur, bukan repair | boundary rate 25% | `getUpgradeCost`, `getRepairCost` | Biaya 34 pada level 0. Repair tetap 25 | unit/discount-expiry.test.ts | pass |
| DSC-02 | P1 | Diskon | rate terbesar, dua urutan | reward wave 1 dan wave 4 | `chooseReward` | 30% lalu 25% tetap 30%. 25% lalu 30% menjadi 30% | unit/discount-expiry.test.ts | pass |
| DSC-03 | P1 | Diskon | expiry setelah wave target | normal, `w1-discount` | battle hari 20, lalu hari 21 | Rate 0 setelah battle. Biaya hari 21 kembali ke 45 + level ├ù 30 | unit/discount-expiry.test.ts | pass |
| DSC-04 | P1 | Diskon | diskon baru setelah expiry | normal sampai reward wave 4 | `w4-discount` | Rate 30% sampai wave 5, bukan sisa 25% yang sudah berakhir | unit/discount-expiry.test.ts | pass |
| RWD-01 | P1 | Reward | `healCity` | reward wave 2 | `w2-heal` | HP penuh tetap di MaxHP. HP kurang 10 menjadi penuh karena heal 35 | unit/reward-kinds.test.ts | pass |
| RWD-02 | P1 | Reward | `maxHpBonus` | HP 40 di reward wave 3 | `w3-maxhp` | MaxHP +20, HP menjadi 60, bukan full heal | unit/reward-kinds.test.ts | pass |
| RWD-03 | P1 | Reward | `prepIncomeBonus` | normal, `w1-income` | cek rumus lalu battle hari 20 | Bonus 6. Rumus 28 + level kota ├ù 5 + 6. Bonus 0 setelah battle | unit/reward-kinds.test.ts | pass |
| RWD-04 | P1 | Reward | `nextWaveDefense` | normal, `w2-def` | defense wave 3, battle hari 30 | Defense +5 untuk wave 3, hilang di laporan battle | unit/reward-kinds.test.ts | pass |
| RWD-05 | P1 | Reward | `combo` | easy, reward wave 9 | `w9-combo` setelah round-trip | Heal 40 di-clamp ke MaxHP, defense wave 10 +6 sekali. Pilihan ulang ditolak | unit/reward-kinds.test.ts | pass |