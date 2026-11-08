# Backend Persistent Timeline Plan

Status: **Approved plan; implementation pending**
Owner: Backend
Updated: 2026-11-08
Source: `.scratch/game-runs-timeline/spec.md`, tickets 01–02

## 1. Objective

Persist the player-facing action timeline on `game_runs.timeline` and expose it through every `GameView`, while keeping `GameState` and `src/game/**` unchanged.

Backend owns tickets 01 and 02. Ticket 03 (hydrating the React provider from `game.timeline`) remains frontend-owned and is not implemented here.

## 2. Public contract

```ts
type TimelineCategory = "city" | "battle" | "event";
type TimelineTone = "city" | "gain" | "loss" | "neutral";

type TimelineEntry = {
  id: string;
  day: number;
  category: TimelineCategory;
  tone: TimelineTone;
  icon: TimelineIcon;
  highlight?: string;
  text: string;
};

type GameView = {
  // existing fields
  timeline: TimelineEntry[];
};
```

New runs start with `timeline: []`. Legacy documents without the field are read as an empty array and receive the full field on their next successful action.

## 3. Persistence and authoring

- Timeline is top-level run data, never part of engine `GameState`.
- The backend derives copy from trusted before/after `GameView` snapshots after an engine action succeeds.
- Entry IDs are deterministic: `${actionId}:${index}`.
- Entries use chronological append order, oldest first.
- Timeline is written in the same MongoDB transaction and optimistic revision update as state/action persistence.
- Rejected, invalid, stale, and failed engine actions do not append entries.
- The request body never accepts timeline text, icon, tone, category, or IDs from the client.

## 4. Idempotent retry contract

- Same `actionId`, type, and payload returns `200` with the already-committed action metadata and current persisted `GameView`; no second timeline append occurs.
- Same `actionId` with another type/payload returns `409 ACTION_PAYLOAD_CONFLICT`.
- A transaction race that discovers the same committed action follows the same replay-success behavior.
- Final actions can be replayed after `endedAt`/pointer clearing because ownership is checked from the run before replay resolution.

This replaces the earlier `409 DUPLICATE_ACTION` behavior for an identical request.

## 5. Implementation stages

1. Document the contract, persistence shape, retry behavior, and test matrix.
2. Add timeline types, empty initialization, legacy normalization, and `GameView.timeline`.
3. Add a server-safe timeline author plus transactional append and idempotent replay.
4. Add unit/API smoke coverage for empty, append, failed action, retry, GET persistence, and legacy fallback.
5. Finalize backend/frontend handoff documentation and release checks.

## 6. Ownership boundaries

Allowed backend scope:

- `app/contracts/**`;
- `app/server/game/**` and backend tests;
- backend API runners/package scripts;
- `app/docs/**`.

Read-only/out of scope:

- `src/game/**`, engine rules, and root `docs/**`;
- `app/components/**`, `app/lib/**`, `app/app/(game)/**`, and `app/proxy.ts`;
- `.scratch/game-runs-timeline/issues/03-frontend-hydrate-timeline.md` implementation.

## 7. Planned commits

1. `docs(backend): define persistent timeline contract`
2. `feat(game): expose persisted timeline in game views`
3. `feat(game): append idempotent action timeline`
4. `test(api): verify persistent action timeline`
5. `docs(backend): finalize timeline handoff`

Push remains manual.
