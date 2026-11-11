# 01: Schema + GameView kosong untuk timeline

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Run baru dan load run mengembalikan `game.timeline` sebagai array kosong yang terdokumentasi di schema serta kontrak API, sehingga FE punya field stabil sebelum append diisi.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `GameRunDocument` punya field top-level `timeline: TimelineEntry[]`; create run menulis `timeline: []`.
- [ ] Tipe `TimelineEntry` (dan category/tone) tersedia untuk server + kontrak publik; `id` bertipe string wajib pada data tersimpan.
- [ ] `toGameView` selalu mengembalikan `timeline` (dokumen tanpa field dibaca sebagai `[]`).
- [ ] `GameView` di kontrak API memuat `timeline: TimelineEntry[]`.
- [ ] Create run, get current, dan get by id sukses mengekspos `game.timeline` (kosong untuk run baru).
- [ ] `DATABASE_SCHEMA_V3` bagian `game_runs` dan `API_CONTRACT` bagian `GameView` diperbarui.
- [ ] Uji: create/get → `timeline` adalah `[]`; missing field pada dokumen lama → `[]` di view.
- [ ] Tidak mengimplementasikan append pada action (tiket 02). Tidak mengubah engine `src/game`. Tidak mengubah wiring FE hydrate (tiket 03).

## Referensi

Spesifikasi: [../spec.md](../spec.md)

## Comments
