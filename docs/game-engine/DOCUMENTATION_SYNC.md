# Inventaris dan Sinkronisasi Dokumentasi

Inventaris Markdown proyek yang diperiksa saat pembuatan hub `docs/game-engine/`.  
**Kondisi git awal (sebelum pekerjaan docs):** working tree relatif bersih kecuali untracked `.scratch/development-verification/` dan `tests/game-engine/reports/development-f106150/`; HEAD sekitar `278172d`.  
**Batasan pekerjaan:** hanya Markdown; tidak mengubah kode engine/FE/BE.

Kategori:

1. Dokumentasi aktif terkait engine  
2. Dokumentasi integrasi FE/BE  
3. PRD/MVP dan spesifikasi produk  
4. Laporan pengujian atau catatan historis  
5. Instruksi agent  
6. Tidak berkaitan dengan engine  

Tindakan: **diperbarui** · **ditautkan** · **dipertahankan historis** · **tidak relevan**

---

## Referensi utama per topik

| Topik | Rujukan aktif |
|---|---|
| Ringkasan engine | [README.md](./README.md) |
| Modul / state | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Angka config / wave / difficulty | [CONFIGURATION.md](./CONFIGURATION.md) |
| Fase & transisi | [GAME_FLOW.md](./GAME_FLOW.md) |
| Ekonomi & battle | [ECONOMY_AND_COMBAT.md](./ECONOMY_AND_COMBAT.md) |
| Event & reward | [EVENTS_AND_REWARDS.md](./EVENTS_AND_REWARDS.md) |
| API publik | [API_AND_INTEGRATION.md](./API_AND_INTEGRATION.md) |
| Tes & konflik | [TESTING_AND_LIMITATIONS.md](./TESTING_AND_LIMITATIONS.md) |
| Kontrak ringkas | [`../DEV1_CONTRACT.md`](../DEV1_CONTRACT.md), [`../CAMPAIGN_100_DAY_CONTRACT.md`](../CAMPAIGN_100_DAY_CONTRACT.md) |

---

## A. Hub baru `docs/game-engine/`

| Path | Kategori | Tindakan | Alasan |
|---|---|---|---|
| `docs/game-engine/README.md` | 1 | dibuat | Index hub |
| `docs/game-engine/ARCHITECTURE.md` | 1 | dibuat | Peta modul |
| `docs/game-engine/CONFIGURATION.md` | 1 | dibuat | Parameter & wave |
| `docs/game-engine/GAME_FLOW.md` | 1 | dibuat | Fase & alur |
| `docs/game-engine/ECONOMY_AND_COMBAT.md` | 1 | dibuat | Ekonomi & battle |
| `docs/game-engine/EVENTS_AND_REWARDS.md` | 1 | dibuat | EventPlan & reward |
| `docs/game-engine/API_AND_INTEGRATION.md` | 1 | dibuat | API & gap FE/BE |
| `docs/game-engine/TESTING_AND_LIMITATIONS.md` | 1 | dibuat | Tes & konflik |
| `docs/game-engine/DOCUMENTATION_SYNC.md` | 1 | dibuat | Inventaris ini |

---

## B. Kontrak & docs engine aktif

| Path | Kategori | Bagian terkait engine | Tindakan | Alasan |
|---|---|---|---|---|
| `docs/DEV1_CONTRACT.md` | 1 | Schema v4, API, error | diperbarui + ditautkan | Link hub; catatan ruleset id v2 vs app v3 |
| `docs/CAMPAIGN_100_DAY_CONTRACT.md` | 1/2 | Wire 100-hari | diperbarui + ditautkan | Soften klaim “FE/BE belum”; link hub |
| `docs/FOR_FRONTEND.md` | 2 | Wire UI | ditautkan | Link hub/API |
| `docs/FOR_BACKEND.md` | 2 | Wire API | ditautkan | Link hub/API |
| `docs/ENGINE_TO_FE_CONTRACT.md` | 2 | Label/harga event | ditautkan | Link API |
| `docs/ENGINE_TO_BE_CONTRACT.md` | 2 | Consequence trust | ditautkan | Link API |
| `docs/GAME_ENGINE_PATCH_HISTORY.md` | 1/4 | Riwayat patch | diperbarui | Catatan historis §12 repair 35/45; ruleset v3 |
| `docs/HARNESS.md` | 1 | Harness mock | diperbarui | Align v4; script `mock-server`/`harness` tidak ada di package.json |
| `Patch.md` | 1/2 | Checklist v3→v4 | ditautkan | Link hub |

---

## C. Root onboarding / PRD

