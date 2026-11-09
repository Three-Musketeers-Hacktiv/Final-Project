# Developer 1 — Game Engine Contract

Pure game engine lives in `src/game`. Chronology: [GAME_ENGINE_PATCH_HISTORY.md](./GAME_ENGINE_PATCH_HISTORY.md).  
FE/BE connection guide for the 100-day campaign: [CAMPAIGN_100_DAY_CONTRACT.md](./CAMPAIGN_100_DAY_CONTRACT.md).

Defaults (supersede older PRD / AGENTS bits where they conflict):

- Campaign: **100 days**, **10 waves** on days 10…100.
- Three upgrade tracks share one daily economic slot with repair.
- City upgrade increases `cityMaxHp` and current HP by the same bonus (not a full heal). Repair is never discounted.
- No unit recruitment API. `troopLevel` is the city's attack track.
- Event choices: **2–4** per package; ≥1 free; skip/refuse may schedule **consequence** events.
- Event days are **per-run** (2 prep days / decade via `pickEventPlan`), not fixed 3/7/13/17.
- Difficulty: `easy` | `normal` | `hard` scales monsters + economy.
- Playtest economy: `dailyIncome` **28**, upgrade `45 + level × 30`, max level **18**, repair **35/45**, city MaxHP +25 / income +5 per level.
- Phases: `preparation` | `event` | `battleReady` | `battleReport` | `reward` | `gameOver` | `victory`.

## State schema (`version: 4`)

```ts
type Difficulty = "easy" | "normal" | "hard";
type EventPlanEntry = { day: number; packageId: string; eventId: string };
type PendingConsequence = {
  id: string;
  originEventId: string;
  originChoiceId: string;
  packageId: string;
  triggerDay: number;
};

type GameState = {
  version: 4;
  revision: number;
  runId: string;
  difficulty: Difficulty;
  day: number;
  phase: GamePhase;
  gold: number;
  cityHp: number;
  cityMaxHp: number;
  wallLevel: number;
  troopLevel: number;
  cityLevel: number;
  actionUsedToday: boolean;
  incomeGrantedDays: number[];
  completedEventIds: string[];
  eventPlan: EventPlanEntry[];          // length 20
  pendingConsequences: PendingConsequence[];
  activeEvent: ActiveEvent | null;      // choices length 2–4
  effects: ActiveEffects;
  wavesCleared: number;
  battleResult: BattleResult | null;
  rewardsChosenByWave: Record<string, string>;
};
```

- Reject `version` 1–3 at the BE boundary — **no migration**.
- `revision` increments once per successful mutating action; `createInitialState` → `0`.
- `eventPlan` from `pickEventPlan(runId)` (stable hash). Resolve with `resolveEventPackage(day, state.eventPlan)`.
- AI may overlay title/description/labels via `decorateActiveEvent`; costs/effects stay trusted.
- Engine is pure: no React, DOM, `fetch`, `localStorage`, timers, or `process.env`.
- State is JSON-serializable.

## API (`src/game`)

```ts
import {
  createInitialState,
  getEffectiveStats,
  getWavePreview,
  rewardsForWave,
  upgradeWall,
  upgradeTroops,
  upgradeCity,
  repairCity,
  endPreparationDay,
  startBattle,
  continueFromReport,
  chooseEventOption,
  chooseReward,
  attachActiveEvent,
  ensureLocalEvent,
  pickEventPlan,
  resolveEventPackage,
  decorateActiveEvent,
  surrender,
} from "./game";

const state = createInitialState({ runId: "run-…", difficulty: "normal" });
```

### Day / wave transitions

- No public `enterDay(day)` and no public `enterCalendarDay` (internal helper only).
- Advance with `endPreparationDay` or `chooseReward` (after waves 1–9 → next prep day).
- Battle days grant no income / no economy actions.
- Unresolved scheduled **or** consequence event → `EVENT_REQUIRED`.
- After `chooseEventOption`, the engine may immediately activate the next unfinished mandatory event for the **same day** (`phase: "event"`). Do not assume one event per day.
- Wave 10 win → `continueFromReport` → `victory` (no reward).

### Event gold costs

- Trusted packages store **base** `goldCost`.
- `activeEvent.choices[].goldCost` is the **effective** cost after difficulty scaling (`scaleEventGoldCost`).
- `chooseEventOption` charges from the trusted package + the same scale (once). UI/AI must not invent or re-scale costs.

### Error codes (stable for UI)

| Code | Meaning |
|---|---|
| `INVALID_PHASE` | Action not allowed in the current phase |
| `INVALID_TRANSITION` | Illegal day / calendar transition |
| `EVENT_REQUIRED` | Event must be resolved first |
| `NO_ACTION_LEFT` | Daily economic action already used |
| `INSUFFICIENT_GOLD` | Not enough gold |
| `MAX_UPGRADE` | Track at max level |
| `HP_FULL` | Repair not needed |
| `INVALID_CHOICE` | Unknown / disallowed choice or reward |
| `EVENT_ALREADY_RESOLVED` | Event already completed |
| `REWARD_ALREADY_CHOSEN` | Reward already taken for that wave |
| `BATTLE_INVALID` | Battle config / day invalid |
| `BATTLE_ALREADY_RESOLVED` | Battle already computed |
| `GAME_ENDED` | `gameOver` or `victory` |

Reserved for BE layers: `RUN_MISMATCH`, `STALE_REVISION`, `DUPLICATE_ACTION`, `UNSUPPORTED_STATE_VERSION`.
