# Game Engine — Fantasy City Defense

Referensi utama untuk perilaku **implementasi saat ini** di [`src/game`](../../src/game).  
Engine adalah TypeScript murni: tidak menyentuh React, DOM, `fetch`, `localStorage`, timer, atau `process.env`.

## Ringkasan permainan

Pemain berperan sebagai lord yang mempertahankan satu kota fantasy selama **100 hari**. Setiap hari kelipatan 10 ada **battle** melawan satu monster (total **10 wave**). Di antara battle, pemain mengumpulkan gold, melakukan paling banyak **satu aksi ekonomi** per hari persiapan, menyelesaikan event (termasuk consequence), lalu memilih reward setelah wave 1–9. Wave 10 menang = `victory`; HP kota mencapai 0 = `gameOver`.

| Aspek | Nilai aktif |
|---|---|
| Kalender | Hari 1–100 |
| Battle | Hari 10, 20, …, 100 |
| Upgrade | Tiga jalur: `wall`, `troops`, `city` (maks level **18** masing-masing) |
| Difficulty | `easy` \| `normal` \| `hard` |
| Save | `GameState.version === 4` (`GAME_STATE_VERSION`) |
| Event | Rencana per `runId` (`eventPlan`, 20 entri); pilihan 2–4; consequence tertunda |

## Ruang lingkup

| Tanggung jawab engine | Di luar engine (FE / BE / harness) |
|---|---|
| Aturan kalender, ekonomi, battle, event, reward, transisi | UI produk, animasi, timer 5 detik |
| State JSON-serializable + `ActionResult` | Persistensi MongoDB / auth |
| Paket efek terpercaya + validasi pilihan | Generasi narasi AI |
| Selector stat / biaya / preview wave | Proxy HTTP, API key, env |
| | Storage debug harness |

Kontrak ringkas untuk integrasi tetap di [`../DEV1_CONTRACT.md`](../DEV1_CONTRACT.md) dan [`../CAMPAIGN_100_DAY_CONTRACT.md`](../CAMPAIGN_100_DAY_CONTRACT.md). Dokumen di folder ini menjelaskan perilaku secara lengkap.

## Panduan membaca

- **Nonteknis / presentasi:** mulai dari bagian ini → [GAME_FLOW.md](./GAME_FLOW.md) → tabel wave di [CONFIGURATION.md](./CONFIGURATION.md).
- **Integrasi FE/BE:** [API_AND_INTEGRATION.md](./API_AND_INTEGRATION.md) lalu kontrak di `docs/FOR_*.md` dan `docs/ENGINE_TO_*.md`.
- **Balancing / config:** [CONFIGURATION.md](./CONFIGURATION.md) + [ECONOMY_AND_COMBAT.md](./ECONOMY_AND_COMBAT.md).
- **Event & reward:** [EVENTS_AND_REWARDS.md](./EVENTS_AND_REWARDS.md).
- **Tes & batasan:** [TESTING_AND_LIMITATIONS.md](./TESTING_AND_LIMITATIONS.md).
- **Inventaris sinkronisasi Markdown:** [DOCUMENTATION_SYNC.md](./DOCUMENTATION_SYNC.md).

## Daftar isi

1. [README.md](./README.md) — ringkasan (dokumen ini)
2. [ARCHITECTURE.md](./ARCHITECTURE.md) — modul, state, transaksi atomik
3. [CONFIGURATION.md](./CONFIGURATION.md) — parameter, difficulty, wave, reward
4. [GAME_FLOW.md](./GAME_FLOW.md) — fase, transisi, alur hari
5. [ECONOMY_AND_COMBAT.md](./ECONOMY_AND_COMBAT.md) — income, upgrade, battle
6. [EVENTS_AND_REWARDS.md](./EVENTS_AND_REWARDS.md) — eventPlan, paket, consequence, reward
7. [API_AND_INTEGRATION.md](./API_AND_INTEGRATION.md) — API publik dan kontrak
8. [TESTING_AND_LIMITATIONS.md](./TESTING_AND_LIMITATIONS.md) — peta tes dan konflik
9. [DOCUMENTATION_SYNC.md](./DOCUMENTATION_SYNC.md) — inventaris Markdown

## Istilah penting

| Istilah | Arti |
|---|---|
| Fase (`GamePhase`) | Status alur: `preparation`, `event`, `battleReady`, `battleReport`, `reward`, `gameOver`, `victory` |
| Decade | Segmen 10 hari menuju satu battle (decade 1 = sebelum hari 10, dst.) |
| `eventPlan` | Jadwal event terjadwal per run (bukan hari tetap global) |
| Consequence | Event lanjutan yang dijadwalkan setelah pilihan skip/refuse tertentu |
| Aksi ekonomi | Satu dari `upgradeWall` / `upgradeTroops` / `upgradeCity` / `repairCity` |
| Damage bersamaan | Kedua pihak menghitung damage dari HP awal ronde, lalu menerapkan bersamaan |
| `revision` | Penghitung mutasi sukses; naik 1 tiap aksi yang mengubah state |
| Paket terpercaya | Efek/biaya dari `eventPackages.ts` / `config.ts`, bukan dari respons AI |

## Sumber kebenaran dan konflik

Urutan untuk pertanyaan “apa yang berlaku di kode sekarang?”:

1. Implementasi [`src/game`](../../src/game)
2. Tes di [`tests/game-engine`](../../tests/game-engine) dan `src/game/*.test.ts`
3. Dokumen di folder ini + [`../DEV1_CONTRACT.md`](../DEV1_CONTRACT.md)

[`../../AGENTS.md`](../../AGENTS.md) masih memuat **persyaratan tertulis** prototipe 20 hari / 2 wave / max level 5. Itu **tidak** menghapus persyaratan tersebut secara otomatis, tetapi **perilaku implementasi saat ini** adalah campaign 100 hari. Konflik dicatat di [TESTING_AND_LIMITATIONS.md](./TESTING_AND_LIMITATIONS.md) dan [DOCUMENTATION_SYNC.md](./DOCUMENTATION_SYNC.md).

## Menjalankan pemeriksaan terkait engine

Dari root repository (lihat juga [TESTING_AND_LIMITATIONS.md](./TESTING_AND_LIMITATIONS.md)):

```bash
npm run typecheck
npm run test:engine
npm run play
```

Jangan mengklaim hasil tes lulus tanpa menjalankan perintah di atas pada sesi yang bersangkutan.
