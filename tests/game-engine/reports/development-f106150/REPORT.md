# Verifikasi engine development

Tanggal: 10 November 2026 (WIB). Branch: development. Commit: f106150.

## Metode

Source src/game tidak memiliki perbedaan terhadap branch development-game-engine-testing. Folder test tambahan belum tersedia di development. Helper simulasi diambil dari branch testing dan dijalankan terhadap salinan source development di direktori sementara, tanpa mengubah source engine.

Simulasi dijalankan melalui Node.js v24.18.0, setelah transpile TypeScript dengan TypeScript transpileModule dan penyesuaian ekstensi import pada salinan sementara. Ini adalah eksekusi simulasi langsung, bukan eksekusi assertion suite Vitest.

## Status pemeriksaan

- Typecheck: lulus.
- npm test: terhalang startup esbuild, spawn EPERM. Tidak ada hasil pass/fail assertion.
- Percobaan konfigurasi Vitest sementara tanpa esbuild juga terhalang spawn EPERM pada resolusi path Windows oleh Vite. Tidak ada test terkumpul/dijalankan.
- Simulasi berpasangan: 108 campaign selesai.
- Evaluasi hard tambahan: 90 campaign selesai.
- Seluruh objek hasil kedua dataset identik dengan dataset sebelumnya pada branch testing (perbandingan JSON rows).
- Batas upgrade tetap 18; campaign 100 hari, 10 wave.

## Hasil dengan repair di bawah 80% HP, reward standard

| Strategi | Normal menang | Hard menang |
| --- | --- | --- |
| attack | 6/6 (100%) | 1/6 (16,7%) |
| defense | 6/6 (100%) | 1/6 (16,7%) |
| economy | 6/6 (100%) | 1/6 (16,7%) |
| balanced | 6/6 (100%) | 4/6 (66,7%) |

Total empat strategi dengan repair: normal 24/24 menang dan 0/24 kalah; hard 7/24 menang (29,2%) dan 17/24 kalah (70,8%).

Tanpa repair, empat strategi upgrade masing-masing menang 0/6 pada normal dan hard. Skip tanpa belanja menang 0/6 pada masing-masing difficulty.

Evaluasi hard tambahan (5 strategi x 3 kebijakan reward x 6 runId): 24/90 menang (26,7%), 66/90 kalah (73,3%). Dataset ini terpisah dari simulasi berpasangan dan tidak digabung menjadi satu persentase.

## Kesimpulan dan keterbatasan

Tidak ditemukan perubahan hasil balancing dibanding laporan terdahulu. Tidak ada dasar baru dari simulasi ini untuk mengubah angka balancing. Hasil strategi otomatis pada enam runId tidak mewakili win rate pemain manusia.

Seluruh suite unit/integration/regression belum dapat diverifikasi ulang melalui Vitest di lingkungan ini. Jangan mengutip 121 test sebelumnya sebagai test yang lulus pada eksekusi ini. Frontend, backend, database, browser, dan server mock tidak diuji.

Source engine dan konfigurasi proyek tidak diubah. Data lengkap ada pada paired-simulation.json dan hard-eval.json di folder yang sama.
