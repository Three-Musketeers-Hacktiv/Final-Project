# 06: Reward wave 1 ke hari 11

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Setelah laporan wave 1 menang, pemain wajib memilih tepat satu dari tiga reward; pilihan diterapkan sekali bersama masuk hari 11 sehingga bonus berlaku sebelum income hari 11.

**Blocked by:** 05 Battle deterministik dan laporan

**Status:** done

- [x] `continueFromReport` setelah wave 1 sukses menuju fase `reward` (bukan victory).
- [x] Tiga pilihan reward di config: gold langsung, bonus income hari 11–19, diskon upgrade hari 11–19.
- [x] `chooseReward` atomik: terapkan efek, set `rewardChosenId`, masuk hari 11, grant income hari 11 dengan bonus bila dipilih, reset jatah aksi.
- [x] Double claim ditolak; reward tidak tersedia setelah wave 2.
- [x] Bonus defense wave 1 dibersihkan sesuai aturan setelah resolusi wave.
- [x] Tes publik: ketiga jalur reward, expiry/batas hari, revision sekali per sukses, tidak ada lompat state.

## Comments

- 2026-11-06: `chooseReward("reward-income")` menambah +6 sebelum income hari 11. Klaim kedua → `REWARD_ALREADY_CHOSEN`. Integrasi memakai `reward-gold`.
