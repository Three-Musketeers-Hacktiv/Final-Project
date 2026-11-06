# PRD — Fantasy City Defense

Versi 2.1 · Target prototipe 13 November 2026

Versi ini **menggantikan** aturan rekrutmen unit dan upgrade tunggal ATK+DEF di PRD lama. Spek mesin mengikuti [AGENTS.md](./AGENTS.md) dan kontrak [docs/DEV1_CONTRACT.md](./docs/DEV1_CONTRACT.md). State tersimpan mengikuti [docs/database/](./docs/database/). Ringkasan modul: [plans/game-engine-modules.md](./plans/game-engine-modules.md). Freeze fitur spekulatif: [plans/feature-freeze-playtest.md](./plans/feature-freeze-playtest.md).

## 1. Ringkasan

Pemain menjadi lord kota fantasy. Setiap hari persiapan ia membagi gold antara **tiga jalur upgrade** (tembok / pasukan / kota) dan **perbaikan HP**, maksimal satu aksi ekonomi sukses per hari. Pada hari 10 dan 20 kota melawan satu wave monster secara otomatis. Stat musuh terlihat sebelumnya. Empat event terjadwal menawarkan pilihan yang mengubah gold, HP, defense wave, atau diskon upgrade.

Angka di bawah adalah **default playtest**, bukan klaim balancing final. Satu sumber kebenaran: `src/game/config.ts` / `game_ruleset.config`.

## 2. Fase dan alur

Fase state (wajib seragam di engine, API, UI):

`preparation` | `event` | `battleReady` | `battleReport` | `reward` | `gameOver` | `victory`

Catatan: jangan pakai nama fase `battle` dari PRD lama — gunakan `battleReady` sebelum Mulai, lalu `battleReport` setelah hasil tersimpan.

Saat memasuki hari persiapan (1–9, 11–19):

1. Tambah pemasukan sekali (termasuk hari 1).
2. Jika ada event belum selesai → fase `event`; selesai dulu sebelum belanja/lanjut.
3. Maksimal satu aksi ekonomi sukses: upgrade tembok **atau** pasukan **atau** kota **atau** repair, atau skip.
4. Lanjut hari mengakhiri hari; jatah aksi tidak terbawa.

Hari 10 / 20: tanpa income dan belanja. Fase `battleReady` → pemain Mulai → hasil dihitung & disimpan sekali → `battleReport`. Playback UI tidak mengubah hasil.

Setelah laporan wave 1 sukses → wajib pilih satu reward → hari 11. Wave 2 sukses → `victory` tanpa reward. HP kota 0 kapan pun → `gameOver`.

## 3. Kota dan biaya

### Tiga jalur upgrade (state `version: 3`)

| Jalur | Field | Efek per level |
|---|---|---|
| Tembok | `wallLevel` | Defense +2 |
| Pasukan | `troopLevel` | Attack +5 (level attack kota; **bukan** rekrut unit) |
| Kota | `cityLevel` | MaxHP +20, income harian +8; current HP naik sebesar bonus MaxHP (bukan heal penuh) |

Satu slot aksi harian bersama repair. Diskon upgrade berlaku ke **ketiga** biaya jalur. Repair tidak kena diskon.

### Nilai uji awal (playtest)

| Parameter | Nilai |
|---|---:|
| Gold sebelum pemasukan hari 1 | 100 |
| Pemasukan dasar per hari persiapan | **25** |
| HP kota awal / maksimum | 150 |
| Base attack | 10 |
| Base defense | 2 |
| Biaya upgrade pertama (tiap jalur) | 50 |
| Kenaikan biaya tiap level | 20 |
| Bonus tembok / pasukan / kota | DEF +2 / ATK +5 / MaxHP +20 + income +8 |
| Maksimal tiap jalur | 5 (mulai level 0) |
| Biaya perbaikan | 30 |
| Pulih per perbaikan | sampai 30 HP |

Biaya upgrade berikutnya = `baseCost + levelSaatIni × costStep`. Setelah diskon: bulatkan **ke atas**. Diskon tidak ditumpuk — pakai rate terbesar aktif.

### Stat turunan

```text
attack  = baseAttack  + troopLevel × troopAttackBonus
defense = baseDefense + wallLevel × wallDefenseBonus + bonusDefenseEventAktif
income  = dailyIncome + cityLevel × cityIncomeBonus + prepIncomeBonus(hari 11–19 bila aktif)
```

Jangan menyimpan total ATK/DEF terpisah di `GameState` yang bisa drift. Snapshot boleh ada di `battleResult` / `game_properties` untuk audit.

### Aksi utama (ekonomi)

Hanya: **upgradeWall**, **upgradeTroops**, **upgradeCity**, **repairCity**. Tidak ada rekrut pemanah/penjaga dengan HP individual, formasi, atau mana.

Validasi sebelum ubah state: fase, aksi tersisa, gold, level max jalur, HP tidak penuh untuk repair. Gagal → state tidak berubah; kembalikan error code. Event/reward **tidak** memakai jatah aksi ekonomi.

## 4. Ancaman

| Wave | Hari | Nama | HP | Attack |
|---|---:|---|---:|---:|
| 1 | 10 | Gerombolan Goblin | 150 | 22 |
| 2 | 20 | Pasukan Orc | 260 | 34 |

Satu bar HP gabungan per wave. Nama berbeda belum berarti skill khusus.

## 5. Battle

Setiap ronde, serangan bersamaan:

- Damage ke monster = attack efektif kota.
- Damage ke kota = `max(1, monsterAttack − defenseEfektif)`.
- Kedua HP dikurangi dari kondisi awal ronde; minimum 0.
- Pihak yang mati di ronde itu tetap sempat menyerang di ronde tersebut.
- Monster 0 & kota hidup → wave berhasil.
- Kota 0 (termasuk keduanya 0) → kalah.

