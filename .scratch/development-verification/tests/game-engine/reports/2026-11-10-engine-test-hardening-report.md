# Laporan penguatan pengujian game engine

10 November 2026, zona waktu WIB (UTC+7). Laporan ini tidak mengganti `2026-11-10-engine-test-report.md`.

## Lingkungan

| Item | Nilai |
| --- | --- |
| Commit dasar | `645dcb9` |
| Node | v24.18.0 |
| TypeScript | 5.9.3 |
| Vitest | 3.2.7 |
| Baseline sebelum penguatan | `npm test` 09:42:16, 15 file, 109 pass, durasi 1,66 detik. Typecheck lulus |

Engine, frontend, backend, database, dan balancing tidak diubah. Level maksimum tetap 18.

## A. Kebenaran aturan engine

`npm test` mulai 09:48:08: 20 file, 121 pass, 0 fail, 0 skipped, durasi 2,16 detik (waktu tes 756 ms). `npm run typecheck` lulus setelah itu.

Tes aturan yang diperketat atau ditambah semuanya lulus:

| ID | Expected | Actual |
| --- | --- | --- |
| REW-05 | gold akhir = gold sebelum + 35 + (28 + level kota ├ù 5 + bonus income), hari 11 sekali | pass |
| DSC-01 | diskon 25% membuat biaya level 0 menjadi 34 pada wall, troops, dan city. Repair tetap 25 | pass |
| DSC-02 | rate 30% lalu 25% tetap 30%. Rate 25% lalu 30% menjadi 30% | pass |
| DSC-03 | setelah battle hari 20, rate diskon wave 1 menjadi 0. Hari 21 biaya kembali ke 45 + level ├ù 30 | pass |
| DSC-04 | diskon 30% setelah expiry bukan penjumlahan dengan 25% yang sudah berakhir | pass |
| RWD-01 | heal 35 di-clamp ke MaxHP | pass |
| RWD-02 | MaxHP +20 dan HP 40 menjadi 60 | pass |
| RWD-03 | bonus income 6 mengikuti rumus 28 + level kota ├ù 5 + 6, lalu hilang setelah battle hari 20 | pass |
| RWD-04 | defense wave 3 +5, hilang setelah battle hari 30 | pass |
| RWD-05 | combo heal 40 (clamp) dan defense wave 10 +6, sekali | pass |

Tidak ada assertion aturan yang gagal. Tidak ada bug engine baru pada eksekusi ini.

Klasifikasi: tidak ada temuan bug engine.

## B. Regression campaign

`INT-02` tetap menerima `victory` atau `gameOver` untuk normal dan hard. Tes itu tidak lagi menulis `difficulty-known-win-2026-11-10.json`.

`INT-04` mengunci jalur yang laporan pagi catat sebagai menang:

- Kondisi: `runId` `easy-campaign`, difficulty normal, strategi `knownWin`, hanya aksi publik
- Expected: `victory`, hari 100, 10 wave, HP positif, reward hanya wave 1 sampai 9, level tiap jalur paling tinggi 18
- Actual: pass

Klasifikasi: regresi campaign, bukan temuan bug.

## C. Temuan simulasi balancing

Aturan repair `below80`: pada hari persiapan, jika HP di bawah 80% MaxHP dan gold cukup, `repairCity` dipakai dan upgrade hari itu tidak terjadi. Event dan reward sama pada kedua varian. Sampel 6 `runId` (`sim-pair-1` sampai `sim-pair-6`), normal dan hard. 4 strategi ├ù 2 varian repair, plus skip tanpa repair: 108 permainan. Ini bukan win rate pemain.

Fakta dari `reports/paired-simulation-latest.json`:

| Difficulty | Strategi | Tanpa repair | Dengan repair di bawah 80% |
| --- | --- | --- | --- |
| normal | attack, defense, economy, balanced | 0 menang dari 6 | 6 menang dari 6, hari 100 |
| normal | skip | 0 dari 6, kalah hari 10 | tidak ada varian repair |
| hard | attack | 0 dari 6, kalah hari 20 atau 30 | 1 menang dari 6. Lima kalah hari 90, `wavesCleared` 8 |
| hard | defense | 0 dari 6 | 1 menang dari 6. Kalah hari 70 atau 90 |
| hard | economy | 0 dari 6, kalah hari 30 | 1 menang dari 6. Lima kalah hari 100, `wavesCleared` 9 |
| hard | balanced | 0 dari 6 | 4 menang dari 6. Dua kalah hari 90, `wavesCleared` 8 |
| hard | skip | 0 dari 6, kalah hari 10 | tidak ada varian repair |

Pada 48 pasangan strategi (bukan skip), varian repair mencapai wave yang lebih jauh. Tidak ada pasangan yang repair memperpendek campaign.

Contoh yang sama harinya, `sim-pair-1`, normal, attack, battle hari 40 (monster HP 290, attack 36):

| Varian | HP kota | MaxHP | Attack | Defense | Level wall/troops/city | Hasil kampanye |
| --- | --- | --- | --- | --- | --- | --- |
| tanpa repair | 165 | 393 | 35 | 17 | 5/5/5 | kalah di battle ini |
| repair | 342 | 358 | 35 | 17 | 5/5/4 | lanjut dan menang hari 100 |

Attack dan defense sama. Varian repair punya satu level kota lebih rendah karena jatah hari terpakai untuk repair, tetapi HP-nya jauh lebih tinggi. Gold repair pada kemenangan normal attack berkisar 525 sampai 600.

Evaluasi hard terpisah, `reports/hard-eval-latest.json`: 90 permainan (6 seed ├ù 5 strategi ├ù 3 kebijakan reward: survival, fortify, treasury). Semua berhenti di `victory` atau `gameOver`. Ditemukan 24 kemenangan, semuanya economy atau balanced. Attack, defense, dan `knownWin` tidak menang pada 6 seed ├ù 3 kebijakan ini.

Titik kalah yang paling sering pada 66 kekalahan evaluasi hard:

- wave 8 hari 80: 23
- wave 10 hari 100: 20
- wave 9 hari 90: 12
- wave 7 hari 70: 9

Klasifikasi:

- Kalah tanpa repair di normal: keterbatasan strategi. Strategi yang sama dengan repair menang pada 6 seed.
- Kalah hard pada attack, defense, dan `knownWin`: keterbatasan strategi pada sampel ini, karena economy dan balanced menemukan kemenangan.
- Wave 8 sampai 10 sebagai titik kalah yang berulang: dugaan tekanan balancing, bukan pelanggaran aturan. Balancing tidak diubah.
- Bukan kalimat "hard mustahil". Pada sampel ini ada jalur menang.

## D. Keterbatasan dan yang belum dilakukan

- Enam `runId` tidak mewakili seluruh pemain atau seluruh seed.
- Kebijakan reward hard tidak mencari jalur menang secara exhaustif dan tidak membaca event yang belum muncul.
- Konflik `AGENTS.md` 20 hari versus kode 100 hari tetap terbuka.
- Tes `app/`, lint, build, browser, dan server mock tidak dijalankan.
- Coverage tidak diukur.