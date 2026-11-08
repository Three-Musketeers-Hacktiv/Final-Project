# Developer 1 — Game Engine Contract

Pure game engine lives in `src/game`. A **separate** testing harness (mock UI + mock narrative HTTP) lives in `src/dev-harness`, `harness/`, and `mock-server/` — see [HARNESS.md](./HARNESS.md). That harness is not the product UI/backend.

Defaults (supersede older PRD bits where they conflict):

- Three upgrade tracks share one daily economic slot with repair: wall raises defense, troops raise attack, city raises max HP and daily income.
- City upgrade increases `cityMaxHp` and current HP by the same bonus (not a full heal). Repair stays separate and is never discounted.
- No individual troop recruitment in the engine API. `troopLevel` is only the city's attack track.
- Event “recruitment discount” is an **upgrade discount** applied to all three track costs.
- Phases: `preparation` | `event` | `battleReady` | `battleReport` | `reward` | `gameOver` | `victory`.
- Playtest delta vs the older AGENTS gold table: `dailyIncome` is **25**.
- Playtest track bonuses: wall defense +2, troops attack +5, city max HP +20 and income +8 per level. Cost `50 + level × 20`, max 5 per track. Income +8 (not +3) is required so separate attack and defense purchases can still clear wave 2.
- Older PRD/MVP docs may still describe a single ATK+DEF upgrade. This contract supersedes that.

## State schema (`version: 3`)

```ts
type EventPlanEntry = { day: number; packageId: string; eventId: string };

type GameState = {
  version: 3;          // save format version
  revision: number;    // starts at 0 after createInitialState
  runId: string;
  day: number;
  phase: GamePhase;
  gold: number;
  cityHp: number;
  cityMaxHp: number;
  wallLevel: number;   // defense track, starts at 0
  troopLevel: number;  // attack track, starts at 0
  cityLevel: number;   // max HP + income track, starts at 0
  actionUsedToday: boolean;
  incomeGrantedDays: number[]; // unique preparation days that received income
  completedEventIds: string[];
  eventPlan: EventPlanEntry[]; // one trusted package per scheduled event day
  activeEvent: ActiveEvent | null;
  effects: ActiveEffects;
  wavesCleared: number;
  battleResult: BattleResult | null;
  rewardChosenId: string | null;
};
```

- `version` is the **save format** identifier. This release uses `3`. Version `1` (`upgradeLevel`) and `2` are not migrated — see [Patch.md](../Patch.md).
- `revision` is a separate monotonic counter. Every successful public gameplay action that changes state increments it **once** (including composite `chooseReward`). Errors and no-ops do not increment. `createInitialState` yields `revision: 0`.
- `incomeGrantedDays` replaces the old single `incomeGrantedForDay` marker. Only valid preparation days appear in the list.
- `eventPlan` is filled at create via `pickEventPlan(runId)` (stable hash). Each event day (3/7/13/17) has a pool of two packages; the plan picks one. Resolve with `resolveEventPackage(day, state.eventPlan)`. Do not hardcode legacy ids like `event-day-3` / `day3-pay`.
- AI may overlay title/description/labels through `decorateActiveEvent`; costs and effects always come from the trusted package in `config.ts`.
- Engine is pure: no React, DOM, `fetch`, `localStorage`, timers, or `process.env`.
- State is JSON-serializable.

**Save loading:** rejecting unsupported older formats (`UNSUPPORTED_STATE_VERSION`) is scheduled for ticket 04. This ticket does not add autosave or migration. Do not assume `version: 1` payloads can be loaded.

## API (`src/game`)

```ts
import {
  createInitialState,
  getEffectiveStats,
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
} from "./game";

const state = createInitialState({ runId: "run-…" });
const stats = getEffectiveStats(state);
const troops = upgradeTroops(state); // { ok, state } | { ok:false, error:{code,message} }
const wall = upgradeWall(state);
const city = upgradeCity(state); // max HP + income, not attack/defense
```

### Day transitions

- There is **no** public `enterDay(day)` jump API. Callers advance with `endPreparationDay` (prep → next day) or `chooseReward` (reward → day 11).
- `createInitialState` applies day-1 income exactly once via an internal helper.
- `endPreparationDay` only accepts a valid preparation day in `preparation` phase, advances exactly one day, and rejects reverse/jump/out-of-range days with `INVALID_TRANSITION`.
- A scheduled event that is unfinished blocks shopping and advance with `EVENT_REQUIRED`, even if `phase` was tampered to `preparation`.
- Resolving an event stays on the same day: no extra income and no action-slot reset.
- Battle days (10, 20) grant no income and no economic actions.

### Error codes (stable for UI)

| Code | Meaning |
|---|---|
| `INVALID_PHASE` | Action not allowed in the current phase |
| `INVALID_TRANSITION` | Illegal day / calendar transition |
| `EVENT_REQUIRED` | Scheduled event must be resolved first |
| `NO_ACTION_LEFT` | Daily economic action already used |
| `INSUFFICIENT_GOLD` | Not enough gold |
| `MAX_UPGRADE` | That upgrade track is already at max level |
| `HP_FULL` | Repair not needed |
| `INVALID_CHOICE` | Unknown / disallowed choice |
| `EVENT_ALREADY_RESOLVED` | Event already completed |
| `REWARD_ALREADY_CHOSEN` | Reward already taken |
| `BATTLE_INVALID` | Battle config / day invalid |
| `BATTLE_ALREADY_RESOLVED` | Battle already computed |
| `GAME_ENDED` | `gameOver` or `victory` — no further gameplay |

Reserved for later tickets (not enforced here):

| Code | Ticket |
|---|---|
| `RUN_MISMATCH` / `STALE_REVISION` / `DUPLICATE_ACTION` | 03 controller |
| `UNSUPPORTED_STATE_VERSION` | 04 save load |

Effects come only from trusted packages in `config.ts`. UI/AI layers may attach narrative labels after validating IDs against those packages.
