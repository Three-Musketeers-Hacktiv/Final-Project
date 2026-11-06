# 05: Battle deterministik dan laporan

**What to build:** Pada hari battle, pemain memulai wave sekali; engine menghitung hasil simultan, menyimpan log di state, dan menolak perhitungan ulang; kota kalah jika HP 0 (termasuk mutual KO).

**Blocked by:** 01 Fondasi state dan state awal; 03 Kalender lanjut hari persiapan

**Status:** done

- [x] Fase `battleReady` pada hari 10/20; `startBattle` memakai ATK/DEF efektif (termasuk bonus defense wave bila ada) dan config monster.
- [x] Damage simultan; damage ke kota `max(1, monsterAtk - def)`; HP tidak negatif; log ronde tersimpan; `battleResult` dan fase `battleReport`.
- [x] Wave berhasil menandai progres; kota 0 → `gameOver`; mutual KO = kalah.
- [x] `startBattle` kedua / reload state laporan tidak menerapkan damage lagi (`BATTLE_ALREADY_RESOLVED` atau setara).
- [x] Konfigurasi battle invalid ditolak; tidak ada randomness/timer di engine.
- [x] Tes publik: defense tinggi, overkill, mutual KO, serialisasi laporan, kemurnian input.

## Comments

- 2026-11-06: `startBattle` sekali. Mutual KO (level 5, HP 50, hari 10) → `gameOver`. Laporan yang di-reload tidak mengurangi HP lagi.
