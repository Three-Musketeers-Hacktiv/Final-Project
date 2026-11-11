# AI Event Runtime Specification

Status: **Full event packages are the default. Narrative-only decoration is legacy.**
Owner: Backend
Updated: 2026-11-11

This document replaces the previous rule that Gemini may change only title, description, and choice labels. Older copies of that rule in remediation, playtest, and engine-integration notes are historical.

## 1. Purpose and authority

The default path asks the backend to generate one complete event package for an empty event slot:

- Scene title and narration.
- 2–4 concrete choices.
- Base `goldCost` (before difficulty scaling).
- Effects from the engine union.
- Depth-1 incoming consequence when the slot policy is `required`, including an executable fallback package. `optional` slots may omit it.

The game engine stays pure. It validates the package and applies cost and effects only when the player picks a choice. It does not call a provider, read environment variables, or touch the database.

Local catalog packages in `src/game/eventPackages.ts` remain the mechanical fallback. They are not deleted.

Create-run still does not call the provider. Generation stays on demand when an action first opens a slot that has no committed snapshot.

## 2. Default provider and configuration

Google Gemini remains the only implemented provider. Domain code depends on `EventPackageGenerator` in `app/server/ai/event-package.ts`, not on the Gemini SDK. `EventNarrativeGenerator` remains for legacy narrative snapshots and tests.

| Variable | Required | Recommended/default | Purpose |
|---|---:|---|---|
| `AI_PROVIDER` | Yes | `gemini` | Selects the backend adapter. |
| `GEMINI_API_KEY` | For live Gemini | none | Server-only credential. |
| `GEMINI_MODEL` | For live Gemini | chosen at deployment | Model with JSON output. |
| `AI_TIMEOUT_MS` | No | `10000` | One provider-call timeout. Gemini's client floor is 10 seconds. |
| `AI_MAX_RETRIES` | No | `1` | Retries for HTTP 408, 429, and 5xx only. HTTP 400, invalid JSON, schema mismatch, truncation, and safety blocks are not retried. |
| `AI_MAX_OUTPUT_TOKENS` | No | `2500` | Room for one full package. Hard cap 4000. |
| `AI_PROMPT_VERSION` | No | `event-advisor-en-v1` | Advisor/scene audit id. Package generation stores it beside `event-package-en-v3`. |

Missing key or model means fallback-only. Secrets never use a `NEXT_PUBLIC_` prefix.

The total wait is one call timeout times (`AI_MAX_RETRIES + 1`). That budget stays outside the MongoDB transaction and under the function timeout. A race may call the provider more than once. Only one revision can commit.

## 3. Package contract

`goldCost` in the package is the **base** cost. The engine applies `scaleEventGoldCost` once for display and once from that same base when the choice is paid. Callers must not send a pre-scaled cost.

Canonical ids are assigned by the backend:

- Scheduled package id: `ai:${slotEventId}`.
- The plan **event id and day** stay the slot chosen by `pickEventPlan`.
- A dynamic consequence id is `ai:cons:${originEventId}:${choiceId}` and is stored with the origin choice.
- Model output ids are draft choice ids only. They are not run ids or calendar days.

A committed package records `schemaVersion: 1`, source, provider, model, prompt version, and a sha256 fingerprint. `runs_event.packageSnapshot` is the durable copy. `game_runs.state.eventPackageStore` is the engine-readable mirror. `event_data` stays narrative-only and is not a full package.

## 4. What the model may invent

The model may invent theme, prose, choice labels, base costs, and combinations of supported effects. It may not invent a new effect type. Supported effects are `grantGold`, `damageCity`, `healCity`, `maxHpBonus`, `nextWaveDefense`, and `upgradeDiscount`.

The provider JSON Schema and the draft Zod schema are maintained separately. Contract tests compare structure only: required and optional keys, effect discriminators, consequence, `fallbackPackage`, and the absence of `consequence` on fallback choices. They do not claim full parity.

Intentional differences:

