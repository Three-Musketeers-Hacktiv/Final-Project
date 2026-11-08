# Backend Surrender Action Plan

Status: **Approved plan; implementation pending**
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

## 3. Implementation steps

1. Import engine `surrender` in the backend adapter.
2. Add `surrender` to `EngineGameAction` and dispatch it through `applyGameAction`.
3. Add a strict public schema variant with `payload: {}`.
4. Add `surrender` to persisted `GameActionType` and shared API contract types.
5. Reuse the existing generic final-state service/repository flow; do not add separate gameplay or pointer logic.
6. Add adapter/schema regression tests.
7. Add an API smoke flow proving state persistence, pointer clearing, history behavior, and rejection after the run ends.

## 4. Error and idempotency behavior

- Non-empty surrender payload → `400 VALIDATION_ERROR`.
- Stale revision → `409 STALE_REVISION`.
- Reused action ID with the same request → `409 DUPLICATE_ACTION`.
- Reused action ID with another payload/type → `409 ACTION_PAYLOAD_CONFLICT`.
- Surrender/action after the run ended → `409 GAME_ENDED`.
- Inactive/replaced run → `409 SAVE_POINTER_MISMATCH`.

Rejected actions do not increment revision or create a successful action record.

## 5. Verification and commits

Planned commits:

1. `docs(backend): define surrender action contract`
2. `feat(game): expose surrender through backend actions`
3. `test(api): verify surrender finalization flow`
4. `docs(backend): finalize surrender handoff`

Required checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:surrender
```

The database smoke runs only against the configured development/test database. Push remains manual.
