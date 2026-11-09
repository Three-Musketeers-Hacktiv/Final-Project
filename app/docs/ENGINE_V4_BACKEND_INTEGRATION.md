# Engine V4 Backend Integration

Status: **Active implementation contract**  
Owner: Backend  
Engine source: `../../src/game` and `../../docs/FOR_BACKEND.md` (read-only)  
Last updated: 2026-11-09

## Purpose

This document records the backend changes required by game-engine patch v4. Backend code may consume the engine public API, but must not modify engine or frontend-owned files.

## Locked v4 contract

- Only `GameState.version === 4` is accepted. Saves from versions 1–3 are rejected as incompatible; no implicit migration is performed.
- A run is created with `difficulty: "easy" | "normal" | "hard"`. The selected value is part of the idempotency payload and is persisted inside `GameState`.
- A campaign runs for 100 days with battles on days 10, 20, ..., 100 (waves 1–10).
- `eventPlan` contains 20 deterministic scheduled events, two per decade. Event days and choice IDs must be read from engine state, never hard-coded by backend clients.
- An event has 2–4 trusted choices. AI may change only title, description, and labels; cost, effects, choice IDs, and consequences remain engine-owned.
- Consequence events use `pendingConsequences` and may have a runtime event ID derived by the engine. Backend validation must accept them only when they match the trusted pending consequence and package.
- Rewards are available after waves 1–9 and are recorded in `rewardsChosenByWave`. Wave 10 proceeds to `victory` without another reward.
- Battle report `wave` and `day` are numeric campaign values, not the former `1 | 2` and `10 | 20` unions.
- Public action names remain unchanged, including `surrender`.
- Gemini remains the default narrative provider, with Zod validation and trusted local fallback.

## Backend work items

1. Replace the v3 adapter/ruleset with v4 metadata and reconstruct the trusted event plan using the persisted run difficulty.
2. Add `difficulty` to `POST /api/runs`, idempotency hashing, repository creation, and shared frontend contract.
3. Replace fixed event/battle day persistence types with v4 campaign validation.
4. Validate scheduled and consequence active events without trusting narrative payload gameplay values.
5. Expand event narrative schemas and storage from exactly two choices to 2–4 choices.
6. Generalize report/wave view types and expose the current three trusted reward options to API consumers.
7. Replace the legacy 20-day runner with a real action-driven 100-day campaign test.
8. Update Postman examples and backend handoff notes. Frontend components and engine source remain untouched.

## Compatibility and rollout

The v4 ruleset uses a new immutable ruleset ID and config fingerprint. Existing v3 runs remain stored for audit but cannot be resumed by the v4 application. A product migration, if desired later, requires a separately reviewed migration design.

## Verification gates

- Backend-focused typecheck is clean.
- Backend unit/contract tests pass, including v3 rejection, all difficulty values, dynamic days, 2–4 choices, and consequence-event validation.
- Campaign runner reaches `victory` through normal API actions over 100 days and ten battles.
- Full repository checks are reported separately; frontend failures caused by its still-v3 assumptions are handed off and are not fixed from the backend scope.
