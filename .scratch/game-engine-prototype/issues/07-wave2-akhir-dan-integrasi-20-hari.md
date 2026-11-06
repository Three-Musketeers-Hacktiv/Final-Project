# 07: Wave 2, akhir permainan, dan integrasi 20 hari

**What to build:** Kampanye prototipe dapat diselesaikan end-to-end: wave 2 menang → victory tanpa reward ekstra; kekalahan → gameOver menolak aksi lanjut; satu tes integrasi 20 hari memakai hanya aksi API publik yang berhasil di-assert.

**Blocked by:** 02 Ekonomi upgrade dan repair; 04 Event terjadwal dan efek; 05 Battle deterministik dan laporan; 06 Reward wave 1 ke hari 11

**Status:** done

- [x] Alur hari 11–20 mendukung event 13/17, ekonomi, battle hari 20, laporan → victory.
- [x] Fase `gameOver` dan `victory` menolak aksi gameplay; run baru hanya lewat `createInitialState` / pemanggil.
- [x] Efek fase/diskon berakhir sesuai aturan setelah wave 2.
- [x] Satu integration test menjalankan hari 1–20 melalui aksi nyata (upgrade/repair/event/battle/reward); kegagalan aksi yang direncanakan gagal tes, tidak di-skip diam-diam.
- [x] Dokumentasi kontrak singkat untuk FE/BE tetap selaras (fase, error codes, shape state) tanpa mengerjakan Mongo/UI.
- [x] Test, typecheck, dan lint yang tersedia dijalankan; hasil aktual dilaporkan.

## Comments

- 2026-11-06: tes `20-day campaign` menang lewat aksi publik (upgrade, repair, 4 event, reward gold, dua battle). `npm test` 10 passed; `npm run typecheck` bersih. Tidak ada script lint.
