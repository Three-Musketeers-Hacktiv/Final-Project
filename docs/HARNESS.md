# Game Engine Test Harness

> **Catatan sinkronisasi**  
> Dokumen ini menjelaskan harness mock yang direncanakan/pernah dideskripsikan untuk menguji engine.  
> **Perilaku engine aktif** adalah campaign **100 hari / 10 wave / state v4** — lihat [`game-engine/README.md`](./game-engine/README.md).  
> Di root `package.json` saat inventarisasi docs: **tidak ada** script `mock-server` / `harness`; folder `src/dev-harness/` dan `mock-server/` **tidak ditemukan**. Try UI yang tersedia: `npm run play` (Vite).  
> Contoh event `event-day-3` dan jalur “hari 1–20” di bawah adalah **pola historis / rencana**; jangan dibaca sebagai jadwal event tetap engine v4 (`eventPlan` per `runId`).

Mock frontend + mock HTTP narrative server untuk menguji engine Developer 1.

**Bukan** UI produk dan **bukan** backend produksi. Diganti nanti oleh implementasi Developer 2 / 3.

## Menjalankan

### Yang tersedia di repo (terverifikasi dari `package.json`)

```bash
npm run play        # Vite try UI
npm run test:engine # suite tests/game-engine
npm run typecheck
```

### Script yang disebut dokumen lama (belum ada di root package.json)

```bash
# Terminal A — mock backend (loopback) — SCRIPT BELUM TERDAFTAR
npm run mock-server
# http://127.0.0.1:8787

# Terminal B — harness UI — SCRIPT BELUM TERDAFTAR
npm run harness
# http://127.0.0.1:5173/
```

Jika script/folder di atas ditambahkan kembali, gunakan tabel alamat berikut.

| Layanan | Alamat |
|---|---|
| Harness UI | http://127.0.0.1:5173/ |
| Mock API | http://127.0.0.1:8787 |
| Health | `GET http://127.0.0.1:8787/api/health` |
| Generate event | `POST http://127.0.0.1:8787/api/events/generate` |

Vite mem-proxy `/api` → `:8787`, jadi browser cukup memanggil `/api/...` (bila proxy dikonfigurasi).

## Endpoints mock (kontrak target)

### `GET /api/health`

Status server + daftar package id terpercaya.

### `POST /api/events/generate`

Body minimum (contoh historis; `eventId`/`packageId` aktual harus dari `state.eventPlan` / paket `src/game/eventPackages.ts`):

```json
{
  "runId": "run-1",
  "eventId": "d1-scouts-a",
  "day": 3,
  "packageId": "d1-scouts-a",
  "city": { "gold": 128, "hp": 150, "wallLevel": 0, "troopLevel": 0, "cityLevel": 0 },
  "failureMode": "normal"
}
```

Respons sukses hanya narasi + label pilihan. **Efek dan biaya tetap dari paket lokal engine**. Server tidak menghitung ekonomi/battle.

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
- Muat tidak memanggil ulang battle — state tersimpan dipakai apa adanya
- Save `version !== 4` atau JSON rusak → error ditampilkan; save lama **tidak** dihapus diam-diam

## Fixture debug

Dropdown fixture adalah alat debug, bukan jalur normal. Fixture harus konsisten dengan fase/hari v4 (bukan hanya wave 1/2 era 20-hari). Jalur pengujian penuh tetap melalui aksi engine.

## Memainkan campaign (jalur normal engine v4)

1. Pastikan try UI / harness jalan dengan state v4.
2. **Permainan baru** (`createInitialState` + difficulty).
3. Hari persiapan: Upgrade / Repair (opsional) → **Lanjut hari**. Skip diperbolehkan.
4. Hari event: baca `activeEvent` / `eventPlan` (bukan hari tetap 3/7/13/17) → pilih opsi → lanjut.
5. Hari kelipatan 10: **Mulai battle** → **Lanjut laporan**.
6. Setelah wave 1–9: pilih **satu reward** dari trio wave itu → lanjut.
7. Wave 10 menang → **victory** (tanpa reward).

Refresh setelah battle/reward tersimpan tidak menghitung damage/bonus lagi.

## Scripts terkait engine

```bash
npm run play
npm run test:engine
npm run typecheck
# lint: ada di app/ (npm run lint), bukan root
```

## Catatan integrasi

- Engine tetap murni di `src/game` — tanpa React/fetch/localStorage.
- Narasi AI/mock hanya overlay; biaya/efek dari paket terpercaya.
- Referensi alur: [`game-engine/GAME_FLOW.md`](./game-engine/GAME_FLOW.md).
