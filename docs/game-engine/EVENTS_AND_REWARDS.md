# Event dan Reward

## `eventPlan` dan `runId`

`pickEventPlan(runId)` membangun **20 entri** (2 per decade × 10 decade) dengan hash stabil dari `runId`.

Aturan yang benar-benar diterapkan di [`eventPlan.ts`](../../src/game/eventPlan.ts):

- Hanya hari prep; **hari 1 tidak** masuk kandidat.
- Prefer hindari hari prep terakhir sebelum battle bila masih ada pilihan lain.
- Prefer jarak antar dua event dalam decade ≥ `minEventGapDays` (2).
- Paket diambil dari pool decade; usahakan packageId unik dalam decade.
- Hari aktual **bukan** 3/7/13/17 tetap.

`createInitialState` menyimpan hasilnya di `state.eventPlan`. Resolve: `resolveEventPackage(day, state.eventPlan)`.

## Jumlah pilihan

Implementasi: **2–4** pilihan per paket; minimal satu gratis (`goldCost` base 0).  
Ini berbeda dari persyaratan lama AGENTS/PRD yang menyebut tepat dua pilihan.

## Inventaris paket terjadwal

### Decade 1

| packageId | Pilihan (ringkas) | Consequence |
|---|---|---|
| `d1-scouts-a` | bayar 20 → DEF+4 w1; bayar 10 noop; skip gratis | skip → `c-raid-wave1` |
| `d1-envoy-b` | bayar 20 → DEF+4 w1; heal 10 gratis; skip | skip → `c-raid-wave1` |
| `d1-supplies-a` | bayar 15; gold+12 (+unrest); −10 HP; skip (+unrest) | gold/skip → `c-unrest-wave1` |
| `d1-labor-b` | bayar 15; diskon 20% until w1 (+unrest); −10 HP | diskon → `c-unrest-wave1` |

### Decade 2

| packageId | Pilihan (ringkas) | Consequence |
|---|---|---|
| `d2-caravan-a` | gold+20; diskon 25% until w2; skip | skip → `c-shortage-wave2` |
| `d2-guild-b` | bayar 18 → diskon 25% w2; gold+15 (+shortage); skip | gold/skip → `c-shortage-wave2` |
| `d2-patrol-a` | bayar 22 → DEF+5 w2; heal 15; skip (+raid); gold+10 & −8 HP | skip → `c-raid-wave2` |
| `d2-omen-b` | bayar 16; MaxHP+15 (+raid); skip | MaxHP/skip → `c-raid-wave2` |

### Decade 3–10 (pola)

Untuk decade `d` dan wave `w = d`:

**`d{d}-threat-a`** (4 pilihan):

| Pilihan | Base gold | Efek | Consequence |
|---|---:|---|---|
| pay | `18+d` | DEF `3+⌊d/3⌋` untuk wave `w` | — |
| heal | 0 | heal `12+d` | — |
| gold | 0 | gold `14+d` | unrest tier |
| skip | 0 | — | raid tier |

**`d{d}-market-b`** (3 pilihan):

| Pilihan | Base gold | Efek | Consequence |
|---|---:|---|---|
| discount | `15+d` | 25% upgrade until wave `w` | — |
| maxhp | 0 | MaxHP `15+⌊d/2⌋` | — |
| skip | 0 | — | unrest tier |

Pemetaan consequence tier per decade ada di `buildLaterDecades()` (`eventPackages.ts`).

## Inventaris consequence

Delay default: `minDelayDays=1`, `maxDelayDays=3`.

| packageId | Target wave | Pilihan ringkas |
|---|---:|---|
| `c-raid-wave1` | 1 | bayar 20; bayar 12 + DEF+3 w1; −18 HP |
| `c-unrest-wave1` | 1 | bayar 15; −12 HP |
| `c-shortage-wave2` | 2 | bayar 18; gratis noop; −14 HP |
| `c-raid-wave2` | 2 | bayar 22; gratis DEF+4 w2; −20 HP |
| `c-raid-mid` | 5 | bayar 28; −24 HP; heal10 lalu −16 |
| `c-unrest-mid` | 5 | bayar 24; −18 HP |
| `c-raid-late` | 8 | bayar 35; −30 HP; bayar 20 noop |
| `c-unrest-late` | 8 | bayar 30; −22 HP |
| `c-raid-finale` | 10 | bayar 40; −35 HP; heal15 lalu −25 |
| `c-unrest-finale` | 10 | bayar 36; −28 HP |

