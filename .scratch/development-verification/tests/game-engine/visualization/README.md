# Visualisasi balancing

Generator ini membaca JSON simulasi yang sudah ada dan menulis HTML, SVG, serta ringkasan Markdown. Tidak ada simulasi baru dan tidak ada dependency baru.

## Menjalankan

Dari root repositori:

```bash
npm run report:balance
```

Perintah yang sama:

```bash
node tests/game-engine/visualization/generate-balance-report.mjs
```

Keluaran ada di `tests/game-engine/reports/balance-visual-2026-11-10/`. Buka `index.html` langsung dari file. SVG juga bisa dibuka satu per satu di folder `charts/`.

## Sumber

- `tests/game-engine/reports/paired-simulation-latest.json`
- `tests/game-engine/reports/hard-eval-latest.json`

Generator hanya membaca kedua file itu. Laporan historis tidak ditimpa.

Angka pada grafik adalah hasil strategi otomatis, bukan win rate pemain.