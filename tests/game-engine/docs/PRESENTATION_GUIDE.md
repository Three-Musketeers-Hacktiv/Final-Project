# Panduan presentasi

Perkiraan 5 sampai 7 menit. Angka di bagian hasil diambil dari eksekusi 10 November 2026, commit `645dcb9`, sebelum perubahan suite ini di-commit.

## Masalah yang ingin dicegah

Kesalahan yang mahal kalau baru ketahuan saat playtest: gold berkurang dua kali, battle menghitung damage lagi setelah refresh, pilihan event menerapkan efek dari teks AI, atau reward wave 1 masih aktif di wave berikutnya. Tes di `tests/game-engine` memanggil fungsi engine yang sama dengan yang akan dipakai frontend dan backend.

## Empat jenis tes, dalam satu kalimat masing-masing

Unit tes memeriksa satu rumus. Contoh: 45 gold dengan diskon 25% menjadi 34, karena 45 × 0,75 = 33,75 dan engine membulatkan ke atas.

Integration tes memainkan banyak hari. `play()` hanya memanggil upgrade, pilihan event, battle, dan reward. Tidak ada yang menulis `day: 100` langsung ke state.

Regression tes adalah file lama di `src/game` dan `src/ui`. File itu tidak dipindah. `npm test` menjalankannya bersama suite baru: 60 tes lama dan 49 tes baru, semuanya lulus.

Simulation membandingkan lima cara belanja pada 3 `runId` dan 3 difficulty, total 45 permainan. Angka menang di situ bukan win rate pemain.

## Tiga contoh yang mudah ditunjukkan

Ekonomi, `ECO-07`. Upgrade pertama normal berharga 45. Diskon 25% membuat `ceil(33,75) = 34`. Repair tetap 25. Perintah: `npx vitest run tests/game-engine/unit/economy.test.ts -t ECO-07`. Pada eksekusi ini: 1 pass, 6 tes lain di file yang sama skipped karena filter nama.

Battle, `BAT-04`. Kota dan monster sama-sama jatuh ke 0 pada ronde yang sama. Hasilnya kalah. HP kota yang hilang di laporan adalah 10, bukan damage 20 yang melewati nol.

Campaign, `INT-01`. `runId` `easy-campaign`, difficulty easy, strategi `knownWin` (repair di bawah 80% HP, lalu troops, wall, dan city). Hasilnya `victory` pada hari 100, wave 10, reward hanya untuk wave 1 sampai 9, dan 90 kali income hari persiapan. Hari battle tidak ada di daftar income.

## Hasil aktual

`npm test` mulai 09:10:42, durasi 1,43 detik: 15 file, 109 pass, 0 fail, 0 skipped.

`npm run test:engine` mulai 09:11:05, durasi 1,20 detik: 12 file, 49 pass, 0 fail.

`npm run typecheck` lulus.

Simulasi 45 permainan: pada easy, empat strategi yang belanja menang di hari 100. Strategi skip kalah di hari 10 atau 20. Pada normal dan hard, kelima strategi itu kalah. Mereka tidak memanggil repair. Strategi terpisah `knownWin`, yang memperbaiki kota, menang normal pada `easy-campaign` (hari 100, HP 247, gold 209) dan kalah hard pada hari 90 dengan `wavesCleared` 8.

Tidak ada tes yang gagal karena bug engine pada eksekusi akhir. Satu assertion awal mengira battle yang kalah mengembalikan `BATTLE_ALREADY_RESOLVED`. Kode mengembalikan `GAME_ENDED` karena phase sudah `gameOver`. Tes diperbaiki agar mengunci kode itu dan memastikan HP tetap 0. Itu penyesuaian tes, bukan perubahan engine.

## Penguatan yang sama harinya

`INT-02` tetap hanya memastikan campaign berhenti. `INT-04` mengunci jalur yang laporannya sudah menang: `easy-campaign`, normal, `knownWin`, `victory` di hari 100, 10 wave, HP positif, reward hanya wave 1 sampai 9.

`REW-05` sekarang menuntut gold = gold sebelumnya + 35 + income hari 11, bukan "sekurang-kurangnya tambah 35".

Simulasi repair memakai 6 `runId` yang sama untuk varian tanpa repair dan dengan repair di bawah 80% HP. Pada sampel itu, repair memperpanjang setiap pasangan (48 dari 48). Di normal, keempat strategi dengan repair menang 6/6. Tanpa repair, semuanya kalah. Di hard, repair juga memperpanjang campaign. Balanced dengan repair menang 4 dari 6 seed. Attack menang 1 dari 6.

Evaluasi hard terpisah (90 permainan: 6 seed, 5 strategi, 3 kebijakan reward) menemukan 24 kemenangan, semuanya pada strategi economy atau balanced. Attack, defense, dan `knownWin` kalah di keenam seed untuk ketiga kebijakan reward. Gelombang yang paling sering menjadi titik kalah adalah wave 8 (hari 80), wave 10 (hari 100), dan wave 9 (hari 90). Itu keterbatasan strategi dan tekanan balancing, bukan pelanggaran aturan yang tertangkap tes.

Angka lengkap ada di laporan penguatan dan di `paired-simulation-latest.json` serta `hard-eval-latest.json`.

## Batas kesimpulan

Lulusnya suite tidak berarti permainan bebas bug atau siap produksi. Coverage tidak diukur. UI, server, dan database tidak dijalankan. Enam `runId` simulasi berpasangan bukan win rate pemain. `AGENTS.md` masih menulis 20 hari, sementara kode yang diuji 100 hari.

## Demo yang bisa diulang

1. `npm run test:engine`
2. `npx vitest run tests/game-engine/unit/battle.test.ts -t BAT-01`
3. Buka `reports/paired-simulation-latest.json`. Bandingkan `sim-pair-1`, normal, attack, `repair` `off` dan `below80` pada battle hari 40.

## Pertanyaan penguji

Apakah campaign-nya 20 hari? Kode dan kontrak v4 memakai 100 hari dan 10 wave. `AGENTS.md` masih 20 hari. Tes mengikuti kode. Keputusan dokumen masih terbuka.

Mengapa normal kalah di simulasi lama, tetapi ada tes yang menang? Simulasi tanpa repair kalah di normal pada sampel ini. Strategi yang sama dengan repair di bawah 80% HP menang 6 dari 6 seed. `INT-04` mengunci `knownWin` pada `easy-campaign` normal sampai `victory`. Kalah tanpa repair adalah strategi yang kurang efektif, bukan rumus yang salah.

Apakah AI bisa mengubah damage event? `decorateActiveEvent` hanya mengganti judul, deskripsi, dan label. Label yang menyebut gold dibuang. `goldCost` dan `effects` tetap dari paket. Tes `EVT-03` dan `EVT-06` mengunci itu.

Apa yang terjadi jika pemain menekan tombol dua kali dari state lama? Engine murni akan menerapkan aksi itu lagi, karena tidak menyimpan id aksi. `STA-06` menunjukkan dua `endPreparationDay` pada objek yang sama sama-sama berhasil. Backend yang harus menolak revision lama.
