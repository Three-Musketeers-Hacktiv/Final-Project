# Frontend — wire UI to Game Engine v4

Baseline: 100-day / 10-wave engine in `src/game`.  
Referensi lengkap: [game-engine/README.md](./game-engine/README.md) · [game-engine/API_AND_INTEGRATION.md](./game-engine/API_AND_INTEGRATION.md).  
See [CAMPAIGN_100_DAY_CONTRACT.md](./CAMPAIGN_100_DAY_CONTRACT.md), [DEV1_CONTRACT.md](./DEV1_CONTRACT.md), [Patch.md](../Patch.md).

## Role

- Render `GameState` from the **backend** (or local engine in a harness).
- Send gameplay actions; never recompute costs, damage, income, or rewards in the UI.
- Map `error.code` → user-facing copy.

## Do not

- Call removed / internal APIs: `enterDay`, `enterCalendarDay`, old single-track ATK+DEF `upgradeCity`, `applyReward`.
- Hardcode event days (`3/7/13/17`) or legacy choice/reward ids.
- Trust AI numbers; only display narrative and submit choice **IDs** from `activeEvent`.
- Assume `rewardChosenId` still exists — use `rewardsChosenByWave`.
- Re-scale `activeEvent.choices[].goldCost` in the UI (engine already applied difficulty).
- Assume at most one mandatory event per day.

## New game

- Collect `difficulty: "easy" | "normal" | "hard"` and send on create-run.
- Show campaign as **100 days / 10 waves**.

## Display fields

| State | UI |
|---|---|
| `difficulty` | City record / HUD |
| `day`, `phase` | Calendar / screen router |
| `gold`, `cityHp`, `cityMaxHp` | Resources |
| `wallLevel`, `troopLevel`, `cityLevel` | Three upgrade tracks (cap 18) |
| `actionUsedToday` | Disable economic buttons when true |
| `activeEvent` | Event modal — **2–4** choices; badge if `isConsequence` |
| `pendingConsequences` | Optional “upcoming fallout” debug |
| `effects` | Defense-by-wave, discount %, prep income bonus |
| `battleResult` | Report / replay log only (no re-sim) |
| `rewardsChosenByWave` | Debug / history |
| `eventPlan` | Optional debug (“which days this run”) |

## Phase → screen

| `phase` | Controls |
|---|---|
| `preparation` | Upgrade wall / troops / city, repair, end day |
| `event` | 2–4 choices → `chooseEventOption` |
| `battleReady` | Start battle |
| `battleReport` | Continue (play log locally) |
| `reward` | Three rewards for **current** cleared wave (1–9) |
| `gameOver` / `victory` | End screen; new game only |

## Actions to POST

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
  | { type: "chooseReward"; rewardId: string }
  | { type: "surrender" };
```

Prefer `actionId` + `expectedRevision` if BE supports them.

## Event / reward wiring

1. Read `activeEvent.choices` (length 2–4). Button value = `choice.id`.
2. Show `choice.goldCost` as the gold that will be charged (`0` = free). Values are **effective** (difficulty-scaled); do not multiply again.
3. Consequence events: same modal; optional copy that this is a continuation (`isConsequence`).
4. After every successful `chooseEventOption`, re-read `phase` + `activeEvent`. If still `event`, keep/open the modal for the **next** mandatory event (same-day chain). Do not auto-advance the day.
5. Rewards: ids like `w1-income`, `w2-gold`, … — **from current wave’s set**, never the old `reward-gold` trio alone.
6. Optional selectors: `getEffectiveStats`, `getWavePreview`, `rewardsForWave`.

## Error codes → UI

Same engine codes as [DEV1_CONTRACT.md](./DEV1_CONTRACT.md). Notable: `EVENT_REQUIRED` must force the event modal / refresh even if the UI thought the phase was `preparation`.

## Smoke checklist

1. New game with difficulty → day 1 income applied; costs reflect difficulty.  
2. First event day comes from `eventPlan` (not hardcoded 3).  
3. Skip choice can later open a consequence event.  
4. Same-day chain: resolving one consequence can immediately open another `event` without ending the day.  
5. Easy vs hard: paid event choices show different gold amounts for the same choice id.  
6. Wave 1–9 → reward → next prep day; wave 10 → victory.  
7. Refresh on `battleReport` does not change HP again.
