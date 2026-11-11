# 03: Kontrol UI Auto dan indikator aksi tersisa

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** UI (uji atau produk) menampilkan toggle Manual/Auto, countdown, status Dijeda + alasan, Lanjutkan auto, dan peringatan bahwa aksi ekonomi hari itu masih tersedia—tanpa menyalin rumus engine.

**Blocked by:** 01 Auto Run frontend; 02 Jeda lifecycle

**Status:** ready-for-agent

- [ ] Toggle Manual/Auto, Auto Run / Lanjutkan auto, status berjalan/Dijeda dengan alasan yang jelas.
- [ ] Countdown interval lima detik terlihat saat Auto berjalan.
- [ ] Saat Auto berjalan dan aksi ekonomi hari itu belum dipakai, UI menampilkan indikator “aksi masih tersedia”.
- [ ] Mode Auto tetap terlihat saat dijeda; resume hanya pada fase yang sah.
- [ ] Tombol manual dan auto memakai jalur action yang sama tanpa menyalin aturan engine.
- [ ] UI tidak memilih event/reward, membeli upgrade/perbaikan, atau memulai/melanjutkan battle sendiri.
- [ ] Dokumentasi singkat: engine berbasis input; scheduler hanya di frontend; Fase A = 20 hari; 50 hari memakai UI yang sama nanti.
- [ ] Verifikasi mencakup event loading/fallback, battle, reward, perpindahan mode, dan tab tersembunyi; laporkan hasil test/typecheck yang benar-benar dijalankan.

## Referensi

Spesifikasi: ../spec.md · Plan: plans/auto-run-20-dan-50.md
