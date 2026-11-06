# 02: Try UI dan auto-run tiga jalur

**What to build:** Di try UI, pemain melihat dan menekan tiga tombol upgrade (plus repair) dengan level/biaya per jalur; auto-upgrade opsional memilih pasukan → tembok → kota paling banyak sekali per hari.

**Blocked by:** 01: Engine tiga jalur upgrade.

**Status:** ready-for-agent

- [x] Try UI menampilkan level dan biaya berikutnya untuk tembok, pasukan, dan kota, plus MaxHP dan income efektif dari selector engine.
- [x] Tombol memanggil `upgradeWall` / `upgradeTroops` / `upgradeCity` / `repairCity`; penolakan menampilkan error tanpa mengubah state.
- [x] Auto-upgrade memakai prioritas pasukan → tembok → kota; skip jika max/gold kurang; tetap paling banyak satu belanja sukses per hari persiapan.
- [x] Pengujian auto-run memverifikasi urutan prioritas dan bahwa engine tetap murni (tanpa timer/domain auto baru).

## Referensi

Spesifikasi: ../spec.md · Plan: plans/split-three-upgrades.md
