# Backend — wire API to Game Engine v4

Baseline: 100-day / 10-wave engine in `src/game`.  
Referensi lengkap: [game-engine/README.md](./game-engine/README.md) · [game-engine/API_AND_INTEGRATION.md](./game-engine/API_AND_INTEGRATION.md).  
See [CAMPAIGN_100_DAY_CONTRACT.md](./CAMPAIGN_100_DAY_CONTRACT.md), [DEV1_CONTRACT.md](./DEV1_CONTRACT.md), [Patch.md](../Patch.md).

## Role

- Own auth, persistence, action log, and AI **narrative** generation.
- Apply gameplay **only** through pure functions from `src/game`.
- Persist JSON-serializable `GameState` with **`version: 4`**.

## Do not

- Reimplement economy, battle, reward, or consequence math outside the engine.
- Accept client-supplied costs, bonuses, or effect payloads.
- Call removed / internal APIs: `enterDay`, `enterCalendarDay`, old single-track `upgradeCity`, `applyReward`.
- Expose `enterCalendarDay` on any client-facing route.
- Hardcode event day unions `[3,7,13,17]` or battle days `[10,20]` only — validate against engine config / days 1–100.
- Invent mechanical effects from AI responses.
- Re-scale or overwrite `activeEvent.choices[].goldCost` when decorating narrative.

## Create run

```ts
import { createInitialState } from "../game"; // adjust path

const runId = crypto.randomUUID();
const difficulty = body.difficulty ?? "normal"; // validate enum
const state = createInitialState({ runId, difficulty });
// version 4, eventPlan length 20, revision 0, day-1 income applied
```

Reject stored runs with `version !== 4` (`UNSUPPORTED_STATE_VERSION`). Do not auto-migrate v3.

## Apply action pattern

```ts
// 1. Load latest GameState (+ lock)
// 2. Optional expectedRevision / actionId dedupe
// 3. Dispatch one engine function
// 4. ok:false → no write
// 5. ok:true → persist state + action log
```

| Client `type` | Call |
|---|---|
| `upgradeWall` | `upgradeWall(state)` |
| `upgradeTroops` | `upgradeTroops(state)` |
| `upgradeCity` | `upgradeCity(state)` |
| `repairCity` | `repairCity(state)` |
| `endPreparationDay` | `endPreparationDay(state)` |
| `startBattle` | `startBattle(state)` |
| `continueFromReport` | `continueFromReport(state)` |
| `chooseEventOption` | `chooseEventOption(state, choiceId)` |
| `chooseReward` | `chooseReward(state, rewardId)` |
| `surrender` | `surrender(state)` |

`ensureLocalEvent(state)` when serving a day if `activeEvent` is missing but a scheduled plan entry or unresolved `pendingConsequences` entry for that day is unfinished (save/load recovery). Normal play after `chooseEventOption` should already chain the next same-day event inside the engine.

## Events & AI

1. Resolve scheduled package via `resolveEventPackage(day, state.eventPlan)` or consequence via `pendingConsequences` + `eventPackageById`.
2. AI request: `packageId`, `eventId`, `day`, city summary; if `isConsequence`, include origin event/choice context. Include **effective** `goldCost` values from `activeEvent.choices` (already difficulty-scaled).
3. Validate response choice ids ⊆ trusted package (length 2–4).
4. Merge with `decorateActiveEvent` (labels / title / description only — never costs or effects).
5. Fallback to local copy on timeout/5xx/invalid JSON.
6. Never apply effects when narrative arrives — only on `chooseEventOption`.
7. After a successful `chooseEventOption`, if `state.activeEvent` is still set (same-day chain) or `eventId` changed, **generate narrative again** for the new active event. Do not treat the day as event-complete after a single choice.

## Persistence

Store full `GameState` v4 including:

- `difficulty`, `eventPlan`, `pendingConsequences`, `rewardsChosenByWave`
- `revision`, `incomeGrantedDays`, `effects`, `battleResult`

Optional: prepared narratives keyed by `runId` + `eventId` / consequence `id`.

## BE-only error codes

| Code | When |
|---|---|
| `STALE_REVISION` | Client revision ≠ loaded |
| `DUPLICATE_ACTION` | Same `actionId` already applied |
| `RUN_MISMATCH` | Ownership / run id mismatch |
| `UNSUPPORTED_STATE_VERSION` | `version !== 4` |

## Smoke checklist

1. Create run with each difficulty → monster preview / costs differ; Normal matches base table.  
2. `eventPlan.length === 20`; days are prep days; stable for same `runId`.  
3. Skip choice schedules consequence; trigger day opens event before next battle.  
4. Choose first of two same-day consequences → response still `phase: "event"` → second narrative generated; refresh mid-queue does not double-apply effects.  
5. Rewards after waves 1–9; wave 10 → victory.  
6. `startBattle` twice → `BATTLE_ALREADY_RESOLVED`.  
7. Load v3 save → rejected.
