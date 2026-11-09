# Campaign 100-Day Contract (Engine v4 → FE/BE)

Pure engine: [`src/game`](../src/game). Product FE/BE code is **not** updated yet — use this doc to wire them.

Companion docs: [DEV1_CONTRACT.md](./DEV1_CONTRACT.md) · [FOR_FRONTEND.md](./FOR_FRONTEND.md) · [FOR_BACKEND.md](./FOR_BACKEND.md) · [ENGINE_TO_FE_CONTRACT.md](./ENGINE_TO_FE_CONTRACT.md) · [ENGINE_TO_BE_CONTRACT.md](./ENGINE_TO_BE_CONTRACT.md) · [Patch.md](../Patch.md) · [GAME_ENGINE_PATCH_HISTORY.md](./GAME_ENGINE_PATCH_HISTORY.md)

## What changed (v3 → v4)

| Area | v3 | v4 |
|---|---|---|
| Calendar | 20 days, battles 10/20 | **100 days**, battles **10…100** (10 waves) |
| Save | `version: 3` | **`version: 4`** (reject older; no migrate) |
| Difficulty | none | `easy` \| `normal` \| `hard` on state |
| Event days | Fixed 3/7/13/17 | **2 prep days per decade** from `pickEventPlan(runId)` |
| Event choices | Exactly 2 | **2–4**, ≥1 free |
| Consequences | none | `pendingConsequences` + delayed trusted packages |
| Rewards | Wave 1 only; `rewardChosenId` | Waves **1–9**; `rewardsChosenByWave` |
| Economy | max 5, cost 50+20×L, income 25 | max **18**, cost **45+30×L**, income **28**, repair **35/45**, wall **+3 DEF**, city **+35 MaxHP** |

## Create run

```ts
import { createInitialState } from "../src/game";

const runId = crypto.randomUUID();
const state = createInitialState({
  runId,
  difficulty: "normal", // required from product UI; defaults to normal for tests
});
// state.version === 4
// state.eventPlan.length === 20  (2 × 10 decades)
// state.pendingConsequences === []
// state.rewardsChosenByWave === {}
// day-1 income already applied once
```

Reject persisted docs with `version !== 4` (`UNSUPPORTED_STATE_VERSION`).

## Public actions (unchanged names)

| Action | Engine call |
|---|---|
| `upgradeWall` / `upgradeTroops` / `upgradeCity` / `repairCity` | same |
| `endPreparationDay` | advances one day; may open event / battleReady |
| `startBattle` | once per battle day; monster scaled by difficulty |
| `continueFromReport` | waves 1–9 → `reward`; wave 10 → `victory` |
| `chooseEventOption` | `{ choiceId }` from `activeEvent.choices` |
| `chooseReward` | `{ rewardId }` from **this wave’s** trio only |
| `surrender` | → `gameOver` |
| `ensureLocalEvent` / `attachActiveEvent` / `decorateActiveEvent` | narrative attach |

## State fields FE/BE must adopt

```ts
type GameStateV4 = {
  version: 4;
  difficulty: "easy" | "normal" | "hard";
  // …existing fields…
  eventPlan: Array<{ day: number; packageId: string; eventId: string }>; // length 20
  pendingConsequences: Array<{
    id: string;
    originEventId: string;
    originChoiceId: string;
    packageId: string;
    triggerDay: number;
  }>;
  activeEvent: null | {
    eventId: string;
    packageId: string;
    day: number;
    title: string;
    description: string;
    choices: Array<{ id: string; label: string; goldCost: number; effects: Effect[] }>; // 2–4; goldCost = effective
    source: "local" | "mock" | "fallback" | "ai";
    isConsequence?: boolean;
    originEventId?: string;
    originChoiceId?: string;
  };
  rewardsChosenByWave: Record<string, string>; // e.g. { "1": "w1-gold" }
  // removed: rewardChosenId
};
```

## Events (trusted packages only)

