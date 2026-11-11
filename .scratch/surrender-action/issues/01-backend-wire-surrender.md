# 01: Backend — daftarkan aksi `surrender` ke game engine

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Ekspos aksi `surrender` lewat adapter dan API produk agar `POST /api/runs/:runId/actions` memanggil `surrender` dari `src/game` dan menutup run sebagai `gameOver`.

**Assignee:** Backend (Developer 2)

**Blocked by:** Engine `surrender` sudah ada di `src/game/transitions.ts` (diekspor dari `src/game/index.ts`). Tidak menunggu FE.

**Status:** ready-for-human

## Acceptance criteria

- [ ] Tambah `surrender` ke `EngineGameAction` dan `applyGameAction` di `app/server/game-engine/adapter.ts`; import serta panggil `surrender(state)` dari `../../../src/game`.
- [ ] Tambah literal `type: "surrender"` dengan `payload: {}` ke `submitActionSchema` di `app/server/game/schemas.ts`.
- [ ] Tambah `"surrender"` ke `GameActionType` di `app/server/game/types.ts` (dan dokumen schema terkait jika masih diduplikasi, mis. `DATABASE_SCHEMA_V3` / catatan action log).
- [ ] Perbarui `app/docs/API_CONTRACT.md`: union `SubmitActionRequest` dan tabel mapping action → engine memuat `surrender` → `surrender(state)`.
- [ ] Request sukses mengubah `state.phase` menjadi `gameOver`, menaikkan `revision` sekali, menulis action log, dan mengikuti jalur akhir yang sudah ada (`endedAt` terisi, pointer save aktif dihapus) tanpa logika game-over baru di service.
- [ ] Request `surrender` pada run yang sudah berakhir ditolak dengan `GAME_ENDED` (guard service dan/atau error engine).
- [ ] Request dengan `type` lain atau payload non-kosong untuk `surrender` tetap ditolak schema seperti aksi kosong lainnya.
- [ ] Uji adapter dan/atau schema/service: surrender dari run aktif → `gameOver`; surrender ulang / aksi lain setelah end → gagal; mapping `applyGameAction({ type: "surrender", payload: {} })` memanggil engine.
- [ ] Tidak mengubah aturan ekonomi/battle/event di `src/game`. Tidak mengimplementasikan tombol FE Settings (masih TODO di `SettingsDialog`).
- [ ] Jalankan test/typecheck backend yang relevan; laporkan hasil aktual.

## Scope notes

- Pola ikuti aksi tanpa payload seperti `repairCity` / `endPreparationDay`.
- Service `submitGameAction` sudah meng-set `endedAt` ketika `phase` adalah `gameOver` atau `victory`; cukup pastikan surrender mengalir lewat `applyGameAction` tanpa cabang khusus kecuali tes.
- FE boleh dikerjakan di tiket terpisah setelah kontrak API ini merge.

## Referensi

- Spec: [../spec.md](../spec.md)
- Engine: `src/game/transitions.ts` (`surrender`), `src/game/game.test.ts` (describe `"surrender"`)
- Adapter: `app/server/game-engine/adapter.ts`
- Schema: `app/server/game/schemas.ts`
- Kontrak: `app/docs/API_CONTRACT.md` § gameplay actions
- FE placeholder: `app/components/SettingsDialog.tsx`

## Comments

- 2026-11-08: Tiket dibuat setelah Dev1 menambah `surrender` di engine saja; produk belum bisa memanggil aksi sampai BE menyesuaikan.