Tidak ada random, crit, timer di engine. UI boleh animasi 5 detik/ronde, ×5, atau “Lihat Hasil”; hasil dari state tersimpan.

## 6. Event

Jadwal: hari **3, 7, 13, 17**. Tepat dua pilihan. Minimal satu gratis.

Paket default (angka boleh diubah di config):

| Hari | Pilihan A | Pilihan B |
|---|---|---|
| 3 | Bayar 20 gold, defense +4 untuk wave 1 | Gratis, tanpa efek |
| 7 | Bayar 15 gold | Gratis, HP kota −10 |
| 13 | Gratis, gold +20 | Gratis, diskon upgrade 25% sampai wave 2 |
| 17 | Bayar 20 gold, defense +4 untuk wave 2 | Gratis, tanpa efek |

Efek didukung: `grantGold`, `damageCity`, `nextWaveDefense`, `upgradeDiscount`.

**Backend:** AI/mock hanya narasi + label; efek dari `packageId` terpercaya. Simpan ke `event_data` / `runs_event`. Fallback jika AI gagal.  
**Frontend:** render biaya/efek/durasi dari data terstruktur; jangan parse angka dari teks cerita.  
**Engine:** terapkan pilihan sekali; HP fatal → game over.

## 7. Reward (setelah wave 1)

Pilih tepat satu:

| ID konsep | Efek |
|---|---|
| Bantuan kerajaan | Gold +40 langsung |
| Jalur perdagangan | Pemasukan +6 pada hari persiapan 11–19 |
| Logistik kota | Diskon upgrade 25% pada hari 11–19 (ketiga jalur) |

Tidak ada bonus gold otomatis di luar pilihan. Bonus berakhir setelah wave 2 / sesuai expiry di state.

## 8. Persistensi dan konsistensi

- Satu save aktif per user (`User.saveGame` → `game_runs`).
- Setiap aksi sukses: `actionId` + `revision`; duplikat/klik ganda ditolak.
- Battle result tersimpan sebelum animasi; refresh di `battleReport` membaca hasil, tidak re-resolve.
- Save invalid / `version` bukan 3: pesan + opsi mulai baru; jangan hapus diam-diam; jangan migrasi diam-diam dari `upgradeLevel`.
- `game_properties` mencatat gold, cityHp, cityMaxHp, wallLevel, troopLevel, cityLevel, serta attack/defense dari selector.

Detail koleksi: [docs/database/Database_proposal.md](./docs/database/Database_proposal.md), alur: [docs/database/FLOW_DATABASE.md](./docs/database/FLOW_DATABASE.md).

## 9. UI (tanggung jawab Frontend)

- Pembuka: login, permainan baru / lanjutkan.
- Dashboard: hari, fase, gold, HP / MaxHP, **tiga level** (tembok/pasukan/kota), ATK/DEF/income efektif, aksi tersisa, ancaman, efek aktif.
- Panel aksi: tiga tombol upgrade + repair; biaya & delta dari API/engine selector — jangan hardcode rumus.
- Event, battle (HP bar + log), laporan, reward, layar menang/kalah.
- Opsional prototipe: mode Auto lanjut hari (timer UI saja; tidak auto-beli) — [plans/auto-run-20-dan-50.md](./plans/auto-run-20-dan-50.md).
- Desktop prioritas; status tidak hanya warna.

## 10. Penerimaan

- Menang 20 hari dan game over bisa dicapai.
- Income hanya hari persiapan, sekali per hari (dasar 25 + bonus kota/reward yang berlaku).
- Satu aksi ekonomi sukses per hari di salah satu dari empat aksi; gagal tidak ubah state.
- Stat turunan, diskon, battle simultan, expiry efek benar.
- Refresh aman di semua fase.
- Test engine + typecheck/lint/build lulus.

## 11. Risiko

Defense atau attack satu jalur terlalu kuat, satu reward dominan, battle terlalu panjang — atasi lewat config & playtest, jangan tambah fitur. Jangan implementasikan kembali rekrutmen unit / formasi tanpa keputusan tim tertulis.

## 12. Setelah prototipe oke — kampanye produksi 50 hari

Prototipe wajib tetap **20 hari / 2 wave** sampai kriteria penerimaan (§10) dan playtest lulus. Jangan kerjakan 50 hari sebelum itu.

Setelah prototipe stabil, produksi memakai ruleset baru (contoh id: `campaign-50`) tanpa mengubah run lama yang memakai ruleset 20 hari.

| Item | Prototipe | Produksi (setelah oke) |
|---|---|---|
| Panjang | 20 hari | **50 hari** |
| Wave | Hari 10, 20 | Hari **10, 20, 30, 40, 50** (5 wave) |
| Event | 3, 7, 13, 17 | Perpanjang pola: **dua event per blok 10 hari** (target ~10 event) |
| Reward | Setelah wave 1 saja | Setelah tiap wave sukses kecuali wave terakhir (atau sesuai playtest; tetap satu pilihan per momen reward) |
| Config | Satu ruleset prototipe | Dokumen `game_ruleset` terpisah; `engineVersion` kompatibel |

Aturan yang **tidak berubah** saat naik ke 50 hari: satu aksi ekonomi/hari, tiga jalur upgrade + repair, battle simultan, efek dari paket terpercaya, AI hanya narasi.

Implementasi: angka wave/event/reward hidup di `config` / `game_ruleset.config` — engine membaca jadwal dari config, bukan hardcode “hanya hari 20” di banyak cabang. FE menampilkan panjang kampanye dari ruleset aktif; BE menyimpan `rulesetId` per run. Tidak ada day-picker bebas (pemain tidak memilih 27/83 hari).
