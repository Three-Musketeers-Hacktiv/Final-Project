# Pisah Upgrade: Tembok / Pasukan / Kota

Keputusan terkunci · 6 Nov 2026 · Spek: [`.scratch/split-three-upgrades/`](../.scratch/split-three-upgrades/)

> **Historis.** Keputusan tiga jalur tetap berlaku; angka cap/biaya/version di dokumen ini adalah era v3. Nilai aktif: [`../docs/game-engine/CONFIGURATION.md`](../docs/game-engine/CONFIGURATION.md).

## Ringkasan

Pisahkan upgrade tunggal menjadi tiga jalur (tembok/DEF, pasukan/ATK, kota/MaxHP+income) dengan satu slot aksi harian bersama, repair tetap ada, angka playtest default, dan bump state version ke 3.

## Keputusan terkunci

| Keputusan | Isi | Alasan |
|---|---|---|
| Slot harian | Satu aksi ekonomi sukses per hari (tembok **atau** pasukan **atau** kota **atau** repair) | Tekanan pilihan 20 hari; 3 upgrade/hari terlalu cepat vs wave |
| Upgrade kota | Naikkan `cityMaxHp` dan isi `cityHp` sebesar kenaikan (tidak heal penuh) | Investasi terasa segera; tidak menggantikan repair |
| Repair | Tetap ada, tidak kena diskon | Kerusakan battle butuh aksi terpisah |
| Diskon upgrade | Berlaku ke ketiga jalur biaya upgrade | Event/reward “Logistik kota” tetap bermakna |
| Angka | Default playtest di bawah (tune di config) | Wiring + playtest dulu |

### Default playtest

- **Tembok** (`wallLevel`): DEF +2 / level · biaya `50 + level×20` · max 5
- **Pasukan** (`troopLevel`): ATK +5 / level · biaya sama · max 5
- **Kota** (`cityLevel`): MaxHP +20 dan income harian +8 / level · biaya sama · max 5
- Base tetap: ATK 10, DEF 2, MaxHP 150, income 25
- Cap teoritis: ATK 35, DEF 12, MaxHP 250, income 65 (+ bonus reward income hari 11–19)
- Playtest: bonus income kota **+8** (bukan +3). +3 tidak cukup membiayai ATK dan DEF yang sekarang dibeli terpisah sampai wave 2.

Auto-run UI: prioritas tetap **pasukan → tembok → kota** (skip jika semua max / gold kurang).

## Perubahan state & API

Ganti `upgradeLevel`:

```ts
wallLevel: number;
troopLevel: number;
cityLevel: number;
// bump: version: 3
```

API ekonomi:

- Hapus semantik lama `upgradeCity` (ATK+DEF)
- Tambah: `upgradeWall`, `upgradeTroops`, `upgradeCity` (MaxHP + income)
- Semua lewat gate harian yang sama
- `upgradeCity`: bayar → `cityLevel++` → `cityMaxHp += bonus` → `cityHp = min(cityMaxHp, cityHp + bonus)`

Selector:

- ATK dari `troopLevel`; DEF dari `wallLevel` + efek wave
- Biaya per track; diskon global
- Income: `dailyIncome + cityLevel * cityIncomeBonus + prepIncomeBonus(hari 11–19)`

## UI & auto-run

- Try UI: tiga tombol upgrade + level/biaya per jalur; tampilkan MaxHP dan income efektif
- Auto-run: prioritas pasukan → tembok → kota

## Tes & kontrak

- Unit + integration 20 hari lewat aksi publik
- Update `DEV1_CONTRACT`, `AGENTS.md`, catatan modul agar D2/D3 tidak mengasumsikan `upgradeLevel` tunggal
- Save `version: 2` tidak dimigrasi (reject / new game)

## Di luar scope

- Balancing final wave/monster
- Migrasi save version 2
- Rekrutmen unit individual / HP pasukan

## Urutan kerja

1. State v3 + config per-track + aksi/stats/income engine
2. Try UI + auto-run
3. Tes integrasi + dokumen kontrak
