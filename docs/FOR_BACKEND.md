# Backend — wire API to Game Engine v4

Baseline: 100-day / 10-wave engine in `src/game`.  
See [CAMPAIGN_100_DAY_CONTRACT.md](./CAMPAIGN_100_DAY_CONTRACT.md), [DEV1_CONTRACT.md](./DEV1_CONTRACT.md), [Patch.md](../Patch.md).

## Role

- Own auth, persistence, action log, and AI **narrative** generation.
- Apply gameplay **only** through pure functions from `src/game`.
- Persist JSON-serializable `GameState` with **`version: 4`**.

## Do not

- Reimplement economy, battle, reward, or consequence math outside the engine.
- Accept client-supplied costs, bonuses, or effect payloads.
- Call removed APIs: `enterDay`, old single-track `upgradeCity`, `applyReward`.
- Hardcode event day unions `[3,7,13,17]` or battle days `[10,20]` only — validate against engine config / days 1–100.
- Invent mechanical effects from AI responses.

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

`ensureLocalEvent(state)` when serving an event day if `activeEvent` is missing but a plan/consequence entry is unfinished.

## Events & AI

1. Resolve scheduled package via `resolveEventPackage(day, state.eventPlan)` or consequence via `pendingConsequences` + `eventPackageById`.
2. AI request: `packageId`, `eventId`, `day`, city summary; if `isConsequence`, include origin event/choice context.
3. Validate response choice ids ⊆ trusted package (length 2–4).
4. Merge with `decorateActiveEvent` (labels only).
5. Fallback to local copy on timeout/5xx/invalid JSON.
6. Never apply effects when narrative arrives — only on `chooseEventOption`.

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
4. Rewards after waves 1–9; wave 10 → victory.  
5. `startBattle` twice → `BATTLE_ALREADY_RESOLVED`.  
6. Load v3 save → rejected.
