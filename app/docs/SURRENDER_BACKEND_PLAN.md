# Backend Surrender Action Plan

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../PRD.md).

Status: **Implemented and verified**
Owner: Backend
Updated: 2026-11-08
Engine baseline: `a0cc71b feat(game): implement surrender functionality to end active runs`

## 1. Objective

Expose the engine-owned `surrender(state)` transition through the existing authenticated action endpoint without changing frontend or game-engine source.

`POST /api/runs/:runId/actions` accepts:

```json
{
  "actionId": "UUID",
  "expectedRevision": 12,
  "type": "surrender",
  "payload": {}
}
```

Successful surrender returns `200` with the final `GameView`:

- `state.phase === "gameOver"`;
- revision increases exactly once;
- other gameplay fields are preserved by the engine;
- a successful `game_actions` record is stored;
- `game_runs.endedAt` is set;
- `users.saveGame` is cleared conditionally;
- a `gameOver` history entry is appended.

## 2. Scope and ownership

Backend may change:

- `app/server/game-engine/adapter.ts` and its tests;
- `app/server/game/schemas.ts`, persisted action types, and tests;
- `app/contracts/api.ts`;
- backend API/Postman/test runners when needed;
- `app/docs/**` and backend action log.

Backend must not change:

- `src/game/**` or any game rule;
- `app/components/**`, `app/app/(game)/**`, `app/lib/**`, or `app/proxy.ts`;
- root `docs/**`.

The existing frontend Settings placeholder remains owned by the frontend developer.

## 3. Implemented steps

1. [x] Import engine `surrender` in the backend adapter.
2. [x] Add `surrender` to `EngineGameAction` and dispatch it through `applyGameAction`.
3. [x] Add a strict public schema variant with `payload: {}`.
4. [x] Add `surrender` to persisted `GameActionType` and shared API contract types.
5. [x] Reuse the existing generic final-state service/repository flow; no gameplay calculation was duplicated.
6. [x] Add adapter/schema regression tests.
7. [x] Add an API smoke flow proving state persistence, pointer clearing, and rejection after the run ends.

## 4. Error and idempotency behavior

- Non-empty surrender payload → `400 VALIDATION_ERROR`.
- Stale revision → `409 STALE_REVISION`.
- Reused action ID with the same request → replay `200` without another state/timeline write.
- Reused action ID with another payload/type → `409 ACTION_PAYLOAD_CONFLICT`.
- Surrender/action after the run ended → `409 GAME_ENDED`.
- Inactive/replaced run → `409 SAVE_POINTER_MISMATCH`.

Rejected actions do not increment revision or create a successful action record.

## 5. Verification and commits

Commits:

1. `e0f1093 docs(backend): define surrender action contract`
2. `b90b3e5 feat(game): expose surrender through backend actions`
3. `fb44647 test(api): verify surrender finalization flow`
4. `docs(backend): finalize surrender handoff` (this documentation closeout)

Required checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:surrender
```

Verification result:

- lint passed without warnings;
- typecheck passed;
- 14 test files / 47 tests passed;
- production build passed;
- `test:surrender` passed against the configured development database with final phase `gameOver` and revision `1`;
- no frontend or game-engine source was modified.

The database smoke ran only against the configured development database and retained its test user/run for audit. Push remains manual.
