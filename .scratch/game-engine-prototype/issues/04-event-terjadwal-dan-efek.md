# 04: Event terjadwal dan efek

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Pada hari 3/7/13/17 pemain menghadapi event dua pilihan dari paket terpercaya; pilihan menerapkan biaya/efek sekali; event belum selesai memblokir belanja dan lanjut hari.

**Blocked by:** 01 Fondasi state dan state awal; 03 Kalender lanjut hari persiapan

**Status:** done

- [x] Empat paket event di config dengan minimal satu pilihan gratis per event.
- [x] Attach/ensure event lokal ke state aktif; narasi boleh fixture; efek hanya dari packageId terpercaya.
- [x] `chooseEventOption` atomik: gold, efek (`grantGold`, `damageCity`, `nextWaveDefense`, `upgradeDiscount`), penanda selesai, fase kembali ke preparation pada hari yang sama tanpa income ekstra / reset aksi.
- [x] Gold kurang / choice invalid / sudah resolved ditolak; HP 0 dari efek → `gameOver`.
- [x] Belanja dan `endPreparationDay` ditolak dengan `EVENT_REQUIRED` saat event wajib belum selesai.
- [x] Tes publik untuk kedua jalur tiap paket default yang relevan, non-stacking discount helper bila sudah tersentuh, dan kemurnian state.

## Comments

- 2026-11-06: efek diambil dari paket config (`packageId`), bukan angka di state. Pilihan fatal hari 7 → `gameOver`. Alur 20 hari memakai keempat event.
