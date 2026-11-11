# 03: Kalender lanjut hari persiapan

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Pemain memajukan kalender hanya lewat `endPreparationDay` (tepat satu hari), menerima income sekali per hari persiapan baru, dan memasuki hari battle tanpa income atau belanja.

**Blocked by:** 01 Fondasi state dan state awal

**Status:** done

- [x] Tidak ada API publik untuk lompat ke hari arbitrer.
- [x] `endPreparationDay` hanya sah pada fase preparation di hari persiapan; tujuan = hari berikutnya; penolakan punya error code stabil.
- [x] Memasuki hari persiapan baru meng-grant income sekali, mencatat `incomeGrantedDays`, mereset jatah aksi; hari 10/20 tidak grant income dan menolak ekonomi.
- [x] Transisi ke hari event terjadwal menyiapkan fase/event requirement sesuai aturan (blok lengkap boleh menyusul di tiket 04, tetapi lanjut tidak boleh melewati kewajiban event yang sudah aktif).
- [x] Selaras dengan spek pengamanan-transisi-hari untuk income list dan larangan `enterDay` publik; jangan mengimplementasikan controller actionId di sini.
- [x] Tes publik: income berulang ditolak, skip belanja + lanjut OK, tidak ada income battle day, revision/kemurnian.

## Comments

- 2026-11-06: `endPreparationDay` saja. Hari event masuk fase `event` dengan paket lokal. Tidak ada `enterDay` publik.