- Zod and `validateEventPackage` enforce delay `1..30`, `minDelayDays <= maxDelayDays`, one free choice, 2–4 choices, dominance, wave timing, and decade. The Gemini schema does not encode those bounds (`minimum`, `maximum`, `minItems`, `maxItems`, and `additionalProperties` stay off that schema).
- The provider effect schema is one object: `type` is an enum of the six supported effects, and `amount`, `wave`, `rate`, and `untilWave` are optional numbers. It is not an `anyOf` of six objects. Zod's discriminated union still rejects an effect that has the wrong fields. The prompt tells the model to omit unused numbers.
- `packageId`, `eventId`, and `decade` are assigned by `canonicalizeEventPackage`, not by the model.
- Unknown fields are rejected by Zod `.strict()`. The provider schema does not set `additionalProperties: false`.

Technical validation (engine `validateEventPackage`) remains authoritative at install and when a choice is applied. Generation calls that same function before labeling a package `ai`. A strictly dominated paid choice (same effects and consequence, higher cost) is rejected for new AI packages.

Those checks do not prove that the prose is a good dilemma. Narrative quality stays a separate review.

A paid choice may cost more gold than the city currently has, as long as one choice is free. `INSUFFICIENT_GOLD` is enforced later, at choice time.

## 5. On-demand flow

1. An engine action opens a scheduled day or a due consequence.
2. Backend loads `runs_event` for that run and event id.
3. A `packageSnapshot` is restored and the provider is not called.
4. A legacy row with only `narrativeSnapshot` is decorated in place. It is not replaced by a new AI package.
5. Otherwise backend calls `EventPackageGenerator` **before** the Mongo transaction.
6. The engine validates the canonical package. Success installs it with `installCommittedPackage` and does not apply effects or bump revision by itself.
7. Failure, timeout, refusal, invalid JSON, unknown effects, or a rejected package selects the local engine package. Seeded `event_data` text is used only when its choice ids match that local package. Otherwise the engine text is used. Source is `fallback`, with `fallbackReason`.
8. The action transaction writes state, `eventPackageStore`, `runs_event.packageSnapshot`, and the narrative subset together.
9. A later provider response cannot replace that snapshot.
10. Choosing loads the committed package and the engine applies that choice once.

`chooseEventOption` resolves a package that is already committed so the paid cost and effects are the snapshot's, not a catalog row that was showing before generation.

## 6. Consequences

Policy is chosen before the provider is called. It is not inferred from the model response.

| Policy | When |
|---|---|
| `optional` | The slot is itself a consequence, the catalog package for that plan entry has no consequence, or `hasConsequenceScheduleWindow` finds no later preparation day. |
| `required` | The catalog baseline has at least one consequence and a preparation day can still be scheduled. |

`required` means at least one choice on the new package has a complete, schedulable depth-1 consequence. It does not mean every choice has one, and it does not mean every player sees a follow-up. The follow-up is scheduled only when the player picks a choice that has `consequence`.

The provider schema still leaves `consequence` optional on each choice. `validateEventPackage` enforces `requireAtLeastOneConsequence` only for a `required` slot. Every consequence that is present must also pass `canScheduleConsequence`, the same day search `scheduleConsequence` uses. A package that fails that check is not accepted as `ai`.

Catalog consequences still use `packageId` plus `CONSEQUENCE_TARGET_WAVE` / `CONSEQUENCE_SUCCESSOR`.

Dynamic consequences carry `fallbackPackage`. The engine schedules that package without the successor map. If `targetWave` is already past, the origin package is rejected at accept time. If no prep day remains, the slot policy is `optional` before generation, and a consequence that cannot be scheduled is rejected instead of being shown. Fallback packages cannot schedule another consequence.

On the follow-up day the stored `fallbackPackage` is the mechanical authority. Backend may ask the narrative generator for a new title, description, and labels. It does not install a new AI package over that follow-up, so gold costs, effects, and choice ids stay as scheduled. If narrative generation fails, the stored package still runs. A committed `packageSnapshot` is not rewritten.

A local fallback for a newly opened scheduled slot may drop consequences that cannot be scheduled (`sanitizeConsequences`) before the player sees them. That does not rewrite an already committed snapshot. Refresh uses the stored package.

## 7. Fallback and sources

Fallback is mandatory. `fallbackReason` is one of:

