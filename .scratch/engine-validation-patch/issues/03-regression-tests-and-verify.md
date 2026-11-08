# 03: Engine — regression test + verifikasi

**What to build:** Tambah/sesuaikan tes di `src/game/game.test.ts` untuk celah event & battle, pastikan campaign 20 hari tetap hijau, jalankan typecheck + vitest, laporkan hasil aktual.

**Assignee:** Game engine (Developer 1)

**Blocked by:** Tiket 01 dan 02 (perilaku yang diuji harus sudah ada di kode).

**Status:** ready-for-agent

**Implementation status:** done (2026-11-08)

## Acceptance criteria

- [x] Tes: eventId baru + paket sama tidak memberi bonus kedua kali; state/revision tidak berubah saat gagal.
- [x] Tes: `packageId` di luar `eventPlan` ditolak.
- [x] Tes: hari atau fase salah ditolak.
- [x] Tes: `chooseEventOption` dengan identitas tidak konsisten ditolak.
- [x] Tes: attach ulang aktif identik = no-op (revision sama).
- [x] Tes: respons terlambat / attach berbeda tidak mengganti event aktif.
- [x] Tes: effects palsu di payload tidak dipakai (efek aktual dari config).
- [x] Tes: `NaN` / `Infinity` / `-Infinity` pada tiap field numerik battle → `null`.
- [x] Tes: HP/attack invalid, defense negatif, wave/hari invalid → `null`.
- [x] Tes: battle valid deterministik, HP finite.
- [x] Integration test alur 20 hari tetap berhasil.
- [x] `npm run typecheck` dan `npm test` dijalankan; hasil dilaporkan (bukan diklaim lulus tanpa run).

## Scope notes

- Impor `attachActiveEvent` dari index; `resolveBattle` dari `./battle` bila belum diekspor publik.
- Tidak menambah dependency atau framework E2E.
- Jika Vitest kena `EPERM` spawn, laporkan kendala lingkungan.

## Hasil verifikasi (2026-11-08)

| Check | Hasil |
|---|---|
| `npm run typecheck` | lulus |
| `npm test` | 30/30 lulus (`src/game` + `src/ui`) |
| Lint/build root | tidak ada script di `package.json` |

## Referensi

- Spec: [../spec.md](../spec.md)
- Tes: `src/game/game.test.ts`
- Riwayat: [../../../docs/GAME_ENGINE_PATCH_HISTORY.md](../../../docs/GAME_ENGINE_PATCH_HISTORY.md) §7.4

## Comments

- 2026-11-08: Fixture day-7 fatal damage diselaraskan ke paket plan agar lulus setelah validasi ketat.
