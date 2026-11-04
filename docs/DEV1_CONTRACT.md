# Developer 1 — Game Engine Contract

Engine-only package. No React UI and no mock HTTP server in this repo.

Defaults (supersede older PRD bits where they conflict):

- City upgrade raises **attack and defense** together.
- No troop recruitment in the engine API.
- Event “recruitment discount” is replaced by **upgrade discount**.
- Phases: `preparation` | `event` | `battleReady` | `battleReport` | `reward` | `gameOver` | `victory`.
- Playtest delta vs AGENTS table: `dailyIncome` is **25** (table had 15).
- Older PRD/MVP docs still mention troops/wall-only upgrades; those are **not** implemented here.

## API (`src/game`)

```ts
import {
  createInitialState,
  getEffectiveStats,
  upgradeCity,
  repairCity,
  endPreparationDay,
  startBattle,
  continueFromReport,
  chooseEventOption,
  chooseReward,
  attachActiveEvent,
  ensureLocalEvent,
} from "./game";

const state = createInitialState();
const stats = getEffectiveStats(state);
const upgraded = upgradeCity(state); // { ok, state } | { ok:false, error:{code,message} }
```

- Engine is pure: no React, DOM, `fetch`, `localStorage`, timers, or `process.env`.
- State is JSON-serializable (`version: 1`).
- Effects come only from trusted packages in `config.ts`. UI/AI layers may attach narrative labels after validating IDs against those packages.
