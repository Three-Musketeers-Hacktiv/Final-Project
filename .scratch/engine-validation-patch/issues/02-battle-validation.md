# 02: Engine — perketat validasi BattleSnapshot

**What to build:** Validasi semua field numerik `BattleSnapshot` dengan `Number.isFinite` dan rentang kontrak sebelum loop damage di `resolveBattle`, agar `NaN`/`Infinity` tidak menghasilkan HP laporan rusak.

**Assignee:** Game engine (Developer 1)

**Blocked by:** Tidak ada. Boleh paralel dengan tiket 01.

**Status:** ready-for-agent

**Implementation status:** done (2026-11-08)

## Acceptance criteria

- [x] Semua field numerik (`wave`, `day`, `cityHp`, `cityAttack`, `cityDefense`, `monsterHp`, `monsterAttack`) wajib `Number.isFinite`.
- [x] HP awal kedua pihak dan attack kota/monster harus positif.
- [x] Defense ≥ 0 (tolak negatif; `0` tetap sah).
- [x] `wave` ∈ {1, 2} dan pasangan `(wave, day)` ada di `gameConfig.waves`.
- [x] Input invalid → `null` (kontrak `resolveBattle` saat ini).
- [x] `startBattle` tetap memetakan `null` → `BATTLE_INVALID` tanpa ubah rumus di `transitions.ts`.
- [x] Tidak mengubah rumus damage, damage bersamaan, aturan kalah saat keduanya tumbang, atau perhitungan HP hilang.
- [x] Tidak mengubah balancing.

## Scope notes

- File utama: `src/game/battle.ts` (boleh import `gameConfig` untuk cek wave/hari).
- Jangan ubah API publik atau format hasil battle yang valid.

## Referensi

- Spec: [../spec.md](../spec.md)
- Kode: `src/game/battle.ts`, `src/game/transitions.ts` (`startBattle`)
- Riwayat: [../../../docs/GAME_ENGINE_PATCH_HISTORY.md](../../../docs/GAME_ENGINE_PATCH_HISTORY.md) §7.3

## Comments

- 2026-11-08: Direproduksi — `cityAttack: NaN` lolos guard `<= 0` dan menghasilkan HP `NaN` di laporan.