| Path | Kategori | Tindakan | Alasan |
|---|---|---|---|
| `README.md` | 3 | diperbarui | Entry mengarah ke engine v4; keputusan angka diselaraskan |
| `PRD.md` | 3 | diperbarui (banner) | Pertahankan isi 20-hari; bedakan implemented vs tertulis |
| `MVP.md` | 3 | diperbarui (banner + status engine) | Pertahankan lingkup tertulis 20-hari |
| `AGENTS.md` | 5 | diperbarui (banner konflik) | Persyaratan tidak dihapus; arahkan ke hub |

---

## D. Database

| Path | Kategori | Tindakan | Alasan |
|---|---|---|---|
| `docs/database/README.md` | 2 | diperbarui | version 4 + field baru |
| `docs/database/Database_proposal.md` | 2/3 | diperbarui (banner + baris state) | Teks 20-hari/v3 usang vs engine |
| `docs/database/FLOW_DATABASE.md` | 2 | diperbarui (banner) | Event days tetap masih di diagram alur |

Konflik tersisa: diagram draw.io / langkah “hari 3,7,13,17” belum diganti isi penuh — perlu keputusan/kerja schema terpisah.

---

## E. Plans

| Path | Kategori | Tindakan | Alasan |
|---|---|---|---|
| `plans/README.md` | 3/4 | diperbarui | Index status historis |
| `plans/game-engine-modules.md` | 1/4 | diperbarui (banner) | Digantikan ARCHITECTURE |
| `plans/split-three-upgrades.md` | 4 | dipertahankan historis | Cap 5 / biaya lama |
| `plans/feature-freeze-playtest.md` | 4 | dipertahankan historis | Asumsi 20-hari |
| `plans/auto-run-20-dan-50.md` | 4 | dipertahankan historis | Digantikan arah 100-hari |
| `plans/roadmap-diskusi-tim.md` | 4 | dipertahankan historis | Asumsi jadwal lama |

---

## F. Playtest handoff

| Path | Kategori | Tindakan | Alasan |
|---|---|---|---|
| `docs/playtest/README.md` | 4 | diperbarui (banner historis) | Snapshot vs `d84f600` |
| `docs/playtest/DIFF_SUMMARY.md` | 4 | dipertahankan historis | — |
| `docs/playtest/PRD_GAME_ENGINE.md` | 4 | dipertahankan historis | 20-hari |
| `docs/playtest/PRD_BACKEND.md` | 4 | dipertahankan historis | — |
| `docs/playtest/PRD_FRONTEND.md` | 4 | dipertahankan historis | — |

---

## G. App docs

| Path | Kategori | Tindakan | Alasan |
|---|---|---|---|
| `app/docs/API_CONTRACT.md` | 2 | diperbarui | Error `UNSUPPORTED_STATE_VERSION` → versi 4 |
| `app/docs/ENGINE_V4_BACKEND_INTEGRATION.md` | 2 | ditautkan (via kontrak) | Sudah v4; tidak diedit isi penuh |
| `app/docs/BACKEND_IMPLEMENTATION_PLAN.md` | 2 | tidak relevan untuk rewrite | Sudah arah 100-hari |
| `app/docs/TEST_PLAN.md` | 2 | tidak diubah isi | Sudah sebut day 100 / repair 25/60 |
| `app/docs/DATABASE_SCHEMA_V3.md` | 2 | dipertahankan nama; isi cek manual | Filename legacy |
| `app/docs/BACKEND_ACTION_LOG.md` | 4 | dipertahankan historis | Diary |
| `app/docs/BACKEND_REMEDIATION_PLAN.md` | 4 | dipertahankan historis | Era v3 |
| `app/docs/AI_EVENT_RUNTIME.md` | 2 | tidak diubah | Narasi v4 |
| `app/docs/FRONTEND_POSTMAN_SIMULATION_GUIDE.md` | 2 | tidak diubah | 100-day |
| `app/docs/SURRENDER_BACKEND_PLAN.md` | 2 | tidak relevan rewrite | Length-agnostic |
| `app/docs/TIMELINE_BACKEND_PLAN.md` | 2 | tidak relevan rewrite | — |
| `app/docs/AUTH_SESSION_SPEC.md` | 6 | tidak relevan | Auth |
| `app/docs/ENVIRONMENT_AND_DEPLOYMENT.md` | 6 | tidak relevan | Ops |
| `app/README.md` | 3/6 | tidak diubah | Product app |
| `app/AGENTS.md` | 5 | tidak relevan | Next.js boilerplate |
| `app/components/assets/README.md` | 6 | tidak relevan | Assets |

---

## H. Instruksi agent meta

| Path | Kategori | Tindakan | Alasan |
|---|---|---|---|
| `AGENTS.md` | 5 | diperbarui (banner) | Konflik eksplisit |
| `docs/agents/domain.md` | 5 | tidak relevan rewrite | Generik |
| `docs/agents/issue-tracker.md` | 5 | tidak relevan | Proses tiket |
| `docs/agents/triage-labels.md` | 5 | tidak relevan | Label |

