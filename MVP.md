# MVP — Fantasy City Defense

Versi 2.1 · Deadline 13 November 2026 · Tim: Engine · Backend · Frontend

> **Status sinkronisasi**  
> Lingkup tertulis MVP di bawah masih **20 hari / 2 wave / `version: 3`**, dan menunda kampanye 100 hari.  
> **Engine di repo sudah mengimplementasikan 100 hari / 10 wave / `version: 4`.**  
> Pertahankan kebutuhan MVP sebagai target produk yang perlu keputusan tim (apakah MVP diganti ke 100 hari, atau 20 hari tetap sebagai cakupan demo).  
> Referensi engine aktif: [`docs/game-engine/README.md`](./docs/game-engine/README.md).

Dokumen ini menggantikan lingkup MVP yang masih menyebut rekrutmen unit atau upgrade tunggal ATK+DEF. Acuan aturan mesin historis: [AGENTS.md](./AGENTS.md); kontrak hidup: [docs/DEV1_CONTRACT.md](./docs/DEV1_CONTRACT.md). Acuan state & DB: [docs/database/Database_proposal.md](./docs/database/Database_proposal.md). Modul engine: [plans/game-engine-modules.md](./plans/game-engine-modules.md). Prioritas minggu ini: [plans/feature-freeze-playtest.md](./plans/feature-freeze-playtest.md).

## Tujuan

Prototipe web single-player: lord mempertahankan kota fantasy selama **20 hari** dan **2 wave** (target tertulis MVP). Bisa dimainkan end-to-end, state konsisten, aturan TypeScript terpisah dari UI dan penyimpanan.

Inspirasi alur event: pilihan terjadwal yang mengubah trajectory kota (mirip jeda pilihan di [1in8b](https://1in8b.life/en/)), bukan micro-management unit.

## Status role (November 2026)

| Role | Status prototipe |
|---|---|
| **Engine** | Siap integrasi: `src/game` murni, state `version: 4`, campaign 100 hari / 10 wave, tiga jalur upgrade, difficulty, tes di `tests/game-engine` (melampaui lingkup tertulis 20 hari di tabel bawah) |
| **Backend** | **Lanjutkan** auth, Mongo, API aksi → panggil engine → commit |
| **Frontend** | **Lanjutkan** UI produk + wire API; Auto lanjut hari (timer UI) |

## Lingkup wajib produk

| Bagian | Prototipe |
|---|---|
| Platform | Browser, single-player, Next.js, desktop prioritas |
| Kalender | Persiapan 1–9 & 11–19; battle hari 10 & 20 |
| Ekonomi | Gold; income harian (playtest **25** + bonus kota); max 1 aksi ekonomi sukses/hari |
| Kota | HP/MaxHP; `wallLevel` / `troopLevel` / `cityLevel`; ATK/DEF/income turunan; perbaikan HP |
| Upgrade | Tembok (DEF), pasukan (ATK kota), kota (MaxHP + income) — satu slot bersama repair |
| Pertempuran | 1 HP bar kota vs 1 HP bar monster; damage simultan |
| Event | Hari 3, 7, 13, 17; dua pilihan; efek dari paket terpercaya |
| Reward | Satu dari tiga setelah wave 1 |
| Persistensi | MongoDB (`game_runs` + related); login username/password |
| Akhir | Game over jika HP kota 0; menang setelah wave 2 |

**Tidak masuk MVP:** mana, sihir, formasi, HP pasukan individual, rekrut unit, build-time, item, difficulty, achievement, leaderboard, day-picker, kampanye 50/100 hari sebelum playtest 20 lulus.

## Keputusan penyederhanaan (wajib diikuti semua role)

- Tiga jalur upgrade terpisah; **bukan** satu `upgradeLevel` yang naik ATK+DEF sekaligus.
- `troopLevel` = track attack kota saja; **bukan** rekrutmen unit.
- Diskon event/reward = **diskon biaya ketiga jalur upgrade**, bukan diskon rekrut.
- Upgrade kota menaikkan MaxHP dan current HP sebesar bonus (bukan heal penuh); repair tetap terpisah dan tidak kena diskon.
- ATK/DEF/income efektif dihitung engine; jangan disimpan sebagai total tetap di state (kecuali snapshot di laporan battle / `game_properties`).
- Hasil battle dihitung sekali; refresh tidak menghitung ulang damage.
- AI hanya menulis narasi/label; angka efek dari paket engine/config.

## Pembagian kerja

| Role | Wajib MVP | Jangan |
|---|---|---|
| **Engine** | Aturan murni di `src/game`, tipe `GameState` v3, unit + integration test 20 hari, kontrak untuk BE/FE; bugfix saja sampai playtest | Mongo, auth, halaman produk, API AI, timer/auto di engine |
| **Backend** | Auth user, API Mulai/Lanjut/Aksi, commit Mongo sesuai schema, katalog/fallback event, panggil engine lalu persist | Menghitung biaya/damage sendiri; mengubah rumus di luar engine |
| **Frontend** | Login/register UI, dashboard tiga jalur, panel aksi, event, battle playback, reward, layar akhir; kirim aksi ke API; Auto lanjut hari (opsional tapi disarankan) | Menghitung gold cost / damage / transisi fase di komponen |

Detail tugas & todos: [README.md](./README.md). Kontrak engine: [docs/DEV1_CONTRACT.md](./docs/DEV1_CONTRACT.md).

## Kriteria selesai

- Alur hari 1–20 bisa dimainkan lewat UI produk (atau harness/try UI + backend nyata) tanpa intervensi developer.
- Setiap aksi, income, event, reward, damage hanya diterapkan sekali; klik ganda / refresh aman.
- Gold tidak negatif; HP selalu 0…max.
- Battle simultan dan kasus keduanya tumbang sesuai PRD.
- Empat event punya narasi (AI/mock/fallback) dengan efek paket yang sama.
- Typecheck, lint, test engine, dan build Next.js lulus.
- Demo URL / README aktual / catatan kontribusi tersedia.
- Minimal satu playtest eksternal sampai menang atau kalah, dengan catatan keluhan (lihat feature freeze).

## Di luar MVP (setelah prototipe oke)

Setelah kriteria selesai & playtest 20 hari lulus, produksi memakai kampanye **50 hari / 5 wave** (ruleset terpisah). Rincian: [PRD.md](./PRD.md) §12.

Belum masuk fase itu: day-picker bebas, 100 hari default, animasi berat, balancing final tanpa config, fitur spekulatif di luar keluhan playtest.
