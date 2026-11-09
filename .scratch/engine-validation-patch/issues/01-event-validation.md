# 01: Engine — perketat validasi event terhadap eventPlan

**What to build:** Perketat `attachActiveEvent` dan `chooseEventOption` agar identitas event hanya diterima jika cocok `eventPlan` run, hari, dan fase yang sah; cegah double-apply efek dan penggantian event aktif oleh respons terlambat.

**Assignee:** Game engine (Developer 1)

**Blocked by:** Tidak ada. Bergantung pada `eventPlan` yang sudah ada di state v3.

**Status:** ready-for-agent

**Implementation status:** done (2026-11-08)

## Acceptance criteria

- [x] Helper internal memvalidasi `eventId`, `packageId`, dan `day` terhadap entry `eventPlan` + config terpercaya (tanpa fallback pool longgar pada jalur attach/choose).
- [x] `event.day` harus sama dengan `state.day`.
- [x] Attach hanya di fase `preparation` \| `event`; choose hanya di fase `event`.
- [x] Tolak event di luar jadwal, paket di luar plan, identitas palsu, dan event yang sudah selesai (error terstruktur yang sudah ada).
- [x] Attach ulang event aktif identik (`eventId` + `packageId` + `day`) = no-op tanpa naik `revision`.
- [x] Event aktif yang sudah tersimpan tidak diganti respons narasi terlambat / attach berbeda.
- [x] Biaya dan efek diambil dari config terpercaya; effects palsu di payload diabaikan.
- [x] Kegagalan tidak mengubah state asal.
- [x] Fixture fatal day-7 di test memakai paket dari plan run.

## Scope notes

- File utama: `src/game/events.ts`
- Jangan ubah UI/BE/DB atau naikkan `version` state.
- Urutan cek dan kode error: lihat [../spec.md](../spec.md).

## Referensi

- Spec: [../spec.md](../spec.md)
- Kode: `src/game/events.ts`, `src/game/eventPlan.ts`, `src/game/config.ts`
- Riwayat: [../../../docs/GAME_ENGINE_PATCH_HISTORY.md](../../../docs/GAME_ENGINE_PATCH_HISTORY.md) §7.2

## Comments

- 2026-11-08: Direproduksi — defense +4 lalu attach `eventId` baru + `packageId` sama → sebelumnya bisa +8; setelah patch ditolak.
