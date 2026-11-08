# Patch — Game Engine (`development-game-engine` → current)

**Baseline:** branch `development-game-engine` (`cc9840e`)  
**Target:** current `src/game` (save `version: 3`)  
**Wiring:** [docs/FOR_FRONTEND.md](./docs/FOR_FRONTEND.md) · [docs/FOR_BACKEND.md](./docs/FOR_BACKEND.md) · [docs/DEV1_CONTRACT.md](./docs/DEV1_CONTRACT.md)

This document lists **breaking and behavioral changes** FE/BE must adopt when swapping the old engine for the new one. Rules stay inside `src/game`; callers only dispatch actions and render state.

---

## 1. Summary

| Area | Old (`development-game-engine`) | New (current) |
|---|---|---|
| Save format | `version: 1` | `version: 3` (no migrate from v1/v2) |
| Upgrades | Single `upgradeLevel` → ATK+DEF | Three tracks: `wallLevel` (DEF), `troopLevel` (ATK), `cityLevel` (MaxHP+income) |
| Economy API | `upgradeCity` only | `upgradeWall` / `upgradeTroops` / `upgradeCity` + `repairCity` |
| Day jump | Public `enterDay(day)` | **Removed** — only `endPreparationDay` / `chooseReward` |
| Income marker | `incomeGrantedForDay: number \| null` | `incomeGrantedDays: number[]` |
| Revision | None | `revision` increments on every successful mutating action |
| Effects | snake_case (`gold_gain`, …) | camelCase (`grantGold`, …) |
| Active effects shape | Arrays + `sourceId` | Flat: `defenseByWave`, single discount rate, `prepIncomeBonus` |
| Events | 1 fixed package per day | Pool of **2 packages/day**; run picks via `eventPlan` seeded by `runId` |
| Event IDs | `event-day-3`, `event-day-3-a` | Dynamic, e.g. `event-day-3-scouts`, `day3-scouts-pay` |
| ActiveEvent | `choiceIds` + narrative fields | Full `choices` (costs/effects from trusted package) + `eventId` |
| Narrative overlay | Not in engine | `decorateActiveEvent(state, overlay)` (labels only) |
| Rewards | `applyReward` / kinds `gold` \| `income_bonus` \| `upgrade_discount` | `chooseReward` / kinds `grantGold` \| `prepIncomeBonus` \| `upgradeDiscount` |
| Battle result | No `day` / HP-lost fields | Adds `day`, `cityHpLost`, `monsterHpLost` |
| Config export | `GAME_CONFIG`, `EVENT_PACKAGES`, `WAVES` | `gameConfig` (+ helpers: `eventPackagesForDay`, `pickEventPlan`, …) |
| Copy | Mixed / ID-centric | English fixture copy (“my lord”) |
| Errors | No `INVALID_TRANSITION` | Adds `INVALID_TRANSITION` |

---

## 2. State migration map

Do **not** load old saves into the new engine. Create a new run with `createInitialState`.

| Old field | New field | Notes |
|---|---|---|
| `version: 1` | `version: 3` | Reject unsupported versions at BE boundary |
| — | `revision: number` | Starts at `0`; +1 per successful action |
| `upgradeLevel` | `wallLevel` + `troopLevel` + `cityLevel` | All start at `0` |
| `incomeGrantedForDay` | `incomeGrantedDays` | List of prep days that already got income |
| — | `eventPlan: EventPlanEntry[]` | Built at create: `pickEventPlan(runId)` |
| `activeEvent.choiceIds` | `activeEvent.choices` | Full choice objects; pick by `choice.id` |
| `activeEvent.packageId` only | `eventId` + `packageId` | Completion uses `eventId` in `completedEventIds` |
| Effect types snake_case | camelCase union | See §4 |
| `effects.defenseBonuses[]` | `effects.defenseByWave` | `{ 1?: number; 2?: number }` |
| `effects.upgradeDiscounts[]` | `upgradeDiscountRate` + `upgradeDiscountUntilWave` | Max rate wins; no stack |
| `effects.incomeBonus` | `effects.prepIncomeBonus` | Days 11–19 only |

---

## 3. Public API rename / replace

### Keep (same role)

- `createInitialState`
- `repairCity`
- `endPreparationDay`
- `startBattle`
- `continueFromReport`
- `attachActiveEvent` / `ensureLocalEvent` / `chooseEventOption`
- `getEffectiveStats` (shape changed — see below)

### Replace

| Old | New |
|---|---|
| `upgradeCity` (ATK+DEF) | `upgradeWall` / `upgradeTroops` / `upgradeCity` (MaxHP+income) |
| `enterDay(state, day)` | **Gone** — advance only via `endPreparationDay` or `chooseReward` |
| `applyReward(state, id)` | `chooseReward(state, id)` |
| `previewWave` / `WAVES` | `getWavePreview(state)` / `gameConfig.waves` |
| `createRunId()` in engine | Pass `runId` into `createInitialState({ runId })` (caller/BE owns ID) |
| `incomeForDay` | Internal; use `getEffectiveStats(state).dailyIncome` for display |
| `resolveBattle` as public flow | Prefer `startBattle` (engine stores result once) |

### New exports

- `pickEventPlan(runId)` / `resolveEventPackage(day, plan?)`
- `decorateActiveEvent(state, overlay)`
- `eventPackagesForDay` / `eventPackageById` / `scheduledEventDays`
- `getUpgradeCost(state, track)` / `getRepairCost()` / `getEffectiveAttack` / `getEffectiveDefense`

