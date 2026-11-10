# Diff summary — playtest iteration vs `development`

> **Historical snapshot.** The "pre-generate 4 narratives" row below is not the current runtime. Current behavior is on-demand full packages: [AI_EVENT_RUNTIME.md](../../app/docs/AI_EVENT_RUNTIME.md).

**Baseline:** `origin/development` @ `d84f600`  
**Compared:** local working tree (modified + untracked)  
**Rough size:** ~33 tracked files changed (+1224 / −356) + ~10 untracked files (~980 LOC baru)

## 1. Apa yang berubah (ringkas)

| Area | Sebelum (`development`) | Sekarang (working tree) |
|---|---|---|
| Bahasa konten game | Event/reward/wave & banyak UI string Indonesia | English (fixture + UI play + harness) |
| Event packages | 1 paket tetap per hari (3/7/13/17) | **Pool 2 paket/hari**; run memilih via `eventPlan` ber-seed `runId` |
| Narasi AI | Generate **on-demand** saat `activeEvent` baru muncul | **Pre-generate 4 narasi** saat create run / New Game; dipakai ulang di hari event |
| AI provider | OpenAI-centric di satu modul | Shared prompt + adapter **OpenAI & Gemini** (`AI_PROVIDER`) |
| Prompt AI | Indonesian / “Tuanku” | English / “my lord” |
| `/play` | Layout mock hampir statis di `page.tsx` | `PlayClient` wired ke engine lokal + auto + event prep |
| Reward UI | Label nama saja | Label + **detail efek** (gold / income / discount) |
| GameState | Tanpa `eventPlan` | `eventPlan: EventPlanEntry[]` (tetap `version: 3`) |
| Run document | Tanpa prepared narratives | `preparedEventNarratives?` di `game_runs` |

## 2. File utama (per peran)

### Game engine (`src/game`)

| File | Status | Isi perubahan |
|---|---|---|
| `config.ts` | modified | English copy; 8 event packages (2×4 hari); helper pool |
| `types.ts` | modified | `EventPlanEntry`, `eventPlan` di state |
| `eventPlan.ts` | **new** | `pickEventPlan`, `resolveEventPackage`, hash seed |
| `narrative.ts` | **new** | `decorateActiveEvent` murni (tanpa AI SDK) |
| `initialState.ts` | modified | isi `eventPlan` dari `runId` |
| `events.ts` / `transitions.ts` / `calendar.ts` | modified | resolve paket via plan |
| `index.ts` | modified | export plan/narrative helpers |
| `game.test.ts` | modified | choice id dinamis; uji determinisme plan |
| `src/ui/main.ts` | modified | harness UI English |

### Backend (`app/server`)

| File | Status | Isi perubahan |
|---|---|---|
| `ai/event-narrative.ts` | modified | orchestrator + `prepareRunEventNarratives` |
| `ai/event-narrative-types.ts` | **new** | schema + system prompt shared |
| `ai/openai-event-narrative.ts` | **new** | adapter OpenAI |
| `ai/gemini-event-narrative.ts` | **new** | adapter Gemini |
| `game/service.ts` | modified | pre-gen di `createRun`; pakai prepared di action |
| `game/repository.ts` | modified | `savePreparedEventNarratives` |
| `game/types.ts` | modified | `PreparedEventNarrativeDocument` |
| `game-engine/adapter.ts` | modified | `normalizeGameState` backfill `eventPlan` |
| `config/env.ts` | modified | Gemini + `AI_PROVIDER` |
| docs AI / Postman / env | modified | kontrak pre-gen + choice id dinamis |

### Frontend (`app/app`, `app/components`, `app/lib`)

| File | Status | Isi perubahan |
|---|---|---|
| `app/play/PlayClient.tsx` | **new** | play loop engine + auto + reward detail + prep narratives |
| `app/play/prepareEventNarratives.ts` | **new** | Server Action wrap `prepareRunEventNarratives` |
| `app/play/page.tsx` | modified | Suspense → `PlayClient` |
| `components/AdvisorBriefing.tsx` | **new** | panel event |
| `components/TopBar.tsx` / `Actions.tsx` | modified | English auto/controls; reward layout |
| `lib/autoRun.ts` | **new** | port auto-run ke app |

## 3. Breaking / kontrak yang perlu disadari tim

1. **Choice / event IDs berubah**  
   Contoh lama: `event-day-3`, `day3-skip`.  
   Baru: `event-day-3-scouts` / `event-day-3-envoy`, `day3-scouts-skip`, dll.  
   Postman/campaign **harus** ambil `choiceId` dari `game.eventNarrative.choices`.

2. **`GameState.eventPlan` wajib untuk run baru**  
   Save lama tanpa field di-backfill di adapter lewat `pickEventPlan(runId)`.

3. **`createRun` lebih lambat**  
   Menunggu hingga 4 panggilan AI (dengan fallback). Timeout client create-run perlu longgar.

4. **`/play` ≠ API produk**  
   PlayClient masih engine-in-browser + Server Action; belum auth/`POST /api/runs`.

## 4. Verifikasi yang sudah dijalankan

| Check | Hasil |
|---|---|
| `npm test` (root, `src/game` + `src/ui`) | 21 passed |
| `npm run typecheck` (app) | pass |
| App Vitest suites | masih flaky/pre-existing runner issue — jangan dianggap hijau |

## 5. Bug / gap playtest yang terlihat di sesi ini

| Prioritas | Gap |
|---|---|
| P0 | Server Action prepare gagal lewat **Dev Tunnel** (`x-forwarded-host` ≠ `origin`) → narasi AI tidak ter-generate di `/play` |
| P1 | `/play` tidak persist ke Mongo / tidak pakai auth run API |
| P1 | City Record masih `mockRun.city` (data palsu) |
| P2 | Battle report UI belum menampilkan log ronde dengan jelas |
| P2 | Indikator AI vs fallback kurang terlihat di UI |
| P3 | Balancing masih angka uji; Vitest app perlu diperbaiki |

Rincian perbaikan per peran ada di PRD masing-masing.
