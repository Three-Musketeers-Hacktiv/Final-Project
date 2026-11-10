# Pengujian dan Keterbatasan

## Peta aturan → tes

### Suite terlacak di git (sumber utama saat inventarisasi)

| Area | File |
|---|---|
| Suite luas (calendar 100-hari, difficulty, ekonomi, battle, event, reward, consequence, API, integrasi campaign) | [`src/game/game.test.ts`](../../src/game/game.test.ts) |
| Simulasi balance seed / strategi | [`src/game/balance.sim.test.ts`](../../src/game/balance.sim.test.ts) |
| Helper sim | [`src/game/balanceSim.ts`](../../src/game/balanceSim.ts) |

### Folder `tests/game-engine`

Root `package.json` mendefinisikan `npm run test:engine` → `vitest run tests/game-engine`.  
Pada inventarisasi dokumentasi ini, isi terlacak di working tree terutama laporan di `tests/game-engine/reports/` (untracked) dan salinan dokumentasi/suite di [`.scratch/development-verification/tests/game-engine/`](../../.scratch/development-verification/tests/game-engine/).  
**Jangan mengklaim seluruh suite unit/integration di path itu sudah committed** tanpa memeriksa `git ls-files` lagi. Bila suite dipulihkan, petakan ulang ke dokumen ini.

Laporan historis yang terlihat: `tests/game-engine/reports/development-f106150/REPORT.md` dan salinan di `.scratch/.../reports/` (termasuk balance-visual).

## Perintah aktual (root `package.json`)

| Script | Perintah |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | `vitest run` |
| `npm run test:engine` | `vitest run tests/game-engine` |
| `npm run test:watch` | `vitest` |
| `npm run report:balance` | generator laporan visual |
| `npm run play` | Vite try UI |

Tidak ada script root `lint`, `mock-server`, atau `harness` terpisah. Lint ada di `app/` (`npm run lint` di folder app).

## Batas cakupan

- Engine tidak menyediakan migrasi save v3→v4.
- Tidak ada pengubahan config runtime.
- Win rate pemain manusia tidak diukur di suite; yang ada adalah strategi scripted + seed terbatas.
- Harness/mock HTTP: lihat [`../HARNESS.md`](../HARNESS.md) — dokumen harness masih mengandung contoh 20-hari yang perlu dibaca bersama kontrak 100-hari.
- `chooseReward` memakai batas literal `wave >= 10` (bukan `lastWaveNumber()`).

## Konflik implementasi vs dokumen lama

| Topik | Persyaratan tertulis (mis. AGENTS/PRD lama) | Perilaku implementasi saat ini |
|---|---|---|
| Panjang campaign | 20 hari; produksi nanti 50 | **100 hari** |
| Wave | 2 (hari 10 & 20) | **10** (hari 10…100) |
| Max upgrade | 5 | **18** |
| Income / biaya / repair | 15 atau 25; 50+20×L; repair 30/30 | **28**; **45+30×L**; **25/60** |
| Event | Hari tetap 3/7/13/17; 2 pilihan | `eventPlan` per run; **2–4** pilihan + consequence |
| Reward | Hanya setelah wave 1 | Setelah wave **1–9** |
| State version | 2 atau 3 | **4** |
| Difficulty | Tidak ada | `easy` / `normal` / `hard` |

Persyaratan tertulis tidak dibatalkan diam-diam oleh kode. Tim perlu memutuskan apakah AGENTS/PRD diganti formal atau tetap sebagai sejarah brief. Lihat [DOCUMENTATION_SYNC.md](./DOCUMENTATION_SYNC.md).

## Odd behaviors (bukti kode, bukan bugfix di tugas ini)

| Temuan | Dampak | Sumber |
|---|---|---|
| Diskon: `max(rate)` dan `max(untilWave)` terpisah | Diskon lemah bisa memperpanjang durasi diskon kuat | `effects.ts` `applyEffect` |
| `discountedUpgradeCost` tidak cek `untilWave` vs wave berjalan | Bergantung clear saat battle | `effects.ts` |
| `surrender` dari fase hidup mana pun | Bukan hanya battle | `transitions.ts` |
| `endPreparationDay` izinkan `phase === "event"` jika unresolved false | Jalur recovery | `transitions.ts` |
| Helper legacy selalu kosong | Adapter lama bisa salah jadwal | `config.ts` |
| Wave 2 Orc HP 200 (bukan 260 di AGENTS) | Balancing beda dari brief lama | `config.ts` |

## Klaim win rate

Laporan di `tests/game-engine/reports/` (mis. balance-visual 2026-11-10) mencantumkan fraksi kemenangan untuk **strategi scripted** dan **seed/runId terbatas**. Itu bukan win rate pemain nyata. Saat mengutip:

- sebutkan strategi,
- jumlah run / seed,
- difficulty,
- identitas commit/laporan bila ada,
- caveat “bukan playtest manusia”.

Tugas dokumentasi ini **tidak** menjalankan simulasi balancing baru.

## Fakta / dugaan / rekomendasi

| Jenis | Isi |
|---|---|
| Fakta terverifikasi dari kode | Campaign 100/10, cap 18, v4, difficulty, eventPlan, consequence |
| Dugaan / risiko | Adapter FE/BE mungkin masih punya sisa asumsi v3; verifikasi runtime diperlukan di luar tugas docs |
| Rekomendasi | Jadikan `docs/game-engine/` + `DEV1_CONTRACT` rujukan aktif; beri banner konflik di AGENTS/PRD/MVP; putuskan nasib persyaratan 20-hari secara eksplisit |
