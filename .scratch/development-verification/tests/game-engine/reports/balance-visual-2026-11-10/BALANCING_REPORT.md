# Laporan grafik balancing

10 November 2026. Angka dihitung ulang oleh generator dari JSON simulasi, bukan dari jumlah tes yang lulus.

## Sumber

- `tests/game-engine/reports/paired-simulation-latest.json`: 108 permainan selesai. Empat strategi upgrade ditambah skip. Difficulty normal dan hard. Repair `off` dan `below80` pada seed yang sama (`sim-pair-1` sampai `sim-pair-6`). Event `scoredEventChoice`. Reward `standard`.
- `tests/game-engine/reports/hard-eval-latest.json`: 90 permainan selesai, hanya hard. Lima strategi dan tiga kebijakan reward. Seed yang sama.

Dua dataset tidak digabung menjadi satu persentase.

Repair `below80`: jika HP kota di bawah 80% HP maksimum dan gold cukup, hari itu dipakai untuk repair. Upgrade hari itu tidak terjadi. Repair menghabiskan gold dan jatah aksi.

`knownWin` hanya ada di evaluasi hard. Strategi itu juga memperbaiki kota di bawah 80% HP, tetapi urutan upgrade dan ambang belanjanya berbeda. Jangan membaca selisihnya sebagai efek reward semata.

Tidak ada permainan yang gagal atau tidak selesai. Kekalahan berarti fase `gameOver`. Wave tempat kalah = jumlah wave yang sudah dilewati + 1. Contoh: `wavesCleared` 7 berarti kalah melawan wave 8.

Tim belum menetapkan target persentase kemenangan. Laporan ini tidak menilai apakah suatu angka ΓÇ£cukupΓÇ¥ terhadap target.

## Fakta

Pada dataset pasangan dengan repair di bawah 80% HP, keempat strategi di normal menang 6/6. Tanpa repair, keempat strategi di normal menang 0/6. Skip, yang tidak belanja, juga 0/6 dan kalah di wave 1.

Di hard, repair menaikkan persentase menang pada keempat strategi. Balanced dengan repair menang 4/6 (66,7%). Tanpa repair, balanced menang 0/6. Selisihnya 66,7 poin persentase. Pada 48 pasangan strategi upgrade, repair tidak pernah memperpendek wave yang dicapai.

Evaluasi hard menemukan 24 kemenangan dari 90 permainan. Kemenangan itu ada pada economy dan balanced. Attack, defense, dan knownWin tidak menang pada 6 seed untuk ketiga kebijakan reward.

Wave kalah yang paling sering pada evaluasi hard tercantum di `data-summary.json` bagian `hardLossLeaders`.

## Interpretasi

Repair adalah syarat yang membedakan hasil pada sampel ini, terutama di normal. Menang 6/6 dengan repair tidak cukup untuk menyebut difficulty normal terlalu mudah. Strategi yang sama tanpa repair kalah semuanya. Yang terukur adalah efek aturan otomatis ini, bukan pemain manusia.

Di hard, kemenangan tidak tersebar rata. Economy dan balanced menemukan jalur menang. Attack dan defense, pada aturan repair dan reward yang diuji, sering berhenti pada wave 7 sampai 10. Itu bisa berarti tekanan stat monster pada wave tersebut, atau berarti dua strategi upgrade itu kurang cocok dengan aturan repair 80%. Keduanya mungkin benar sekaligus. Data ini tidak memisahkan keduanya sampai ada playtest atau simulasi yang mengubah satu faktor saja.

Pilihan reward di hard mengubah hasil di dalam economy dan balanced. Fortify dan treasury menang lebih sering daripada survival pada sampel 6 seed. Attack dan defense tetap kalah pada ketiga kebijakan, jadi reward saja tidak membuka kemenangan untuk kedua strategi itu.

## Keterbatasan

Enam `runId` bukan sampel pemain. Strategi tidak membaca event yang belum muncul, tetapi juga tidak bermain seperti orang. Hasil bukan win rate pemain nyata.

Pengaruh reward hanya diukur di hard. Normal memakai satu kebijakan reward, `standard`.

`knownWin` tidak setara dengan flag repair strategi lain.

## Rekomendasi

Playtest manusia pada normal dan hard, dengan catatan apakah pemain memperbaiki kota sebelum upgrade. Jika tim ingin melihat reward di normal, jalankan 6 seed yang sama, repair di bawah 80%, empat strategi, dan tiga kebijakan reward (72 permainan) sebagai file baru. Jangan mengubah aturan setelah melihat hasil tanpa memberi versi baru.

