# Backend Remediation Plan — Engine Patch Alignment

Status: **Implemented and verified**
Owner: Backend (Dev 3)
Updated: 2026-11-08
Baseline: `development` commit `eb9321c`, game-engine patch `3c14d24`

## 1. Objective

Align the production backend with the latest read-only game engine without changing frontend or engine source. The engine remains the only source of gameplay rules. Backend owns authentication, authorization, persistence, concurrency, event narrative generation, database indexes, and HTTP contracts.

This plan incorporates `BACKEND_REMEDIATION_CONTRACT.md` supplied by the backend owner and the repository audit performed after the engine patch was merged.

## 2. Locked decisions

| Area | Decision |
|---|---|
| Engine source | `src/game/**` is read-only for backend work |
| Frontend source | `app/components/**`, `app/app/(game)/**`, `app/lib/**`, and `app/proxy.ts` are not modified by backend work |
| State | Only `GameState.version === 3`; patched state must also contain a valid `eventPlan` |
| Event packages | One deterministic package per event day, selected by engine `eventPlan` from `runId` |
| Choice IDs | Dynamic; clients and tests read IDs from `activeEvent.choices` / `eventNarrative.choices` |
| Narrative timing | On-demand when an action first enters a new event day |
| Prepared narratives | Out of scope; no four-event generation during create-run |
| AI default | Google Gemini |
| Alternative provider | May be added behind server environment configuration and the same generator interface |
| AI language | English (`en-US`) |
| AI voice | Loyal city advisor addressing “my lord” |
| AI authority | Title, description, and choice labels only |
| Gameplay authority | Costs, effects, event plan, economy, battle, and rewards remain engine-owned |
| Persistence source | `"ai" | "fallback" | "mock"`; transient engine `"local"` is not persisted as narrative source |
| Database IDs | MongoDB `_id` and references use `ObjectId`; engine/API `runId` remains a string |
| Git | Feature commits use the developer’s configured identity; push remains manual |

## 3. Scope

### Backend-owned files

- `app/server/game/**`
- `app/server/game-engine/**`
- `app/server/db/**`
- `app/server/ai/**`
- `app/server/config/**`
- `app/app/api/**`
- `app/contracts/**` when the public API type changes
- `app/scripts/**`, `app/postman/**`, and backend tests
- `app/.env.example`, `app/package.json`, and lockfile when backend dependencies change
- `app/docs/**`

### Excluded files

- `src/game/**` and `src/ui/**`
- root `docs/**`
- `app/components/**`
- `app/app/(game)/**`
- `app/lib/**` and `app/proxy.ts`

New error codes will be documented for the frontend developer. Backend will not edit frontend error-message mapping without explicit cross-owner approval.

## 4. Engine patch impact

New runs created through `createInitialState({ runId })` receive:

- `version: 3`;
- `revision: 0`;
- `eventPlan` with one package for days 3, 7, 13, and 17;
- English trusted event fixtures;
- dynamic event and choice IDs.

Backend persists the complete state unchanged. It must not hardcode legacy IDs such as `event-day-3`, `day3-skip`, or `day17-pay`.

The patch changed the state shape and `gameConfig` while retaining state version 3. Therefore version checking alone cannot establish compatibility with saves created before the patch.

## 5. Remediation tickets

### BE-R00 — Ruleset and patched-v3 compatibility (P0) — Completed

Problem:

- Old and patched states both report `version: 3`, but old states lack `eventPlan` and can contain removed event IDs.
- The current ruleset ID remains `prototype-v3` even though the config fingerprint changed.
- Existing ruleset documents are inserted with `$setOnInsert`, so a changed fingerprint can be silently associated with old metadata.

Target:

1. Introduce a new immutable ruleset identity for the event-plan engine revision.
2. Reject an existing ruleset ID whose stored fingerprint differs from the engine fingerprint.
3. Validate that patched v3 state contains a valid deterministic event plan.
4. Do not silently reinterpret an active legacy event using a new package.
5. Decide separately whether development data is reset or old runs remain read-only. No destructive migration runs automatically.

### BE-R01 — Load consistency (P0) — Completed

All load paths use one shared validator.

- `state.version !== 3` → `UNSUPPORTED_STATE_VERSION`
- `state.runId !== run._id.toHexString()` → `RUN_INTEGRITY_ERROR`
- current-save run or revision does not match the user pointer → `SAVE_POINTER_MISMATCH`
- missing/invalid patched `eventPlan` or incompatible ruleset → controlled compatibility error

The validator applies to current-run load, run-by-ID load, create-run replay, and action load. Backend does not rebuild state from action/property history.

### BE-R02 — Action idempotency and payload hash (P1) — Completed

- Same `actionId` and same `{ type, payload }` hash → `DUPLICATE_ACTION`.
- Same `actionId` and different hash → `ACTION_PAYLOAD_CONFLICT`.
- The same distinction is applied after transaction races/unique-index failures.
- Successful actions continue storing `payloadHash`.

