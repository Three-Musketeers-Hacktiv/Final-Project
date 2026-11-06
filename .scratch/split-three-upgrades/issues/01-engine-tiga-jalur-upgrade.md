# 01: Engine tiga jalur upgrade

**What to build:** Pemain dapat membeli upgrade tembok (DEF), pasukan (ATK), atau kota (MaxHP + income) lewat API publik engine, dengan satu slot aksi ekonomi sukses per hari bersama repair; state format version 3 menyimpan tiga level terpisah.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] `GameState.version` adalah 3 dengan `wallLevel`, `troopLevel`, `cityLevel` (tanpa `upgradeLevel`); state awal level 0.
- [x] `upgradeWall` / `upgradeTroops` / `upgradeCity` / `repairCity` berbagi gate harian; gagal tidak menghabiskan jatah.
- [x] Tembok hanya menaikkan defense efektif; pasukan hanya attack efektif; kota menaikkan max HP, mengisi current HP sebesar bonus, dan menambah income harian persiapan.
- [x] Biaya per jalur mengikuti level jalur itu; diskon upgrade global berlaku ke ketiga jalur (ceil, non-stack); repair tidak kena diskon.
- [x] Max level per jalur ditolak dengan `MAX_UPGRADE`; gold kurang dengan `INSUFFICIENT_GOLD`; state input tidak berubah saat gagal.
- [x] Selector publik mengekspos biaya per jalur serta attack/defense/income/max HP efektif.
- [x] Unit test perilaku ekonomi/diskon/income di seam API publik; angka playtest dari config terpusat.

## Referensi

Spesifikasi: ../spec.md · Plan: plans/split-three-upgrades.md