### Rantai successor

```text
c-raid-wave1 → c-raid-wave2 → c-raid-mid → c-raid-late → c-raid-finale
c-unrest-wave1 → c-unrest-mid → c-unrest-late → c-unrest-finale
c-shortage-wave2 → c-unrest-mid
c-raid-wave2 → c-raid-mid
```

`isTrustedConsequencePackage(origin, scheduled)` memvalidasi rantai ini.

## Narasi AI versus paket efek

| Boleh dari AI / overlay | Harus dari paket terpercaya |
|---|---|
| `title`, `description` | `goldCost` base + scaling engine |
| Label pilihan (tanpa angka currency) | `effects`, consequence packageId |

- `decorateActiveEvent` / `trustedChoiceLabel`: label yang menyebut istilah currency (`gold`, `coin`, `treasury`, `gp`) diganti label engine.
- `narrativeChoiceIdsMatch` memastikan ID pilihan overlay = ID engine.
- Jangan menerapkan efek saat narasi diterima; hanya saat `chooseEventOption`.

## Validasi identitas dan penerapan

1. Event aktif harus cocok hari + `packageId` terpercaya.
2. `choiceId` harus ada di paket (bukan hanya di overlay).
3. Gold cukup untuk biaya **efektif** (difficulty).
4. Satu transaksi: bayar → terapkan efek → tandai selesai → mungkin aktifkan event wajib berikutnya hari yang sama → jika HP 0 → `gameOver`.
5. Ulangi pilihan yang sama ditolak (`EVENT_ALREADY_RESOLVED` / `INVALID_CHOICE`).

## Fallback / respons terlambat

Engine sendiri tidak melakukan HTTP. Yang tersedia di implementasi engine:

- `ensureLocalEvent` — pulihkan event lokal dari plan/consequence jika `activeEvent` hilang.
- `attachActiveEvent` — tempel event tervalidasi (sumber `local` \| `mock` \| `fallback` \| `ai`).
- `source` pada `ActiveEvent` mencatat asal narasi.

Timeout client, HTTP 500, dan JSON invalid adalah tanggung jawab adapter FE/BE/harness. Lihat kontrak [`../ENGINE_TO_BE_CONTRACT.md`](../ENGINE_TO_BE_CONTRACT.md) dan [`../HARNESS.md`](../HARNESS.md).

## Reward per wave

Lihat tabel lengkap di [CONFIGURATION.md](./CONFIGURATION.md#reward-gameconfigwavere wards). Ringkas:

- Setelah wave **1–9**: tepat 3 opsi; wajib pilih satu (`chooseReward`).
- Wave **10**: tidak ada reward → `victory`.
- ID salah wave → `INVALID_CHOICE`.
- Sudah dipilih → `REWARD_ALREADY_CHOSEN`.
- Setelah sukses: masuk `enterCalendarDay(day+1)`.

### Jenis efek

| Jenis | Kapan | Durasi |
|---|---|---|
| `grantGold` | Langsung | Permanen (gold) |
| `healCity` / `damageCity` | Langsung | Permanen (HP) |
| `maxHpBonus` | Langsung | Permanen (MaxHP + HP isi) |
| `prepIncomeBonus` | Set field | Sampai battle berikutnya |
| `upgradeDiscount` | Set rate/untilWave | Sampai battle `untilWave` |
| `nextWaveDefense` | Tambah ke `defenseByWave` | Sampai battle wave itu |
| `combo` | Multi-efek | Mengikuti masing-masing efek |

Diskon event dan reward tidak “ditumpuk aditif”: rate memakai `Math.max`. Lihat catatan semi-stack rate vs durasi di [TESTING_AND_LIMITATIONS.md](./TESTING_AND_LIMITATIONS.md).
