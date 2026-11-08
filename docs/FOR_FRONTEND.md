# Frontend — wire UI to Game Engine v3

Baseline for this contract: engine after the patch from `development-game-engine` → current `src/game`.  
See [Patch.md](../Patch.md) for the full delta and [DEV1_CONTRACT.md](./DEV1_CONTRACT.md) for state schema.

## Role

- Render `GameState` from the **backend** (or local engine only in a dedicated harness).
- Send gameplay actions; never recompute costs, damage, income, or rewards in the UI.
- Map `error.code` → user-facing copy.

## Do not

- Call removed APIs: `enterDay`, single-track `upgradeCity` (old ATK+DEF), `applyReward`.
- Hardcode event/choice IDs from the old engine (`event-day-3`, `event-day-3-a`, `day3-pay`, …).
- Trust AI numbers; only display narrative and submit choice **IDs** from `activeEvent`.

## Display fields

| State | UI |
|---|---|
| `day`, `phase` | Calendar / screen router |
| `gold`, `cityHp`, `cityMaxHp` | Resources |
| `wallLevel`, `troopLevel`, `cityLevel` | Three upgrade tracks |
| `actionUsedToday` | Disable economic buttons when true |
| `activeEvent` | Event modal (title, description, 2 choices) |
| `effects` | Defense-by-wave, discount %, prep income bonus |
| `battleResult` | Report / replay log only (no re-sim) |
| `eventPlan` | Optional debug (“which packages this run”) |

## Phase → screen

| `phase` | Controls |
|---|---|
| `preparation` | Upgrade wall / troops / city, repair, end day |
| `event` | Two choices → `chooseEventOption` |
| `battleReady` | Start battle |
| `battleReport` | Continue (play log locally) |
| `reward` | Three rewards (wave 1 only) |
| `gameOver` / `victory` | End screen; new game only |

## Actions to POST (names must match BE router)

```ts
type ClientAction =
  | { type: "upgradeWall" }
  | { type: "upgradeTroops" }
  | { type: "upgradeCity" }
  | { type: "repairCity" }
  | { type: "endPreparationDay" }
  | { type: "startBattle" }
  | { type: "continueFromReport" }
  | { type: "chooseEventOption"; choiceId: string }
  | { type: "chooseReward"; rewardId: string };
```

Each click should send a unique `actionId` (UUID); retries reuse the same id. Prefer sending `expectedRevision` if BE supports stale detection.

Response shape:

```ts
{ ok: true, state: GameState }
// or
{ ok: false, error: { code: string, message: string } }
```

On `ok: false`, keep previous UI state.

## Event wiring

1. When `phase === "event"`, read choices from `state.activeEvent.choices`.
2. Button value = `choice.id` (e.g. `day3-scouts-pay`) — **from state**, not a static map by day.
3. Optional AI labels may already be merged server-side; if FE merges, only overwrite `title` / `description` / `label` for matching ids.

## Reward wiring

Trusted ids: `reward-gold` | `reward-income` | `reward-discount`.  
Kinds in state/config: `grantGold` | `prepIncomeBonus` | `upgradeDiscount` (not the old `gold` / `income_bonus` names).

## Read-only selectors (optional client preview)

If the FE bundle can import `src/game` for display only:

```ts
import {
  getEffectiveStats,
  getUpgradeCost,
  getRepairCost,
  getWavePreview,
} from "../game"; // path per app layout
```

Mutations still go through the API. `getEffectiveStats` returns `wallCost`, `troopCost`, `cityCost` (no single `upgradeCost`).

## Error codes → UI

| Code | Hint |
|---|---|
| `INVALID_PHASE` | Wrong screen / disabled control |
| `INVALID_TRANSITION` | Illegal calendar move |
| `EVENT_REQUIRED` | Force event modal |
| `NO_ACTION_LEFT` | Already acted today |
| `INSUFFICIENT_GOLD` | Not enough gold |
| `MAX_UPGRADE` | Track at cap |
| `HP_FULL` | Repair useless |
| `INVALID_CHOICE` | Stale choice id |
| `EVENT_ALREADY_RESOLVED` | Close event UI |
| `REWARD_ALREADY_CHOSEN` | Leave reward screen |
| `BATTLE_INVALID` / `BATTLE_ALREADY_RESOLVED` | Battle gate |
| `GAME_ENDED` | Lock gameplay |

## Smoke checklist

1. New game → day 1 gold includes income; three upgrade costs visible.  
2. Day 3/7/13/17 → choice ids match `activeEvent` (vary by `runId`).  
3. Wave 1 report → reward → day 11.  
4. Refresh on `battleReport` does not change HP again.  
5. Old single-upgrade control removed from product UI.