---

## I. Tes / laporan

| Path | Kategori | Tindakan | Alasan |
|---|---|---|---|
| `src/game/game.test.ts` | (kode) | tidak diubah | Bukti perilaku |
| `tests/game-engine/reports/**` | 4 | dipertahankan historis | Untracked reports; angka historis |
| `.scratch/development-verification/tests/game-engine/**` | 4 | dipertahankan historis | Mirror scratch; tidak diedit |

Catatan: suite lengkap `tests/game-engine/unit|integration|docs` **tidak** terlihat sebagai tree terlacak saat inventarisasi akhir; banyak salinan ada di `.scratch/development-verification/`.

---

## J. `.scratch` spek engine

| Path | Kategori | Tindakan | Alasan |
|---|---|---|---|
| `.scratch/game-engine-prototype/**` | 4 | dipertahankan historis | 20-hari |
| `.scratch/split-three-upgrades/**` | 4 | dipertahankan historis | Cap 5 |
| `.scratch/pengamanan-transisi-hari/**` | 4 | dipertahankan historis | 20-hari |
| `.scratch/kalender-manual-auto/**` | 4 | dipertahankan historis | Auto 20→50 |
| `.scratch/engine-validation-patch/**` | 4 | dipertahankan historis | — |
| `.scratch/surrender-action/**` | 6/2 | tidak relevan rewrite | API surrender |
| `.scratch/game-runs-timeline/**` | 6/2 | tidak relevan rewrite | Timeline |

---

## K. Konflik yang ditemukan

### Sudah dijelaskan di dokumentasi

1. AGENTS/PRD/MVP (20-hari, cap 5, event tetap, v3) vs kode (100-hari, cap 18, eventPlan, v4).  
2. Repair §12 historis 35/45 vs aktif 25/60 (§15 / `config.ts`).  
3. Ruleset id `…-v2` di beberapa kontrak vs app `…-v3`.  
4. HARNESS script/folder tidak ada di package.json saat ini.  
5. Helper legacy `scheduledEventDays` / `eventPackagesForDay` selalu kosong.  
6. Odd behaviors diskon/surrender/`chooseReward` hardcode 10 (lihat TESTING_AND_LIMITATIONS).

### Masih perlu keputusan tim

1. Apakah `AGENTS.md` / `PRD.md` / `MVP.md` diganti formal ke 100-hari, atau 20-hari tetap sebagai cakupan demo produk?  
2. Apakah diagram/schema database di-update penuh ke field v4 (`rewardsChosenByWave`, `pendingConsequences`, `difficulty`)?  
3. Apakah suite `tests/game-engine` dipulihkan ke tree utama atau tetap di scratch?  
4. Apakah harness mock (`npm run mock-server` / `harness`) dikembalikan atau diganti sepenuhnya oleh `npm run play` + app?

---

## L. Verifikasi yang dilakukan (faktual)

| Pemeriksaan | Hasil |
|---|---|
| Baca `src/game/config.ts`, `difficulty.ts`, `index.ts`, `types.ts`, modul alur utama | Dilakukan |
| Hitung ulang skala monster easy/hard + contoh battle 6 ronde | Dilakukan via Node |
| Cocokkan export publik `index.ts` dengan API doc | Dilakukan |
| Inventaris glob `**/*.md` (≈100+ file proyek; exclude node_modules/.git/.next) | Dilakukan |
| `git status` — hanya Markdown yang dimodifikasi untuk tugas ini (+ hub baru); untracked scratch/reports milik rekan/lingkungan tidak diubah isinya | Dilakukan di akhir pekerjaan |
| `npm run test` / `test:engine` / simulasi balance baru | **Tidak dijalankan** (di luar lingkup docs; hindari klaim lulus) |
| Humanizer skill | Tersedia; dipakai sebagai panduan gaya, bukan rewrite agresif seluruh corpus |

---

## M. Ringkasan hitungan (perkiraan inventaris)

| Metrik | Jumlah (perkiraan) |
|---|---:|
| Markdown diperiksa (cakupan proyek, excl. dependency/vendor) | ~100+ |
| Dibuat baru (`docs/game-engine/*`) | 9 |
| Diperbarui (banner/link/koreksi aktif) | ~20 |
| Dipertahankan historis (dengan atau tanpa banner) | ~40+ |
| Tidak relevan / dibiarkan utuh | ~30+ |

Angka eksak bergantung apakah salinan `.scratch/development-verification/**` dihitung terpisah (ya, diperiksa sebagai historis/mirror, tidak diedit).