| Reason | When |
|---|---|
| `provider-unconfigured` | Missing provider, key, or model |
| `output-truncated` | `finishReason` is `MAX_TOKENS`, even if a fragment parses |
| `empty-response` | No text and no safety block |
| `invalid-json` | Text is not JSON |
| `schema-mismatch` | JSON does not match the draft Zod schema |
| `safety-block` | `promptFeedback.blockReason` or a safety/policy finish reason |
| `provider-invalid-argument` | Provider HTTP 400 or a status-less `INVALID_ARGUMENT` message. Not retried. |
| `provider-error` | Network, timeout, HTTP 429, 5xx, or another adapter exception |
| `package-rejected` | Draft parsed, but `validateEventPackage` rejected it for a reason other than the consequence policy |
| `consequence-policy-failed` | A `required` slot had no consequence, or a consequence cannot be scheduled. Not retried. The local catalog is used instead |

Logs include the event id, day, whether the slot is a consequence, the required/optional policy, provider, model, prompt version, HTTP status when the SDK provides one, fallback reason, error name, and a short provider message. Choice handling logs whether the picked choice had a consequence, whether one pending row was scheduled, and its trigger day. They do not include the API key, the prompt, or the player state. Token budget stays at the configured `AI_MAX_OUTPUT_TOKENS`. A 400 is an invalid request, not truncation, so it is not fixed by raising the token budget. Invalid JSON, schema mismatch, truncation, safety blocks, and HTTP 400 are not retried.

Persistent source values remain `"ai" | "fallback" | "mock"`. A local catalog package is never labeled `ai` because an earlier narrative used Gemini. Engine `activeEvent.source === "local"` is only the pre-commit value.

## 8. Saves

`GameState.version` stays `4`. `eventPackageStore` is optional. Older saves without it keep resolving the local catalog. Active legacy events are not migrated into new AI packages. A snapshot that no longer validates returns `PACKAGE_SNAPSHOT_INVALID` instead of silently swapping the choices the player already saw.

## 9. Tests

Default automated tests use a mock generator or the local fallback. They do not call live Gemini.

From `app/`:

```bash
npx vitest run server/ai/event-package.test.ts
```

That file checks the JSON Schema sent to Gemini, local Zod rejection, and fallback categories, including a mocked HTTP 400. It does not prove the live model accepts the schema.

Schema isolation is a separate opt-in file. It does not write a database. Skip is the default. One ladder run on `gemini-3.5-flash-lite` accepted JSON mode, a tiny schema, label-only choices, one effect `anyOf`, a flat effect object, and a consequence whose follow-up choices had no effects. The full package schema returned HTTP 400. Follow-up calls then kept a flat effect object: with `minItems` / `maxItems` the request was still HTTP 400, and without those bounds it was accepted. `anyOf` without array bounds was not retested. Mock tests and that live confirm are separate evidence.

```bash
LIVE_GEMINI_SCHEMA_PROBE=1 GEMINI_API_KEY=... GEMINI_MODEL=... npx vitest run server/ai/event-package.schema-probe.live.test.ts
```

Cover at least: a package outside the catalog; its base cost and effects applied once; invalid packages leaving state unchanged; provider failures using fallback; refresh reusing the snapshot; difficulty scaling once; one commit under a race; a late response not replacing fallback; a dynamic consequence running with the provider disabled; legacy saves still loading; economy, calendar, battle, reward, and expiry regression.

Live smoke is opt-in and makes one Gemini call. It does not write a database. A fallback result is a failure. Skip is the default.

```bash
LIVE_GEMINI_SMOKE=1 GEMINI_API_KEY=... GEMINI_MODEL=... npx vitest run server/ai/event-package.live.test.ts
```

Older snapshots and notes may still say `event-package-en-v1` or `event-package-en-v2`. New package generation records `event-package-en-v3`. Already committed snapshots keep the package the player saw, including ones that have no consequence. The policy applies to generation that has not been committed yet.

## 10. Acceptance criteria

- The default slot uses a full package when Gemini is configured and no snapshot exists.
- The engine rejects unsupported effects and executable payloads.
- A provider outage still finishes the 100-day calendar through local packages.
- One slot commits one package.
- Effects run only after a valid choice.
- Credentials stay server-only.
