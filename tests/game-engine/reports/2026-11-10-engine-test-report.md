# Laporan pengujian game engine

10 November 2026, zona waktu WIB (UTC+7).

## Lingkungan

| Item | Nilai |
| --- | --- |
| Commit yang diuji | `645dcb9` (`docs(backend): record ruleset v3 verification`) |
| Node | v24.18.0 |
| TypeScript | 5.9.3 |
| Vitest | 3.2.7 |
| OS | Windows |

Working tree pada awal pekerjaan bersih di commit itu. Baseline sebelum file tes ditambah: `npm test` 3 file, 60 pass, durasi 1,67 detik, mulai 08:55:38. `npm run typecheck` lulus.

Saat laporan ini ditulis, tree belum di-commit. Yang berubah dari `645dcb9`: `package.json` (script `test:engine` dan `test:all-root`), `vitest.config.ts` (include folder ini), `tsconfig.json` (include folder ini), dan seluruh `tests/game-engine/`. `src/game`, frontend, dan backend tidak diubah.

## Ringkasan

Engine v4 lulus 49 tes baru dan 60 tes lama pada eksekusi yang sama. Aturan yang dikunci antara lain income hari pertama 128 gold pada normal, battle dengan damage bersamaan, diskon upgrade yang tidak dijumlahkan, dan campaign easy sampai `victory` di hari 100.

Dua dokumen masih tidak sepakat. `AGENTS.md` menulis prototipe 20 hari dan level maksimum 5. Kode serta `docs/DEV1_CONTRACT.md` memakai 100 hari, 10 wave, dan level maksimum 18. Tes mengikuti kode. Selisih itu perlu keputusan tim, bukan perubahan diam-diam pada engine.

Simulasi lima cara belanja, tanpa repair, menang pada easy dan kalah pada normal serta hard untuk tiga `runId` yang dicoba. Itu bukan bukti rumus rusak: jalur `knownWin` yang memperbaiki kota menang pada normal.

## Scope

Yang diuji: API publik `src/game` (state, kalender, ekonomi, battle, event, consequence, reward, transisi) dan simulasi strategi.

Yang tidak diuji: halaman permainan, server AI, adapter `app/server`, database, dan penolakan `STALE_REVISION`.

## Perintah

| Perintah | Mulai | Hasil | Durasi |
| --- | --- | --- | --- |
| `npm test` | 09:10:42 | 15 file, 109 pass, 0 fail, 0 skipped | 1,43 detik (waktu tes 361 ms) |
| `npm run test:engine` | 09:11:05 | 12 file, 49 pass, 0 fail, 0 skipped | 1,20 detik (waktu tes 318 ms) |
| `npm run typecheck` | setelah deklarasi Node lokal | lulus, tidak ada error | selesai bersama perintah typecheck |
| `npx vitest run tests/game-engine/unit/economy.test.ts -t ECO-07` | 09:10:15 | 1 pass, 6 skipped di file yang sama | 838 ms |

Tidak ada tes yang ditandai skipped pada `npm test` penuh. Enam skipped hanya muncul karena filter `-t ECO-07`.

## Hasil per area

Semua ID di `docs/TEST_MATRIX.md` berstatus pass pada `npm test` 09:10:42.

| Area | Tes | Hasil |
| --- | --- | --- |
| Kalender | CAL-01 sampai CAL-06 | pass |
| Ekonomi | ECO-01 sampai ECO-07 | pass |
| Battle | BAT-01 sampai BAT-07 | pass |
| Event dan narasi | EVT-01 sampai EVT-07 | pass |
| Consequence | CON-01 sampai CON-05 | pass |
| Reward | REW-01 sampai REW-05 | pass |
| Transisi dan state | STA-01 sampai STA-06 | pass |
| Campaign | INT-01 sampai INT-03 | pass |
| Kontrak regresi | REG-01 sampai REG-02 | pass |
| Simulasi | SIM-01 | pass |
| Test lama | `src/game/game.test.ts` (47), `balance.sim.test.ts` (4), `src/ui/autoRun.test.ts` (9) | pass |

## Temuan

Tidak ada bug engine yang membuat tes akhir gagal.

Saat menyusun `BAT-07`, assertion pertama mengharapkan `BATTLE_ALREADY_RESOLVED` setelah kota kalah. Engine mengembalikan `GAME_ENDED`. Di `startBattle`, pemeriksaan fase akhir terjadi sebelum pemeriksaan battle yang sudah dihitung. HP kota tetap 0 dan log tidak dihitung ulang. Tes akhir mengunci kedua situasi: laporan menang menolak dengan `BATTLE_ALREADY_RESOLVED`, laporan kalah menolak dengan `GAME_ENDED`. Engine tidak diubah.

