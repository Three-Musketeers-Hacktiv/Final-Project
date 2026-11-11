# Bastionfall — Fantasy City Defense

Pertahankan kota selama 100 hari dari sepuluh wave monster. Pemain memilih upgrade, menangani event dan konsekuensinya, lalu mengambil reward untuk menghadapi wave berikutnya.

| Bagian | Lokasi | Panduan |
|---|---|---|
| Aplikasi Next.js, autentikasi dan save MongoDB | `app/` | [Menjalankan aplikasi](app/README.md) |
| Aturan TypeScript dan simulasi | `src/game/` | [Aturan permainan](PRD.md) dan [kontrak engine](docs/DEV1_CONTRACT.md) |
| UI lokal untuk mencoba engine | `src/ui/` | [Menjalankan UI uji](docs/HARNESS.md) |
| Endpoint dan format respons | `app/app/api/`, `app/server/` | [Kontrak API](app/docs/API_CONTRACT.md) |
| Paket event dan fallback narasi | `src/game/eventPackages.ts`, `app/server/content/` | [Katalog fallback](app/docs/FALLBACK_EVENT_CATALOG.md) |

Engine memakai format save v4. Backend mengikat run ke ruleset `campaign-v4-100-day-v3`. Rencana awal dan tiket implementasi tetap tersedia di `plans/` dan `.scratch/`.