### Return type

Old: `ActionResult<GameState>`  
New: `ActionResult` = `{ ok: true; state } | { ok: false; error: { code; message } }`  
Successful paths always bump `state.revision`.

---

## 4. Effect & reward enums

| Old `Effect.type` | New |
|---|---|
| `gold_gain` | `grantGold` |
| `city_hp_loss` | `damageCity` |
| `defense_bonus` | `nextWaveDefense` |
| `upgrade_discount` | `upgradeDiscount` |

| Old `RewardOption.kind` | New |
|---|---|
| `gold` | `grantGold` |
| `income_bonus` | `prepIncomeBonus` |
| `upgrade_discount` | `upgradeDiscount` |

Reward IDs unchanged: `reward-gold`, `reward-income`, `reward-discount`.

---

## 5. Event plan & IDs (breaking for Postman / FE)

Each scheduled day (`3, 7, 13, 17`) has **two** trusted packages. At `createInitialState`, the engine fills `eventPlan` with one package per day using a stable hash of `runId`.

**Do not hardcode** old IDs (`event-day-3`, `event-day-3-a`, `day3-pay`, …).

| Day | Package pool (`packageId` = `eventId`) |
|---:|---|
| 3 | `event-day-3-scouts`, `event-day-3-envoy` |
| 7 | `event-day-7-supplies`, `event-day-7-labor` |
| 13 | `event-day-13-caravan`, `event-day-13-guild` |
| 17 | `event-day-17-barricades`, `event-day-17-watchfires` |

Choice IDs follow the package, e.g. `day3-scouts-pay` / `day3-scouts-skip`.  
UI and API clients must read `activeEvent.choices[].id` (or prepared narrative choices that reuse those IDs).

AI / mock narrative may change **title, description, labels only**. Costs and effects always come from `config.ts` via `packageId`.

---

## 6. Economy & stats behavior

- One successful economic action per preparation day: wall **or** troops **or** city **or** repair.
- Cost: `ceil((50 + level × 20) × (1 − discount))`; discount applies to all three tracks; **not** to repair.
- City upgrade: `cityMaxHp += 20`, `cityHp += 20` (capped at max) — not a full heal.
- Track bonuses: wall DEF +2, troops ATK +5, city MaxHP +20 and daily income +8 per level; max level 5.
- Playtest `dailyIncome`: **25** (not the older AGENTS table value of 15).
- Effective stats selector now returns `wallCost`, `troopCost`, `cityCost`, `repairCost`, `dailyIncome` (no single `upgradeCost`).

---

## 7. Calendar / battle / reward flow (unchanged intent, stricter API)

```text
prep (1–9) → events 3,7 → battleReady 10 → battleReport → reward → day 11
prep (11–19) → events 13,17 → battleReady 20 → battleReport → victory
```

- Unresolved scheduled event blocks spend and `endPreparationDay` → `EVENT_REQUIRED`.
- `startBattle` computes once; reload must not re-apply damage (`BATTLE_ALREADY_RESOLVED`).
- Wave 1 win → `continueFromReport` → `reward` → `chooseReward` enters day 11 with income.
- Wave 2 win → `continueFromReport` → `victory` (no second reward).
- City HP 0 → `gameOver` from any source.

Removed: arbitrary `enterDay` jumps (were used to seed day 1). Day 1 income is applied inside `createInitialState` only.

---

## 8. Files added / changed in `src/game`

| File | Change |
|---|---|
| `types.ts` | v3 state, tracks, camelCase effects, `eventPlan` |
| `config.ts` | `gameConfig`, 8 event packages, English copy |
| `eventPlan.ts` | **new** — `pickEventPlan`, `resolveEventPackage` |
| `narrative.ts` | **new** — `decorateActiveEvent` |
| `economy.ts` | three upgrade entry points |
| `events.ts` / `transitions.ts` / `calendar.ts` / `initialState.ts` | plan-aware |
| `index.ts` | new public surface |
| `game.test.ts` | dynamic choice IDs + plan determinism |
| `result.ts` | shared `ok` / `fail` |

---

## 9. FE / BE checklist

**Frontend**

- [ ] Bind three upgrade buttons + repair; drop single “upgrade city (ATK+DEF)” control
- [ ] Render `wallLevel` / `troopLevel` / `cityLevel` and costs from selectors or BE view
- [ ] Event UI: use `activeEvent.choices` IDs from server state (never legacy hardcoded IDs)
- [ ] Reward kinds / labels from state or trusted config IDs only
- [ ] Map new error `INVALID_TRANSITION`
- [ ] Show `revision` only if debugging; always apply responses against latest state

**Backend**

- [ ] Persist `GameState` v3 including `eventPlan` and `revision`
- [ ] Reject / recreate runs still on v1 (`upgradeLevel`)
- [ ] Action router: map client actions to new function names (§3)
- [ ] Remove any `enterDay` usage
- [ ] On create run: `createInitialState({ runId })` then optional narrative pre-gen using `eventPlan`
- [ ] Apply AI text only through `decorateActiveEvent` (or equivalent merge that keeps costs/effects)
- [ ] Dedupe with client `actionId`; use `revision` to reject stale writes

---

## 10. Verify

```bash
npm run typecheck
npm test
```

Engine tests: `src/game/game.test.ts` (12 cases) covering income, economy, battle, events, rewards, and plan determinism.
