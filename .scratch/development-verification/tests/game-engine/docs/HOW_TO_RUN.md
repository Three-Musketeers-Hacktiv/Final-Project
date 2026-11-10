# Cara menjalankan

Dicek pada 10 November 2026 di Windows, Node v24.18.0, TypeScript 5.9.3, Vitest 3.2.7. Package manager-nya npm. Lockfile root: `package-lock.json`.

## Prasyarat

Folder `node_modules` di root sudah ada. Jangan menjalankan `npm install` jika perintah di bawah masih jalan. Tidak ada paket baru untuk suite ini.

Root tidak memiliki script `lint` atau `build`. ESLint ada di `app/`, untuk backend, dan tidak dijalankan sebagai bagian pengujian engine.

## Perintah

Dari root repository:

| Maksud | Perintah | Hasil pada eksekusi ini |
| --- | --- | --- |
| Suite engine saja | `npm run test:engine` | Seluruh `tests/game-engine` |
| Regresi normal | `npx vitest run tests/game-engine/integration/campaign-normal-victory.test.ts` | `INT-04` |
| Reward dan diskon | `npx vitest run tests/game-engine/unit/rewards-expiry.test.ts tests/game-engine/unit/discount-expiry.test.ts tests/game-engine/unit/reward-kinds.test.ts` | REW, DSC, RWD |
| Simulasi | `npx vitest run tests/game-engine/simulation` | baseline, pasangan repair, evaluasi hard |
| Test lama dan suite baru | `npm test` | 20 file, 121 pass, 0 fail, durasi 2,16 detik, mulai 09:48 |
| Typecheck | `npm run typecheck` | `tsc --noEmit` selesai tanpa error |
| Satu file dan satu nama | `npx vitest run tests/game-engine/unit/economy.test.ts -t ECO-07` | 1 pass, 6 skipped di file yang sama |
| Seluruh test root, nama lain | `npm run test:all-root` | Sama dengan `npm test` |

Watch mode: `npm run test:watch`. Perintah itu membuka Vitest dan menunggu perubahan file. Tidak dibiarkan berjalan saat laporan ini ditulis.

Satu skenario juga bisa dipanggil dengan nama `it`, misalnya `-t CAL-02` atau `-t INT-01`.

## Membaca kegagalan

Vitest mencetak nama file, nama `it`, dan `AssertionError` dengan expected serta received. Nama tes diawali ID matrix (`ECO-04`, `BAT-03`, dan seterusnya). Cari ID itu di [TEST_MATRIX.md](TEST_MATRIX.md).

`skipped` pada perintah `-t` berarti tes di file yang sama tidak ikut filter. Itu bukan tes yang diblokir.

Simulasi menulis file stabil, bukan laporan bertanggal:

- `reports/simulation-baseline-latest.json`
- `reports/paired-simulation-latest.json`
- `reports/hard-eval-latest.json`

File `reports/2026-11-10-engine-test-report.md` dan `simulation-2026-11-10.json` adalah arsip. Tes rutin tidak menimpa arsip itu.

## Otomatis dan manual

Otomatis dan sudah dijalankan: `npm test`, `npm run test:engine`, `npm run typecheck`, filter `ECO-07`, dan penulisan JSON simulasi.

Belum dijalankan, dan tidak termasuk perintah engine:

- `npm run test:watch` sampai selesai (mode itu tidak selesai sendiri)
- `npm test` di dalam folder `app/`
- lint dan build, karena script-nya tidak ada di root
- halaman permainan atau server HTTP

## Catatan typecheck

Root tidak memasang `@types/node`. Tes simulasi menulis JSON lewat modul Node. File `tests/game-engine/node-modules.d.ts` hanya memperkenalkan `mkdirSync`, `writeFileSync`, `dirname`, `join`, dan `fileURLToPath` ke TypeScript. Bukan dependency baru.