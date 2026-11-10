# Hasil yang seharusnya

Angka di sini dihitung dari tabel `gameConfig` dan urutan rumus di engine, sebelum melihat keluaran tes. ID mengarah ke [TEST_MATRIX.md](TEST_MATRIX.md).

Difficulty normal memakai pengali 1. Easy: monster HP 0,75, monster attack 0,8, biaya upgrade 0,85, income 1,15, repair 0,9, biaya event 0,85. Hard: 1,08, 1,06, 1,08, 0,95, 1,05, 1,08. Biaya dibulatkan ke atas. Income dan stat monster dibulatkan ke terdekat.

## State awal dan kalender

CAL-01, CAL-02. Hari 1 normal: gold awal 100 ditambah income 28, jadi 128. `incomeGrantedDays` berisi 1 saja. Revision 0. `eventPlan` panjang 20 karena 2 event per 10 decade, bukan karena campaign 20 hari.

CAL-03. Easy: `round(28 × 1,15) = round(32,2) = 32`, gold 132. Hard: `round(28 × 0,95) = round(26,6) = 27`, gold 127.

CAL-04, CAL-05. Hari battle tidak menerima income. Hari 10 menolak `upgradeWall` dengan `INVALID_PHASE`.

CAL-06. Melewati hari 1 menambah 28 gold dan mengosongkan jatah aksi.

## Ekonomi

ECO-01. Wall menaikkan defense 2 menjadi 5. Troops menaikkan attack 10 menjadi 15. Kota dari HP 100 / MaxHP 150 menjadi HP 135 / MaxHP 185. Itu bonus 35, bukan isi sampai MaxHP baru.

ECO-02. Biaya level 0 = 45. Level 1 = 45 + 30 = 75. Level 2 = 45 + 60 = 105.

ECO-03. Easy upgrade: `ceil(45 × 0,85) = ceil(38,25) = 39`. Hard: `ceil(45 × 1,08) = ceil(48,6) = 49`. Repair easy `ceil(22,5) = 23`. Repair hard `ceil(26,25) = 27`. Gold persis 45 diterima dan sisa 0. Gold 44 ditolak, `actionUsedToday` tetap false.

ECO-04. Level 17: 45 + 17 × 30 = 555. Setelah naik, defense = 2 + 18 × 3 = 56. Level 18 mengembalikan `MAX_UPGRADE`.

ECO-05, ECO-06. Repair dari 80 menambah 60, menjadi 140, biaya 25. Dari 140 menjadi 150, tidak melewati MaxHP. HP penuh mengembalikan `HP_FULL`.

ECO-07. Diskon 25% pada 45: `ceil(45 × 0,75) = ceil(33,75) = 34`. Diskon 30%: `ceil(45 × 0,70) = ceil(31,5) = 32`. Repair tetap 25. Hard lalu diskon 25%: biaya difficulty 49, `ceil(49 × 0,75) = ceil(36,75) = 37`.

## Battle

BAT-01. Kota attack 10, defense 2, HP 150. Monster attack 22, HP 150. Damage ke monster 10. Damage ke kota `max(1, 22 - 2) = 20`. Setelah ronde 1: kota 130, monster 140.

BAT-02. Defense 100 membuat `max(1, 22 - 100) = 1`. HP hilang di laporan juga 1.

BAT-03. Attack 100 pada monster 30 mengosongkan monster. `monsterHpLost` 30, walaupun log damage menulis 100. Damage ke kota 5, jadi `cityHpLost` 5.

BAT-04. Kota 10 dan monster 10 jatuh bersama. `won` false karena kota tidak bertahan di atas 0. `cityHpLost` 10, bukan 20.

BAT-06. `NaN`, `Infinity`, HP awal tidak positif, attack tidak positif, atau pasangan wave/hari yang tidak ada di tabel mengembalikan `null`.

BAT-07. `getWavePreview` dan `startBattle` memakai stat monster yang sama. Setelah menang, panggilan kedua `BATTLE_ALREADY_RESOLVED`. Setelah kalah, phase sudah `gameOver`, jadi panggilan kedua `GAME_ENDED`. Keduanya tidak mengubah HP.

## Event, consequence, reward

EVT-03. Biaya paket 20 pada hard: `ceil(20 × 1,08) = ceil(21,6) = 22`. Bukan 20 × 1,08 × 1,08. `decorateActiveEvent` tidak mengubah `goldCost` atau `effects`.

EVT-04. Pilihan gratis `grantGold` 12 menaikkan gold 12. Panggilan kedua tidak menambah 12 lagi.

EVT-05. HP 10 dan damage 10 menghasilkan HP 0 dan `gameOver` dalam aksi yang sama.

CON-05. `c-raid-wave1` boleh berlanjut ke `c-raid-wave2` dan seterusnya sampai `c-raid-finale`. `c-raid-wave2` tidak dipercaya sebagai penerus `c-raid-wave1` bila arahnya dibalik. `c-unrest-wave1` bukan penerus raid.

REW-02. Bonus +6 pada difficulty normal menambah income harian tepat 6, karena pengali income 1. Battle berikut mengosongkan `prepIncomeBonus`.

REW-04. Dua sumber 25% tetap rate 0,25. Jika dijumlahkan menjadi 50%, biaya level berapa pun adalah `ceil(raw × 0,5)`. Yang benar `ceil(raw × 0,75)`, dengan `raw = 45 + level × 30`. Pada level 0 itu 34, bukan 23.

REW-05. `w1-gold` menambah 35, lalu hari berikutnya masih menambah income. Gold akhir sekurang-kurangnya gold sebelumnya ditambah 35.

INT-01. Menang di hari 100, `wavesCleared` 10, reward tercatat untuk wave 1 sampai 9. Hari prep ada 90, dan tidak satu pun hari battle ada di `incomeGrantedDays`.

INT-03. Tanpa upgrade, wave 1 normal (monster HP 150, attack 22, kota attack 10, defense 2) menghabiskan kota sebelum monster. Phase `gameOver`, tidak ada reward.