Full successful-response replay is out of scope.

### BE-R03 — Database indexes and schema sync (P1) — Completed

Add idempotent indexes:

| Collection | Keys |
|---|---|
| `game_actions` | `{ gameRunId: 1, createdAt: 1 }` |
| `game_properties` | `{ gameActionId: 1 }` |
| `runs_event` | `{ gameRunId: 1, day: 1 }` |
| `event_data` | `{ gameRulesetId: 1, packageId: 1, day: 1, createdAt: -1 }` |

The new `event_data` index uses a new name so it can be created before the old index is removed deliberately. Index migration must not delete data.

The `auth_rate_limits` schema documentation uses `key` and `windowStart`, matching code.

### BE-R04 — Persisted literals and event source (P2) — Completed

- Event day: `3 | 7 | 13 | 17`
- Battle report day: `10 | 20`
- Persisted narrative source: `"ai" | "fallback" | "mock"`
- Engine `activeEvent.source === "local"` remains valid only as transient state before decoration.
- Runtime guards narrow engine `number` values before database writes; type casts alone are insufficient.

### BE-R05 — API/docs/error surface (P2) — Completed for backend handoff

Expose and document:

- `UNSUPPORTED_STATE_VERSION`
- `RUN_INTEGRITY_ERROR`
- `SAVE_POINTER_MISMATCH`
- `ACTION_PAYLOAD_CONFLICT`
- active-run error selected during implementation (`RUN_NOT_ACTIVE` or the pointer mismatch code)

The response envelope and contract version remain unchanged. Frontend mapping is handed off to the frontend owner.

### BE-R06 — Gemini runtime and English advisor prompt (P0) — Completed

Replace the active OpenAI-only runtime with a provider interface whose default implementation is Gemini.

Required environment family:

- `AI_PROVIDER=gemini`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- generic `AI_TIMEOUT_MS`, `AI_MAX_RETRIES`, `AI_MAX_OUTPUT_TOKENS`, and `AI_PROMPT_VERSION`
- optional `AI_API_KEY` / `AI_MODEL` only when another supported provider adapter exists

Prompt meaning:

> Provide the narrative and choices as if an advisor is recommending options to his lord, using English.

The request includes `locale: "en-US"`, day, event ID, package ID, original trusted copy, and trusted choice summaries. Every choice ID must be preserved. The provider cannot invent choices, costs, effects, or gameplay rules.

Provider/key absence, timeout, network error, refusal, invalid schema, or untrusted IDs falls back to the engine event copy. Provider work remains outside MongoDB transactions.

### BE-R07 — Active-save pointer race (P1) — Completed

Only the active run may receive gameplay actions. An abandoned run remains readable but cannot reclaim the current-save pointer.

User pointer updates are conditional on both `gameRunId` and `savedRevision`. Ending a run clears the pointer only if it still points to that run. A pointer mismatch rolls back the transaction.

### BE-R08 — Dynamic campaign and Postman flow (P0) — Completed

The campaign runner and manual guide read event choice IDs from the API response. They never send legacy hardcoded IDs. The full campaign remains 42 successful actions and ends at victory when using the documented strategy.

## 6. Implementation order and commits

1. `173f07d feat(ai): add configurable gemini narrative runtime` — BE-R06
2. `c76521c fix(backend): validate patched engine saves and rulesets` — BE-R00 + BE-R01
3. `2331d9e fix(game): harden active run pointer and action idempotency` — BE-R02 + BE-R07
4. `1463d13 fix(database): align indexes and persisted game literals` — BE-R03 + BE-R04
5. `cf80172 test(campaign): support dynamic engine event plans` — BE-R08
6. `docs(backend): finalize remediation contracts` — BE-R05 and final action log

Each commit was created after its relevant tests passed. No automatic push was performed.

## 7. Required tests

- Patched new state has four valid plan entries.
- Legacy/incompatible state cannot enter the patched engine silently.
- Load rejects version, run ID, ruleset, and pointer drift.
- Same action ID distinguishes identical and conflicting payloads.
- Replaced run cannot reclaim or clear the active pointer.
- Index initialization is repeatable on a test database.
- Persisted event/report days and sources pass runtime guards.
- Gemini valid output decorates narrative only.
- Gemini invalid IDs/schema/provider error uses fallback.
- On-demand generation occurs once for the committed event transition.
- Campaign reads dynamic choice IDs and completes days 1–20.

## 8. Release gate

Run from `app/`:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:indexes
npm run test:campaign
```

All gates passed on 2026-11-08. The first sandboxed build attempt could not fetch frontend Google Fonts; the approved network-enabled build passed. `db:indexes` and the 42-action campaign passed against the configured development database. Final review confirms no changes under engine, frontend, or root documentation paths.
