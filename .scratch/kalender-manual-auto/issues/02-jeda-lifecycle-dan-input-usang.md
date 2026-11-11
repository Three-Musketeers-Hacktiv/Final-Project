# 02: Jeda lifecycle dan pembatalan input otomatis lama

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Auto tetap aman saat tab disembunyikan, refresh/load, ganti run, dan tick yang sudah usang—tanpa catch-up multi-hari dan tanpa mencampur run.

**Blocked by:** 01 Auto Run frontend

**Status:** ready-for-agent

- [ ] Tab tersembunyi menjeda auto; kembali memerlukan resume eksplisit dan tidak mengejar hari terlewat.
- [ ] Refresh/load mempertahankan progres tetapi tidak menjalankan kalender otomatis; preferensi mode tidak boleh auto-start timer.
- [ ] New game kembali Manual dan membatalkan seluruh callback run sebelumnya.
- [ ] Load, termasuk save dengan runId yang sama, membatalkan konteks penjadwalan lama.
- [ ] Pergantian mode, jeda, dan pelepasan halaman membatalkan callback lama sebelum dapat mengirim action.
- [ ] Input manual berdekatan dengan tick tidak menerapkan action dari snapshot usang atau menggandakan pemasukan.
- [ ] Ada pengujian controller untuk timer ganda, callback mengantre, reset/load, visibility, dan tidak adanya catch-up.
- [ ] Load pada event/laporan/reward tidak menjalankan ulang biaya, damage, atau reward.

## Referensi

Spesifikasi: ../spec.md