`STA-06` menunjukkan dua pemanggilan `endPreparationDay` pada state hari 1 yang sama sama-sama berhasil. Itu konsekuensi fungsi murni. Pencegahan aksi usang ada di backend (`STALE_REVISION`), bukan di engine. Bukan bug engine menurut kontrak saat ini.

## Simulasi balancing

Aturan keputusan ada di `simulation/strategies.ts` dan `helpers/policies.ts`.

Kelima strategi memakai pilihan event yang sama (`scoredEventChoice`): utamakan pilihan yang tidak menghabiskan HP, lalu bonus defense, diskon, dan HP. Perbedaannya hanya belanja harian:

- attack: troops, lalu wall, lalu city
- defense: wall, lalu troops, lalu city
- economy: city, lalu troops, lalu wall
- balanced: jalur dengan level paling rendah
- skip: tidak belanja

Tidak ada repair pada kelima strategi itu. Sampel: `sim-qa-1`, `sim-qa-2`, `sim-qa-3`, difficulty easy, normal, dan hard. 3 × 5 × 3 = 45 permainan. Ulangan `sim-qa-1` / normal / attack menghasilkan JSON yang sama. Ini bukan win rate pemain.

Fakta dari `reports/simulation-2026-11-10.json`:

| Difficulty | Strategi | Menang | Kalah | Catatan kalah |
| --- | --- | --- | --- | --- |
| easy | attack, defense, economy, balanced | 3/3 | 0 | hari 100, wave 10 |
| easy | skip | 0 | 3 | `sim-qa-1` dan `sim-qa-2` hari 20 (`wavesCleared` 1). `sim-qa-3` hari 10 (`wavesCleared` 0) |
| normal | attack, defense, economy, balanced | 0 | 3 | hari 40 atau 50, `wavesCleared` 3 atau 4 |
| normal | skip | 0 | 3 | hari 10, `wavesCleared` 0 |
| hard | attack, defense, economy, balanced | 0 | 3 | hari 20 atau 30, `wavesCleared` 1 atau 2 |
| hard | skip | 0 | 3 | hari 10, `wavesCleared` 0 |

Contoh `sim-qa-1` normal, attack: kalah hari 50, `wavesCleared` 4, HP 0, gold 127, wall 5, troops 7, city 5. Defense pada run yang sama juga kalah hari 50, dengan wall 7 dan troops 5. Hari kalahnya sama, komposisi levelnya tidak.

`reports/difficulty-known-win-2026-11-10.json`, strategi yang memperbaiki kota, `runId` `easy-campaign`:

- normal: `victory`, hari 100, wave 10, HP 247, gold 209
- hard: `gameOver`, hari 90, `wavesCleared` 8, HP 0, gold 21

Interpretasi: kalahnya strategi tanpa repair pada normal lebih cocok dibaca sebagai strategi yang kurang efektif, karena jalur yang repair bisa menang pada seed lain. Kalahnya `knownWin` pada hard belum dipisahkan antara balancing dan batas strategi. Bukan kegagalan assertion aturan. Balancing tidak diubah.

## Tanggung jawab frontend dan backend

Frontend menampilkan `goldCost`, label, dan log battle. Frontend tidak menghitung ulang biaya atau damage.

Backend menyimpan state, menolak revision usang, dan hanya menerima paket consequence yang lolos `isTrustedConsequencePackage`. Narasi AI tidak boleh menjadi sumber efek.

`enterCalendarDay` tidak diekspor. Pemanggil memajukan hari lewat `endPreparationDay` atau `chooseReward`.

## Konflik spesifikasi dan kendala

Perlu keputusan: campaign 20 hari di `AGENTS.md` atau campaign 100 hari di kode dan kontrak v4. Angka ekonomi (income, biaya, level maksimum, repair) ikut selisih yang sama. Rinciannya ada di `docs/TEST_PLAN.md`.

Belum dilakukan: tes `app/`, lint, build, browser, dan server mock. Root tidak punya script lint atau build.

## Kesiapan

Untuk scope engine v4 yang tercantum di matrix, eksekusi ini tidak menemukan pelanggaran aturan. Siap dipakai sebagai pagar regresi untuk API publik saat ini.

Belum cukup untuk menyebut permainan siap produksi, bebas bug, atau seimbang pada normal dan hard. Dokumen prototipe 20 hari juga belum diselaraskan dengan kode.
