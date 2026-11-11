# 02: Backend append timeline saat action sukses

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Setelah action permainan sukses, backend menghasilkan entry timeline (setara `describeAction`), menambahkannya ke `game_runs.timeline` dalam commit yang sama dengan state, dan mengembalikan array lengkap di `GameView` — tanpa duplikasi pada replay `actionId`.

**Blocked by:** 01 — Schema + GameView kosong untuk timeline.

**Status:** ready-for-agent

- [ ] Modul describe server-safe menghasilkan `TimelineEntry[]` dari action + before/after view (atau setara); wording/kategori selaras dengan perilaku FE saat ini.
- [ ] `id` entry deterministik: `${actionId}:${index}` (index dalam batch entry untuk action itu).
- [ ] Commit action sukses meng-append entry secara atomik bersama update `state` / metadata run.
- [ ] Action gagal, validasi gagal, atau stale revision tidak mengubah `timeline`.
- [ ] Replay idempotent `actionId` yang sama tidak menambah entry dua kali; response tetap membawa timeline tersimpan.
- [ ] Response POST action sukses memuat `game.timeline` lengkap; GET setelah action mengembalikan array yang sama.
- [ ] Uji minimal: upgrade/repair atau advance-day append; event/battle/reward jika jalur test sudah ada; gagal tidak berubah; idempotent no double-append.
- [ ] Tidak menerima timeline dari body request FE. Tidak mengubah aturan engine di `src/game`. Tidak mengerjakan hydrate FE (tiket 03).

## Referensi

Spesifikasi: [../spec.md](../spec.md) · Acuan copy: perilaku `describeAction` di client timeline module

## Comments
