# 01: Fondasi state dan state awal

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Run baru dapat dibuat dengan `GameState` versi 2 yang JSON-serializable, income hari 1 diterapkan tepat sekali, dan selector menampilkan attack/defense efektif dari base + level upgrade (tanpa menyimpan total turunan di state).

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Tipe state, fase, efek, error, dan config terpusat mengikuti kontrak yang disepakati (tanpa rekrutmen).
- [x] `createInitialState` menghasilkan hari 1, fase sah, `revision` awal, dan income hari 1 sekali di `incomeGrantedDays`.
- [x] `getEffectiveStats` (atau setara) menurunkan ATK/DEF dari config + `upgradeLevel` + efek kosong awal.
- [x] State hasil dapat di-serialize/parse JSON tanpa kehilangan field wajib.
- [x] Tes perilaku hanya melalui API publik untuk state awal, income hari 1, dan selector.
- [x] Typecheck/test runner yang tersedia dijalankan; hasil aktual dilaporkan.

## Comments

- 2026-11-06: `createInitialState` + `getEffectiveStats`. Income playtest `dailyIncome = 25`. `npm test` 10 passed; `npm run typecheck` bersih. Lint script belum ada di repo.
