# Pengujian game engine

Folder ini berisi pengujian untuk engine murni di `src/game`. Engine itu menghitung state permainan: hari, gold, HP, battle, event, dan reward. Komponen React, server HTTP, dan database tidak diuji di sini.

## Peta dokumen

| Dokumen | Isi |
| --- | --- |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | Tujuan, sumber aturan, strategi, dan batas pengujian |
| [docs/TEST_MATRIX.md](docs/TEST_MATRIX.md) | Daftar skenario, expected result singkat, dan status |
| [docs/TEST_FLOW.md](docs/TEST_FLOW.md) | Urutan menjalankan pemeriksaan dan alur campaign |
| [docs/EXPECTED_RESULTS.md](docs/EXPECTED_RESULTS.md) | Hasil yang seharusnya, termasuk hitungan manual |
| [docs/HOW_TO_RUN.md](docs/HOW_TO_RUN.md) | Perintah yang sudah dicek di mesin ini |
| [docs/PRESENTATION_GUIDE.md](docs/PRESENTATION_GUIDE.md) | Alur bicara sekitar 5 sampai 7 menit |
| [reports/](reports/) | Laporan bertanggal dan keluaran simulasi |

## Cara cepat

Dari root repository:

```bash
npm run test:engine
```

Perintah itu menjalankan Vitest hanya untuk folder ini. `npm test` menjalankan folder ini bersama test lama di `src/`.

## Batas tanggung jawab

Pengujian di folder ini memeriksa aturan yang sudah ada di kode dan di kontrak v4 (`docs/DEV1_CONTRACT.md`, `docs/CAMPAIGN_100_DAY_CONTRACT.md`). Helper hanya menyiapkan state dan memanggil API publik. Tidak ada rumus battle atau ekonomi kedua.

`AGENTS.md` masih menulis prototipe 20 hari. Kode yang diuji adalah campaign 100 hari. Perbedaan itu dicatat sebagai perlu keputusan spesifikasi, bukan diselesaikan dengan mengubah engine.

Laporan hasil ada di [reports/2026-11-10-engine-test-report.md](reports/2026-11-10-engine-test-report.md).