- Days are **not** fixed. Read `state.eventPlan` / `activeEvent.day`.
- AI may rewrite **title / description / labels only** via `decorateActiveEvent`.
- **Never** invent gold/HP/defense numbers from the model.
- Consequence events use `activeEvent.isConsequence === true`; still resolved with `chooseEventOption`.
- Package config keeps **base** choice gold. Paid labels use the placeholder `{goldCost}`; `scaleChoicesForDifficulty` fills it with the **effective** cost once. `activeEvent.choices[].goldCost` is that same number. UI shows the field as-is; charge scales the trusted package base once. An AI **choice label** must not state a currency amount at all (`labelStatesCurrencyAmount`); any such claim falls back to the engine label. Description text is not scanned. See [ENGINE_TO_BE_CONTRACT.md](./ENGINE_TO_BE_CONTRACT.md) and [ENGINE_TO_FE_CONTRACT.md](./ENGINE_TO_FE_CONTRACT.md).
- Consequences prefer free prep days before the package `targetWave` battle (`CONSEQUENCE_TARGET_WAVE`). If that window is full, scheduling swaps in the trusted successor package (`CONSEQUENCE_SUCCESSOR`) instead of granting a bonus for a wave that is already over. Timed defense and upgrade discounts applied after their wave has cleared are clamped to the upcoming wave. They are not silently dropped.
- Same-day queue: finishing one mandatory event can immediately open another on the same day via `chooseEventOption` (no caller recovery helper required). `ensureLocalEvent` remains for save/load recovery.
- Public calendar jumps are forbidden: do not call `enterCalendarDay` / `enterDay`.

## Rewards

- After each cleared wave **1–9**, `phase === "reward"`.
- Options: `rewardsForWave(wavesCleared)` → exactly 3 ids unique to that wave.
- Wave 10 win → `victory` (no reward).
- Reject wrong-wave ids with `INVALID_CHOICE`.

## Difficulty multipliers (engine-applied)

| Modifier | Easy | Normal | Hard |
|---|---:|---:|---:|
| Monster HP | 0.75 | 1.0 | 1.20 |
| Monster attack | 0.80 | 1.0 | 1.12 |
| Upgrade cost | 0.85 | 1.0 | 1.20 |
| Daily income | 1.15 | 1.0 | 0.90 |
| Repair cost | 0.90 | 1.0 | 1.15 |
| Event gold costs | 0.85 | 1.0 | 1.15 |

Effect magnitudes (e.g. −18 HP) stay absolute in v1.

## BE checklist (wiring later)

1. `createRun` accepts `difficulty`; call `createInitialState({ runId, difficulty })`.
2. Persist full v4 blob including `pendingConsequences` and `rewardsChosenByWave`.
3. Stop hardcoding `[3,7,13,17]` / `[10,20]` in validators — use engine helpers / integer day range 1–100.
4. AI schema: 2–4 choice labels; optional continuation context when `isConsequence`; pass effective `goldCost` from `activeEvent`. Do not put a gold amount in labels.
5. After `chooseEventOption`, regenerate narrative when a chained `activeEvent` remains.
6. `ensureLocalEvent` on load/serve if a mandatory event is unfinished but `activeEvent` is null.
7. Adapter trust gate: validate `eventPlan` / active event against engine packages; reject foreign effects. Do not call `enterCalendarDay`.

## FE checklist (wiring later)

1. New game difficulty selector → create-run payload.
2. Calendar copy: “100 days” / wave N of 10.
3. Event UI: map `activeEvent.choices` (variable length); show consequence badge if `isConsequence`; show effective `goldCost`.
4. After `chooseEventOption`, keep the event modal open if `phase` is still `event` (same-day chain).
5. Reward UI: bind to current wave’s three options (not legacy `reward-gold` ids).
6. Display `difficulty`, upcoming wave via `getWavePreview` or BE view.
7. Do not hardcode event days or choice ids; do not call `enterCalendarDay`.

## Verify engine locally

```bash
npm run typecheck
npm test
```

Focus: `src/game/game.test.ts`.
