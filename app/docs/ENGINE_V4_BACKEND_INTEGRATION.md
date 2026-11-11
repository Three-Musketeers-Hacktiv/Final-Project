# Engine V4 Backend Integration

Status: **Backend synchronized; frontend build handoff remains**
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

## Latest patch delta (2026-11-09)

- Latest balancing uses repair `25 gold / 60 HP`; normal wave HP/attack from `150/22` through `600/64`; and hard multipliers HP `1.05`, attack `1.03`, upgrade `1.08`, income `0.95`, repair `1.05`, and event gold `1.08`. Backend obtains all runtime values and its fingerprint from engine config.
- `activeEvent.choices[].goldCost` is already difficulty-scaled. It is the effective cost; backend and frontend must not scale it again.
- AI choice labels may not mention supported currency terms (`gold`, `coin(s)`, `treasury`, `gp`), even without an amount. Backend supplies effective costs as prompt context, but labels are accepted only through the engine trusted-label policy. Descriptions remain narrative-only and are not scanned.
- A consequence may move to a trusted successor package when its original window is occupied. Backend uses `isTrustedConsequencePackage`, not strict package equality.
- Choosing an event can immediately activate another consequence on the same day. The response must decorate that new active event.
- Narrative recovery order is: same run/event, configured Gemini generation, shared valid AI narrative for the ruleset/package/day after generation failure, then trusted local fallback.
- The backend immutable ruleset ID is `campaign-v4-100-day-v3`. Engine documentation suggests v2 relative to its baseline, but this backend already used v2 for the preceding balance fingerprint. Reusing v2 would conflict with immutable Atlas metadata. Existing v1/v2 runs remain audit records and are not silently migrated.

## Latest patch implementation tickets

1. Version the immutable ruleset and use the engine successor-chain validator.
2. Update balancing regression tests and cover the `late-3` successor schedule.
3. Add stored narrative lookup while preserving trusted decoration and source metadata.
4. Verify same-day chaining, a full campaign, typecheck, lint, build, and tests without editing frontend or engine files.

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

The latest balance keeps `GameState.version === 4` but changes the config fingerprint. New runs use backend ruleset `campaign-v4-100-day-v3`. Existing runs tied to older ruleset documents remain stored for audit but cannot be resumed under the new engine. A product migration, if desired later, requires a separately reviewed migration design.

## Verification gates

- Backend-focused typecheck is clean.
- Backend unit/contract tests pass, including dynamic days, 2–4 choices, trusted successor consequences, stored narrative validation, and missing-event recovery.
- Latest ruleset-v3 campaign runner reaches `victory` through 196 normal API actions, 22 events, 100 days, and ten battles against MongoDB Atlas.
- Root engine typecheck and all 60 root tests pass; all 62 backend tests and backend typecheck pass; backend lint passes.
- Production build compiles, then fails only on existing frontend v3 assumptions: missing create-run difficulty and outdated reward config/kinds. These frontend-owned files were not changed.
