# Surrender Action

Status: ready-for-human

## Problem Statement

Pemain perlu bisa menyerah dari Settings agar run berakhir sebagai `gameOver` tanpa menunggu kota mati di battle/event.

Engine murni (`src/game`) sudah menyediakan `surrender(state)`, tetapi jalur produk `POST /api/runs/:runId/actions` belum mengenal tipe aksi itu. Tombol Surrender di FE masih placeholder karena kontrak backend belum ada.

## Solution

Backend mendaftarkan aksi `surrender` pada schema request, tipe persistensi, dan adapter `applyGameAction`, lalu mendelegasikan ke `surrender` dari engine. Persistensi `endedAt` / hapus save aktif mengikuti jalur `gameOver` yang sudah ada di service.

## Engine contract (sudah tersedia)

```ts
surrender(state: GameState): ActionResult
```

- Run aktif → `phase: "gameOver"`, `revision + 1`; field lain tidak diubah.
- Fase `gameOver` / `victory` → `GAME_ENDED`.
- Tidak menghabiskan jatah aksi harian.

## Out of scope (feature ini untuk BE)

- Perubahan aturan engine tambahan.
- Wiring tombol Settings di FE (tiket terpisah setelah API siap).
