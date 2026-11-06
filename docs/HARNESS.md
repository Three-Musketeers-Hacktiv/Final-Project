# Game Engine Test Harness

Mock frontend + mock HTTP narrative server untuk menguji engine Developer 1.

**Bukan** UI produk dan **bukan** backend produksi. Diganti nanti oleh implementasi Developer 2 / 3.

## Menjalankan (dua terminal)

```bash
# Terminal A — mock backend (loopback)
npm run mock-server
# http://127.0.0.1:8787

# Terminal B — harness UI (Vite + proxy /api)
npm run harness
# http://127.0.0.1:5173/
```

| Layanan | Alamat |
|---|---|
| Harness UI | http://127.0.0.1:5173/ |
| Mock API | http://127.0.0.1:8787 |
| Health | `GET http://127.0.0.1:8787/api/health` |
| Generate event | `POST http://127.0.0.1:8787/api/events/generate` |

Vite mem-proxy `/api` → `:8787`, jadi browser cukup memanggil `/api/...`.

## Endpoints mock

### `GET /api/health`

Status server + daftar package id terpercaya.

### `POST /api/events/generate`

Body minimum:

```json
{
  "runId": "run-1",
  "eventId": "event-day-3",
  "day": 3,
  "packageId": "event-day-3",
  "city": { "gold": 125, "hp": 150, "wallLevel": 0, "troopLevel": 0, "cityLevel": 0 },
  "failureMode": "normal"
}
```

Respons sukses hanya narasi + label pilihan. **Efek dan biaya tetap dari paket lokal engine** (`src/game/config.ts`). Server tidak menghitung ekonomi/battle.

`runId` + `eventId` yang sama → narasi deterministik yang sama.

### Failure mode

Pilih di UI harness, atau kirim `failureMode` / query `?mode=` / header `x-failure-mode`:

| Mode | Perilaku |
|---|---|
| `normal` | JSON valid |
| `delay` | Tunggu ~6.5s (> timeout client 5s) |
| `error500` | HTTP 500 |
| `badJson` | Body bukan JSON |
| `badSchema` | JSON dengan id/skema salah |

Client timeout default **5 detik**, lalu **fallback** ke event lokal (`source: "fallback"`). Permainan tetap jalan jika backend mati.

## Debug save

- Key: `fantasy-engine-harness-v1` (terpisah dari save produk)
- Tombol Simpan / Muat / Reset save
- Muat tidak memanggil ulang `enterDay` / battle — state tersimpan dipakai apa adanya
- Save `version !== 2` atau JSON rusak → error ditampilkan; save lama **tidak** dihapus diam-diam

## Fixture debug

Dropdown fixture (bukan jalur normal 20 hari): awal, gold 0, HP rendah, upgrade max, sebelum wave 1/2, fase event, fase reward. Dibangun lewat helper yang menjaga invariant / aksi engine.

## Memainkan hari 1–20 (jalur normal)

1. Pastikan mock-server + harness jalan; failure mode `normal`.
2. **Permainan baru**.
3. Hari persiapan: Upgrade / Repair (opsional) → **Lanjut hari**. Skip diperbolehkan.
4. Hari event (3, 7, 13, 17): tunggu narasi (mock atau fallback) → pilih salah satu opsi → lanjut hari.
5. Hari 10: **Mulai battle** → **Lanjut laporan** → pilih **satu reward**.
6. Hari 11–19: belanja / event seperti sebelumnya.
7. Hari 20: battle → laporan → **victory** (tanpa reward ekstra).

Refresh setelah battle/reward tersimpan (atau setelah Simpan + Muat) tidak menghitung damage/bonus lagi.

## Scripts

```bash
npm run mock-server   # backend mock
npm run harness       # frontend harness
npm test              # engine + adapter/controller tests
npm run typecheck
npm run lint
```

## Catatan integrasi

- Engine tetap murni di `src/game` — tanpa React/fetch/localStorage.
- Harness controller (`src/dev-harness/engineController.ts`) menahan klik ganda dengan flag `busy` dan mengabaikan respons event usang setelah reset/load/new game.
- Controller atomik penuh (`expectedRevision` / `actionId`) adalah tiket 03 terpisah — belum diasumsikan di sini.
