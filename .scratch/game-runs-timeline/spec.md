# Persist Timeline on `game_runs`

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../PRD.md).

Status: ready-for-agent

## Problem Statement

Pemain dan frontend kehilangan riwayat aksi (timeline) setiap kali halaman di-refresh atau save aktif dimuat ulang. Timeline saat ini hanya hidup di memori React (`describeAction` di client); dokumen Mongo `game_runs` dan `GameView` tidak membawa history, sehingga panel Timeline kosong setelah reload meskipun state permainan masih ada.

Frontend meminta timeline dicatat di database agar log aksi tetap tersedia sepanjang umur run.

## Solution

Tambahkan field top-level `timeline` pada dokumen `game_runs`. Backend menghasilkan dan menambahkan entry saat action sukses (logika setara `describeAction` yang sudah dipakai FE), menyimpannya atomik bersama update state, lalu mengekspos array lengkap di `GameView`. Frontend menghidrasi panel Timeline dari server, bukan hanya append lokal.

## User Stories

1. As a player, I want the timeline to survive a page refresh, so that I can still review what happened earlier in the run.
2. As a player, I want a new game to start with an empty timeline, so that old run history does not leak into a new run.
3. As a player, I want each successful upgrade, repair, day advance, event choice, battle, and reward to appear as readable timeline entries, so that the log matches what I did.
4. As a player, I want failed or rejected actions to leave the timeline unchanged, so that errors do not invent fake history.
5. As a player, I want replaying the same `actionId` (network retry) not to duplicate timeline lines, so that the log stays clean.
6. As a frontend developer, I want `GameView.timeline` on create, get-current, get-by-id, and action responses, so that one field hydrates the panel everywhere.
7. As a frontend developer, I want timeline entry shape stable (`id`, `day`, `category`, `tone`, `icon`, optional `highlight`, `text`), so that the existing Timeline UI can render server data without inventing copy.
8. As a frontend developer, I want the server to be the source of truth for entry text and order after each successful action, so that client and server cannot drift.
9. As a backend developer, I want `timeline` stored on `GameRunDocument` (not inside engine `GameState`), so that the pure engine stays free of UI narrative.
10. As a backend developer, I want entry `id` values deterministic from `actionId` and index, so that idempotent commits and tests are stable.
11. As a backend developer, I want append to happen in the same commit transaction as the state revision bump, so that timeline and state cannot diverge.
12. As a backend developer, I want documents missing `timeline` treated as `[]` when read, so that older prototype runs do not require a bulk migration.
13. As a QA engineer, I want automated checks that create returns empty timeline, one success appends once, idempotent replay does not double-append, and GET restores the same array, so that persistence is proven at the API/service seam.
14. As a teammate, I want `DATABASE_SCHEMA_V3` and `API_CONTRACT` updated, so that Developer 2/3 integrate against the written contract.
15. As a product owner, I want no separate history endpoint or AI-authored timeline lines in this feature, so that scope stays a denormalized field on `game_runs`.

## Implementation Decisions

- **Primary test seam:** gameplay service / repository commit path and the public `GameView` returned by create/get/action APIs. Prefer this over private helpers. Secondary seam: FE `GameProvider` hydrating from `game.timeline`.
- **Storage:** top-level field on Mongo collection `game_runs`:

```ts
type TimelineCategory = "city" | "battle" | "event";
type TimelineTone = "city" | "gain" | "loss" | "neutral";

type TimelineEntry = {
  id: string; // required when persisted; `${actionId}:${index}`
  day: number;
  category: TimelineCategory;
  tone: TimelineTone;
  icon: string; // allowed IconName values used by timeline copy
  highlight?: string;
  text: string;
};

type GameRunDocument = {
  // ...existing fields...
  timeline: TimelineEntry[];
};
```

- **Not in engine state:** do not add `timeline` to `GameState` / `src/game`. Engine remains pure rules only.
- **Authoring:** backend generates entries from before/after snapshots after a successful `applyGameAction` (wording and categories aligned with current client `describeAction`). FE must not send timeline payloads on action requests.
- **Shared describe:** move or extract a server-safe describe module (no DOM, no dependency on React icon component modules beyond a string union of icon names). FE may keep a thin re-export or switch to consuming server timeline only after ticket 03.
- **Create run:** insert `timeline: []`.
- **Commit action:** append generated entries in the same transaction that updates `state` / `updatedAt` / `endedAt`. Action failure, validation failure, and stale revision leave `timeline` unchanged.
- **Idempotency:** when an existing `game_actions` row for the same `actionId` causes a replay/no-op success path, do not append again; return the already-persisted timeline.
- **Legacy documents:** if `timeline` is missing/undefined when loading, treat as `[]` in `toGameView` and subsequent commits may `$set` the array.
- **API contract:** extend `GameView` with `timeline: TimelineEntry[]`. Update create, get current, get by id, and action success payloads.
- **Docs:** update `DATABASE_SCHEMA_V3` (`game_runs` section) and `API_CONTRACT` (`GameView`).
- **Ordering:** persisted array is chronological append order (oldest first). FE may reverse for display as today; server stores append order consistently.

## Testing Decisions

- Good tests assert observable API/service behavior: field presence, entry contents derived from real actions, and stability under retry — not private Mongo operator choice.
- Prior art: existing game service/repository tests and action idempotency coverage; FE provider tests if present.
- Required cases: new run → `timeline: []`; successful economy/event/battle/day actions append expected categories; failed action leaves timeline untouched; duplicate `actionId` does not duplicate entries; GET current/run returns the same persisted array after actions; `toGameView` maps missing field to `[]`.
- Do not require browser E2E or live AI for acceptance of tickets 01–02. Ticket 03 may use unit/integration around provider state.

## Out of Scope

- Separate REST history endpoint or pagination of timeline.
- Rebuilding timeline only from `game_actions` without storing `timeline` on `game_runs`.
- AI-generated narrative text inside timeline entries.
- New Timeline panel visuals, filters, or animations.
- Changing engine economy/battle/event rules in `src/game`.
- Bulk migration job for existing Mongo documents.
- Storing timeline inside engine `GameState` or localStorage product save.

## Further Notes

- Feature folder: `.scratch/game-runs-timeline/`.
- Current client reference for copy: `app/lib/timeline.ts` (`describeAction`).
- Current gap: `GameProvider` comment that the API has no history yet; `toGameView` does not include timeline.
- Glossary: run, revision, `actionId`, `GameView`, `game_runs`, phase, wave.
- Related persistence: `game_actions` remains the audit log; `timeline` is the denormalized player-facing log for FE.
