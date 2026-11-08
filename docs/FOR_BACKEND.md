# Backend — wire API to Game Engine v3

Baseline for this contract: engine after the patch from `development-game-engine` → current `src/game`.  
See [Patch.md](../Patch.md) for the full delta and [DEV1_CONTRACT.md](./DEV1_CONTRACT.md) for state schema.

## Role

- Own auth, persistence, action log, and AI **narrative** generation.
- Apply gameplay **only** through pure functions from `src/game`.
- Persist JSON-serializable `GameState` with `version: 3`.

## Do not

- Reimplement economy, battle, or reward math outside the engine.
- Accept client-supplied costs, bonuses, or effect payloads.
- Call removed APIs: `enterDay`, old single-track `upgradeCity`, `applyReward`.
- Treat Dev1 mock harness as production backend.

## Create run

```ts
import { createInitialState, pickEventPlan } from "../game"; // adjust path

const runId = crypto.randomUUID(); // BE generates id
const state = createInitialState({ runId });
// state.eventPlan is already set; equals pickEventPlan(runId)
// state.revision === 0; day-1 income already applied
```

Persist `state` atomically. Optionally pre-generate narratives for each `eventPlan` entry (title/description/labels only) keyed by `runId` + `eventId` / `packageId`.

**Legacy:** documents with `version: 1` and `upgradeLevel` are unsupported — reject with `UNSUPPORTED_STATE_VERSION` (or recreate). Do not auto-migrate.

## Apply action pattern

```ts
import {
  upgradeWall,
  upgradeTroops,
  upgradeCity,
  repairCity,
  endPreparationDay,
  startBattle,
  continueFromReport,
  chooseEventOption,
  chooseReward,
  ensureLocalEvent,
  decorateActiveEvent,
} from "../game";

// 1. Load latest GameState for runId (+ lock / transaction)
// 2. Optional: if expectedRevision != state.revision → STALE_REVISION
// 3. Optional: if actionId already committed → return stored result (dedupe)
// 4. Dispatch one engine function
// 5. ok:false → return error, no write
// 6. ok:true → save state + action log (include new revision)
```

### Action → engine

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

`ensureLocalEvent(state)` when entering/serving an event day if `activeEvent` is missing but the plan still has an unfinished package.

## Events & AI

1. Resolve package with `resolveEventPackage(day, state.eventPlan)` or trust `state.activeEvent.packageId` against `eventPackageById`.
2. AI request may include `packageId`, `eventId`, `day`, city summary — **not** free-form effect numbers.
3. Validate response choice ids ⊆ trusted package choice ids.
4. Merge narrative with:

```ts
const next = decorateActiveEvent(state, {
  title,
  description,
  choices: [
    { id: trusted.choices[0].id, label: aiLabel0 },
    { id: trusted.choices[1].id, label: aiLabel1 },
  ],
  source: "ai", // or "fallback" / "mock"
});
```

5. Fallback to local package copy on timeout/5xx/invalid JSON; gameplay must continue.
6. Never apply effects when narrative arrives — only on `chooseEventOption`.

Pool reminder (2 packages per day): see [Patch.md](../Patch.md) §5. Same `runId` ⇒ same `eventPlan`.

## Persistence fields to store

Minimum on `game_runs` (names may vary):

- Full `GameState` blob (`version`, `revision`, tracks, `incomeGrantedDays`, `eventPlan`, effects, …)
- Optional `preparedEventNarratives[]` keyed by plan entries
- Action log: `actionId`, `type`, `runId`, `revisionBefore`, `revisionAfter`, timestamp

Battle success reports (if separate collection): write on successful `startBattle` with `won: true` — not on event outcomes.

## Stale / dedupe (recommended BE layer)

| Code | When |
|---|---|
| `STALE_REVISION` | Client `expectedRevision` ≠ loaded `revision` |
| `DUPLICATE_ACTION` | Same `actionId` already applied (return first result) |
| `RUN_MISMATCH` | `runId` / ownership mismatch |
| `UNSUPPORTED_STATE_VERSION` | `version !== 3` |

Engine itself emits gameplay codes only (`INVALID_PHASE`, `EVENT_REQUIRED`, …).

## Response contract

```ts
{ ok: true, state: GameState }
{ ok: false, error: { code: string, message: string } }
```

Do not mutate gold/HP in the adapter after a successful engine call except via another engine function.

## Smoke checklist

1. `POST` create run → `version: 3`, `eventPlan.length === 4`, `revision: 0`.  
2. Upgrade wall then troops on different days; costs follow level + discount.  
3. Event choice id taken from plan package; unknown id → `INVALID_CHOICE`.  
4. Kill AI service → `ensureLocalEvent` / fallback still finishes day 3.  
5. `startBattle` twice same day → second call `BATTLE_ALREADY_RESOLVED`.  
6. Load v1 save → rejected; no silent field mapping from `upgradeLevel`.
