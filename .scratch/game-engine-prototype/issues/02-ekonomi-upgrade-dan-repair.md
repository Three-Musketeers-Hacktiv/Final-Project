# 02: Ekonomi upgrade dan repair

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Pada hari persiapan, pemain dapat upgrade kota (ATK+DEF) atau repair HP dengan maksimal satu aksi ekonomi sukses per hari; aksi invalid ditolak dengan error code tanpa mengubah state atau menghabiskan jatah.

**Blocked by:** 01 Fondasi state dan state awal

**Status:** done

- [x] `upgradeCity` memotong gold sesuai biaya bertingkat, menaikkan `upgradeLevel`, dan menolak saat gold kurang atau level maksimum.
- [x] `repairCity` memulihkan HP terbatas tanpa melebihi max, menolak saat HP penuh atau gold kurang.
- [x] Satu aksi sukses meng-set `actionUsedToday`; aksi gagal tidak meng-set-nya; aksi kedua sukses di hari yang sama ditolak.
- [x] Diskon upgrade (jika belum ada efek) tidak wajib di tiket ini; biaya dasar dari config sudah benar dan dibulatkan sesuai aturan ceil ketika diskon nanti aktif.
- [x] Input state tidak bermutasi; `revision` naik sekali hanya pada sukses.
- [x] Tes publik mencakup biaya, cap, HP penuh, gold kurang, jatah harian, dan kemurnian state.

## Comments

- 2026-11-06: `upgradeCity` / `repairCity`. Diskon ceil ikut teruji (`110 * 0.75` → 83). Repair tidak kena diskon.
