# Campaign 100-Day Contract (Engine v4 → FE/BE)

Pure engine: [`src/game`](../src/game). Product FE/BE code is **not** updated yet — use this doc to wire them.

Companion docs: [DEV1_CONTRACT.md](./DEV1_CONTRACT.md) · [FOR_FRONTEND.md](./FOR_FRONTEND.md) · [FOR_BACKEND.md](./FOR_BACKEND.md) · [Patch.md](../Patch.md) · [GAME_ENGINE_PATCH_HISTORY.md](./GAME_ENGINE_PATCH_HISTORY.md)

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
| Economy | max 5, cost 50+20×L, income 25 | max **18**, cost **45+30×L**, income **28**, repair **35/45** |

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
    choices: Array<{ id: string; label: string; goldCost: number; effects: Effect[] }>; // 2–4
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
- Choice gold costs are scaled by difficulty inside the engine; UI should show costs from trusted choices (or a BE view), not invent them.

## Rewards

- After each cleared wave **1–9**, `phase === "reward"`.
- Options: `rewardsForWave(wavesCleared)` → exactly 3 ids unique to that wave.
- Wave 10 win → `victory` (no reward).
- Reject wrong-wave ids with `INVALID_CHOICE`.

## Difficulty multipliers (engine-applied)

| Modifier | Easy | Normal | Hard |
|---|---:|---:|---:|
| Monster HP | 0.75 | 1.0 | 1.30 |
| Monster attack | 0.80 | 1.0 | 1.25 |
| Upgrade cost | 0.85 | 1.0 | 1.20 |
| Daily income | 1.15 | 1.0 | 0.90 |
| Repair cost | 0.90 | 1.0 | 1.15 |
| Event gold costs | 0.85 | 1.0 | 1.15 |

Effect magnitudes (e.g. −18 HP) stay absolute in v1.

## BE checklist (wiring later)

1. `createRun` accepts `difficulty`; call `createInitialState({ runId, difficulty })`.
2. Persist full v4 blob including `pendingConsequences` and `rewardsChosenByWave`.
3. Stop hardcoding `[3,7,13,17]` / `[10,20]` in validators — use engine helpers / integer day range 1–100.
4. AI schema: 2–4 choice labels; optional continuation context when `isConsequence`.
5. Adapter trust gate: validate `eventPlan` / active event against engine packages; reject foreign effects.

## FE checklist (wiring later)

1. New game difficulty selector → create-run payload.
2. Calendar copy: “100 days” / wave N of 10.
3. Event UI: map `activeEvent.choices` (variable length); show consequence badge if `isConsequence`.
4. Reward UI: bind to current wave’s three options (not legacy `reward-gold` ids).
5. Display `difficulty`, upcoming wave via `getWavePreview` or BE view.
6. Do not hardcode event days or choice ids.

## Verify engine locally

```bash
npm run typecheck
npm test
```

Focus: `src/game/game.test.ts`.
