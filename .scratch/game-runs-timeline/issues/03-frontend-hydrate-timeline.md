# 03: Frontend hydrate timeline dari GameView

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Panel Timeline diisi dari `game.timeline` yang dikirim server (load awal dan setelah setiap action sukses), sehingga refresh atau muat ulang save aktif menampilkan history yang sama tanpa mengandalkan append-only memori lokal.

**Blocked by:** 02 — Backend append timeline saat action sukses.

**Status:** ready-for-agent

- [ ] `GameProvider` (atau setara) menginisialisasi state timeline dari `initialGame.timeline`.
- [ ] Setelah action sukses, timeline UI memakai `result.game.timeline` dari server sebagai sumber kebenaran (bukan hanya `describeAction` lokal yang bisa drift).
- [ ] Refresh / load save aktif dengan `GameView` yang sudah berisi timeline menampilkan entry tersimpan.
- [ ] Tipe kontrak FE mengenal `GameView.timeline`; komponen Timeline tetap merender shape entry yang sama.
- [ ] Request action tidak mengirim payload timeline.
- [ ] Uji atau verifikasi terfokus: hydrate dari initial view; update dari response action; tidak double-append lokal di atas array server.
- [ ] Tidak mengubah schema Mongo atau logika append backend. Tidak menambah endpoint history terpisah atau redesign visual Timeline.

## Referensi

Spesifikasi: [../spec.md](../spec.md)

## Comments