Penilaian terhadap target kemenangan menunggu angka yang disepakati tim.

## Tabel dataset pasangan

Reward pada tabel ini adalah `standard`.

| Difficulty | Strategi | Repair | Kebijakan reward | Sampel | Menang | Kalah | Win % | Loss % | Median wave tempat kalah |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| normal | attack | tanpa repair | standard | 6 | 0 | 6 | 0% | 100% | 4 |
| normal | attack | di bawah 80% HP | standard | 6 | 6 | 0 | 100% | 0% | ΓÇö |
| normal | defense | tanpa repair | standard | 6 | 0 | 6 | 0% | 100% | 4 |
| normal | defense | di bawah 80% HP | standard | 6 | 6 | 0 | 100% | 0% | ΓÇö |
| normal | economy | tanpa repair | standard | 6 | 0 | 6 | 0% | 100% | 4 |
| normal | economy | di bawah 80% HP | standard | 6 | 6 | 0 | 100% | 0% | ΓÇö |
| normal | balanced | tanpa repair | standard | 6 | 0 | 6 | 0% | 100% | 4 |
| normal | balanced | di bawah 80% HP | standard | 6 | 6 | 0 | 100% | 0% | ΓÇö |
| normal | skip | tanpa repair | standard | 6 | 0 | 6 | 0% | 100% | 1 |
| hard | attack | tanpa repair | standard | 6 | 0 | 6 | 0% | 100% | 2 |
| hard | attack | di bawah 80% HP | standard | 6 | 1 | 5 | 16,7% | 83,3% | 9 |
| hard | defense | tanpa repair | standard | 6 | 0 | 6 | 0% | 100% | 3 |
| hard | defense | di bawah 80% HP | standard | 6 | 1 | 5 | 16,7% | 83,3% | 7 |
| hard | economy | tanpa repair | standard | 6 | 0 | 6 | 0% | 100% | 3 |
| hard | economy | di bawah 80% HP | standard | 6 | 1 | 5 | 16,7% | 83,3% | 10 |
| hard | balanced | tanpa repair | standard | 6 | 0 | 6 | 0% | 100% | 2,5 |
| hard | balanced | di bawah 80% HP | standard | 6 | 4 | 2 | 66,7% | 33,3% | 9 |
| hard | skip | tanpa repair | standard | 6 | 0 | 6 | 0% | 100% | 1 |

## Tabel evaluasi hard

Repair pada attack, defense, economy, dan balanced adalah di bawah 80% HP. knownWin memakai aturan internalnya sendiri.

| Difficulty | Strategi | Repair | Kebijakan reward | Sampel | Menang | Kalah | Win % | Loss % | Median wave tempat kalah |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| hard | attack | di bawah 80% HP | survival | 6 | 0 | 6 | 0% | 100% | 7,5 |
| hard | attack | di bawah 80% HP | fortify | 6 | 0 | 6 | 0% | 100% | 10 |
| hard | attack | di bawah 80% HP | treasury | 6 | 0 | 6 | 0% | 100% | 9,5 |
| hard | defense | di bawah 80% HP | survival | 6 | 0 | 6 | 0% | 100% | 7,5 |
| hard | defense | di bawah 80% HP | fortify | 6 | 0 | 6 | 0% | 100% | 9,5 |
| hard | defense | di bawah 80% HP | treasury | 6 | 0 | 6 | 0% | 100% | 8 |
| hard | economy | di bawah 80% HP | survival | 6 | 1 | 5 | 16,7% | 83,3% | 8 |
| hard | economy | di bawah 80% HP | fortify | 6 | 5 | 1 | 83,3% | 16,7% | 10 |
| hard | economy | di bawah 80% HP | treasury | 6 | 5 | 1 | 83,3% | 16,7% | 10 |
| hard | balanced | di bawah 80% HP | survival | 6 | 1 | 5 | 16,7% | 83,3% | 8 |
| hard | balanced | di bawah 80% HP | fortify | 6 | 6 | 0 | 100% | 0% | ΓÇö |
| hard | balanced | di bawah 80% HP | treasury | 6 | 6 | 0 | 100% | 0% | ΓÇö |
| hard | knownWin | aturan knownWin | survival | 6 | 0 | 6 | 0% | 100% | 7,5 |
| hard | knownWin | aturan knownWin | fortify | 6 | 0 | 6 | 0% | 100% | 10 |
| hard | knownWin | aturan knownWin | treasury | 6 | 0 | 6 | 0% | 100% | 9,5 |