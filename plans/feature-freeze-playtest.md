# Feature freeze sampai playtest pertama

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../PRD.md).

## Keputusan terkunci (grill)

- Alasan ingin fitur baru: **belum playtest** (bukan pain point terukur, bukan rubrik).
- **Freeze fitur baru** sampai FE/BE tersambung dan minimal **satu orang luar** main sampai menang atau kalah.
- Setelah playtest: baru boleh usul **satu** fitur yang menjawab keluhan nyata.
- Ekonomi terkunci: **tiga jalur upgrade** + repair (bukan upgrade tunggal ATK+DEF, bukan rekrut unit). Lihat [split-three-upgrades.md](split-three-upgrades.md), [DEV1_CONTRACT](../docs/DEV1_CONTRACT.md).

## Yang diizinkan sekarang (bukan scope creep)

| Role | Kerjakan |
|---|---|
| Engine | Jaga kontrak `src/game` v3; bugfix saja; jangan sistem baru |
| Backend | Auth, save Mongo, API aksi → panggil engine → commit |
| Frontend | UI produk: dashboard 3 jalur, event, battle, reward; **Auto** lanjut hari (timer UI saja) |
| Bersama | Alur 1–20 end-to-end; `npm test` engine hijau |

## Yang di-freeze

Build time, rekrutmen unit, item, difficulty, achievement, leaderboard, day-picker, auto-beli, mekanik di luar PRD/MVP v2.1.

Kampanye 50 hari = **fase setelah** prototipe 20 + playtest (PRD §12), bukan pekerjaan minggu ini kecuali config-driven disiapkan tanpa mengubah demo 20.

## Definisi “boleh buka freeze”

1. Run lengkap lewat UI produk (atau UI uji + backend nyata).
2. Satu playtester eksternal selesai menang atau kalah tanpa bantuan developer.
3. Catatan 3–5 keluhan teratas tertulis.
4. Tim pilih **satu** perbaikan/fitur dari catatan itu.

## Acuan

- Produk: [PRD.md](../PRD.md), [MVP.md](../MVP.md), [README.md](../README.md)
- Engine: [DEV1_CONTRACT.md](../docs/DEV1_CONTRACT.md), [../.scratch/game-engine-prototype/](../.scratch/game-engine-prototype/)
- Auto FE: [auto-run-20-dan-50.md](auto-run-20-dan-50.md), [../.scratch/kalender-manual-auto/spec.md](../.scratch/kalender-manual-auto/spec.md)
- Roadmap: [roadmap-diskusi-tim.md](roadmap-diskusi-tim.md)

## Todos

### Bersama

- [ ] Sambungkan BE/FE ke engine 20 hari (happy path sampai victory atau game over)
- [ ] Playtest eksternal 1 orang + catat 3–5 keluhan
- [ ] Baru setelah playtest: pilih max 1 fitur dari keluhan nyata

### Backend (lanjutkan)

- [ ] Auth register/login (username + passwordHash) + sesi
- [ ] Mulai game: `createInitialState` → commit `game_runs` + properties revisi 0 + empat `runs_event`
- [ ] Katalog `event_data`: pilih paket hari 3/7/13/17; AI/mock narasi + fallback; jangan percaya angka efek dari AI
- [ ] Lanjutkan save: baca state + properties; tolak `version` ≠ 3 dengan pesan jelas
- [ ] `POST` aksi: `runId`, `actionId`, `expectedRevision`, `type`, `payload` → engine → transaksi Mongo
- [ ] Types: `upgradeWall` | `upgradeTroops` | `upgradeCity` | `repairCity` | `endPreparationDay`
- [ ] Types: `chooseEventOption` | `startBattle` | `continueFromReport` | `chooseReward` | `attachActiveEvent`
- [ ] Tulis `game_actions` + `game_properties` (termasuk wall/troop/city level + ATK/DEF selector)
- [ ] Simpan `game_report` sekali per wave; refresh tidak re-resolve
- [ ] Tolak aksi duplikat / revisi stale; jangan hitung rumus di luar engine

### Frontend (lanjutkan)

- [ ] Halaman login/register + new game / continue
- [ ] Dashboard: hari, fase, gold, HP/MaxHP, wall/troop/city level, ATK/DEF/income, aksi tersisa, ancaman, efek
- [ ] Tombol: upgrade tembok / pasukan / kota, repair, lanjut hari — biaya dari API/selector
- [ ] UI event (2 pilihan), battle playback dari log, laporan, 3 reward, victory/game over
- [ ] Tampilkan error code server; cegah double-submit (`actionId` unik)
- [ ] Desain/implement Auto UI (Manual default, countdown 5s, jeda event/battle/reward; **tanpa** ubah engine)
- [ ] Smoke test manual alur 1–20 bersama BE

### Engine (hanya jika perlu)

- [ ] Bugfix kontrak / regresi test — bukan fitur baru
