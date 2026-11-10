# Rencana pengujian

## Tujuan

Memeriksa apakah engine di `src/game` mengikuti aturan yang benar-benar diimplementasikan: state awal, kalender, ekonomi, battle, event, consequence, reward, dan transisi fase. Campaign lengkap dijalankan lewat fungsi publik, misalnya `createInitialState`, `upgradeTroops`, `chooseEventOption`, `startBattle`, dan `chooseReward`.

## Ruang lingkup

Yang diuji:

- API publik di `src/game/index.ts`
- `ActionResult`: `{ ok: true, state }` atau `{ ok: false, error }` dengan `GameErrorCode`
- `GameState.version` 4
- Tiga difficulty: `easy`, `normal`, `hard`
- Simulasi strategi sebagai pengamatan balancing, terpisah dari tes aturan

Yang di luar lingkup:

- Perbaikan bug engine
- UI produk, mock harness, dan server AI
- Adapter backend di `app/server`, MongoDB, JWT, dan `STALE_REVISION`
- Mengubah angka balancing di `gameConfig`

## Sumber aturan

Sumber yang dipakai untuk expected result:

1. Kode di `src/game`, terutama `config.ts`
2. `docs/DEV1_CONTRACT.md`
3. `docs/CAMPAIGN_100_DAY_CONTRACT.md`

`AGENTS.md`, `PRD.md`, `MVP.md`, dan sebagian dokumen database masih menyebut prototipe 20 hari, versi state 3, dan level maksimum 5. Dokumen itu tidak dipakai sebagai expected result suite ini.

## Konflik yang perlu keputusan spesifikasi

| Topik | Prototipe di AGENTS.md | Yang diimplementasikan |
| --- | --- | --- |
| Durasi | 20 hari, battle hari 10 dan 20 | 100 hari, battle hari 10, 20, ..., 100 |
| Event | Hari tetap 3, 7, 13, 17, dua pilihan | `pickEventPlan(runId)`, 20 entri, 2 sampai 4 pilihan, ada consequence |
| Level maksimum | 5 | 18 |
| Ekonomi | income 15, upgrade 50 + 20 × level, repair 30/30 | income 28, upgrade 45 + 30 × level, repair 25 gold / 60 HP |
| Reward | Setelah wave 1 saja | Setelah wave 1 sampai 9. Wave 10 langsung `victory` |
| Save | versi 3 | versi 4 |

Suite ini mengunci perilaku kode v4. Jika tim kembali ke prototipe 20 hari, expected result di folder ini harus ditulis ulang.

## Strategi

Unit test memeriksa satu aturan dengan angka yang dihitung manual. Contoh: biaya upgrade level 0 adalah 45, diskon 25% menjadi 34.

Integration test memainkan hari lewat `play()` di `helpers/campaignPlayer.ts`. Fungsi itu hanya memanggil aksi publik. Tidak ada penulisan langsung ke `day` atau `phase` untuk membuktikan jalur menang atau kalah.

Regression: test lama di `src/game/game.test.ts`, `src/game/balance.sim.test.ts`, dan `src/ui/autoRun.test.ts` tetap di tempatnya dan dijalankan dengan `npm test`. `regression/known-contracts.test.ts` hanya mengunci kontrak yang pendek, misalnya versi 4 dan arah rantai consequence.

Simulation: lima cara belanja di `simulation/strategies.ts`, tiga `runId` tetap, tiga difficulty. Hasilnya bukan win rate pemain.

Fixture `asBoundary` dipakai hanya untuk syarat yang mahal dicapai, misalnya wall level 17 atau HP 10. Pemanggilan wajib menulis alasan. Jalur campaign tidak memakai fixture itu.

## Prioritas

Risiko tertinggi: gold salah, damage battle salah, reward atau event diterapkan dua kali, dan campaign 100 hari tidak bisa diselesaikan lewat API publik. Itu prioritas P1.

Narasi, pergeseran hari event, dan simulasi balancing adalah P2. Kesalahan di sana mengganggu integrasi atau playtest, tetapi tidak mengubah rumus damage.

## Mulai dan selesai

Pengujian dimulai dari commit yang typecheck-nya lulus dan test lamanya lulus. Selesai bila:

- suite di folder ini dan test lama sudah dijalankan
- typecheck lulus
- matrix dan laporan memakai status dari keluaran itu
- engine, frontend produk, dan backend tidak diubah

Kegagalan karena aturan engine salah harus tetap gagal. Angka expected tidak dilonggarkan supaya laporan hijau.

## Keterbatasan

- Tidak ada coverage tool. Jumlah test yang lulus tidak membuktikan semua cabang kode teruji.
- `revision` lama tidak ditolak engine. Penolakan `STALE_REVISION` ada di backend.
- Strategi simulasi tidak memperbaiki kota (`repairCity`), kecuali jalur `knownWin` yang terpisah.
- Tiga `runId` simulasi terlalu sedikit untuk disebut pola pemain.
- Hari consequence yang melewati banyak wave sudah punya tes lama di `src/game/game.test.ts`. Suite ini menguji penjadwalan, antrian dua consequence, dan fungsi `isTrustedConsequencePackage`.
