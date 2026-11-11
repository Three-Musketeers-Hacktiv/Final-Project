# 03: Integrasi 20 hari dan kontrak D2/D3

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../../PRD.md).

**What to build:** Kampanye 20 hari tetap bisa diselesaikan lewat aksi publik dengan upgrade terpisah, dan dokumen kontrak memberitahu Developer 2/3 bahwa `upgradeLevel` tunggal diganti tiga jalur pada version 3.

**Blocked by:** 01: Engine tiga jalur upgrade.

**Status:** ready-for-agent

- [x] Integration test 20 hari memakai aksi upgrade/repair publik nyata (bukan lompat state) dan menutup ke victory atau jalur akhir yang sah.
- [x] `DEV1_CONTRACT` (dan catatan AGENTS/modul terkait) mendokumentasikan version 3, field tiga level, API baru, serta supersede “upgrade ATK+DEF sekaligus”.
- [x] Tidak ada migrasi save version 2; perilaku yang diharapkan adalah reject atau permainan baru.
- [x] Tidak menambah rekrutmen unit, formasi, atau efek event baru di luar diskon upgrade yang sudah ada.

## Referensi

Spesifikasi: ../spec.md · Plan: plans/split-three-upgrades.md
