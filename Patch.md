# Patch — Game Engine (`version: 3` → `version: 4`)

**Baseline:** engine playtest `version: 3` (20 days / 2 waves)  
**Target:** current `src/game` (`version: 4`, 100 days / 10 waves)  
**Wiring:** [docs/CAMPAIGN_100_DAY_CONTRACT.md](./docs/CAMPAIGN_100_DAY_CONTRACT.md) · [docs/FOR_FRONTEND.md](./docs/FOR_FRONTEND.md) · [docs/FOR_BACKEND.md](./docs/FOR_BACKEND.md) · [docs/DEV1_CONTRACT.md](./docs/DEV1_CONTRACT.md)

Earlier v1→v3 notes remain historically useful below the fold in git history; this document is the **v3→v4** checklist FE/BE must adopt.

---

## 1. Summary

| Area | v3 | v4 |
|---|---|---|
| Save format | `version: 3` | **`version: 4`** (no migrate) |
| Calendar | `lastDay: 20`, battles 10/20 | **`lastDay: 100`**, battles 10…100 |
| Difficulty | none | `easy` \| `normal` \| `hard` |
| Event days | Fixed 3/7/13/17 | **2 prep days / decade** via `pickEventPlan(runId)` |
| Event choices | Tuple of 2 | **Array length 2–4** |
| Consequences | none | `pendingConsequences` + delayed packages |
| Rewards | Wave 1 only; `rewardChosenId` | Waves **1–9**; `rewardsChosenByWave` |
| Economy | max 5, 50+20×L, income 25, repair 30 | max **18**, **45+30×L**, income **28**, repair **25/60** |
| Effects | 4 kinds | + `healCity`, `maxHpBonus` |
| Reward kinds | 3 | + heal / defense / maxHP / combo |

---

## 2. State migration map

Do **not** load v3 into v4. Create a new run with `createInitialState({ runId, difficulty })`.

| v3 field | v4 field | Notes |
|---|---|---|
| `version: 3` | `version: 4` | Reject unsupported versions at BE |
| — | `difficulty` | Required from product create-run |
| `eventPlan` (4 entries) | `eventPlan` (20 entries) | Days chosen per decade |
| — | `pendingConsequences` | Starts `[]` |
| `rewardChosenId` | `rewardsChosenByWave` | Map wave → reward id |
| `activeEvent.choices` pair | `choices[]` length 2–4 | May set `isConsequence` |
| `effects.defenseByWave` `{1?,2?}` | `Record<number, number>` | Waves 1–10 |
| `BattleResult.wave` `1\|2` | `number` | 1–10 |

---

## 3. Public API

### Keep

- `upgradeWall` / `upgradeTroops` / `upgradeCity` / `repairCity`
- `endPreparationDay` / `startBattle` / `continueFromReport` / `surrender`
- `chooseEventOption` / `chooseReward`
- `attachActiveEvent` / `ensureLocalEvent` / `decorateActiveEvent`
- `pickEventPlan` / `resolveEventPackage` / `getEffectiveStats` / `getWavePreview`

### Create run

```ts
createInitialState({ runId, difficulty?: "normal" })
```

### New helpers

- `rewardsForWave(wave)`
- `eventPackagesForDecade(decade)`
- `shiftPlanEntryDay` (collision helper; exported for tests/adapters — does not delete entries)
- `isDifficulty` / `getDifficultyModifiers` / calendar helpers (`nextBattleDay`, …)
- **Not public:** `enterCalendarDay` (module-internal; use `endPreparationDay` / `chooseReward`)

### Return type

Unchanged: `ActionResult` = `{ ok: true; state } | { ok: false; error }`. Successful paths bump `revision`.

---

## 4. Event plan (breaking)

- **No** fixed days 3/7/13/17.
- Each decade: hash picks 2 prep days (skip day 1, prefer avoid last pre-battle day, min gap 2).
- Packages pooled by **decade**, not by calendar day.
- Same `runId` ⇒ same days + packages.
- Consequence collision: consequence wins; scheduled entry shifts forward (later decade if needed — never silently deleted). New consequences prefer free days; defer to the next prep segment when the current one is full.

---

## 5. Rewards (breaking)

Legacy ids `reward-gold` / `reward-income` / `reward-discount` are **gone**.

Use per-wave ids (`w1-income`, `w2-gold`, …). After wave N (1–9) only that wave’s trio is valid. Wave 10 → victory, no reward.

---

## 6. Economy & difficulty

- Cost: difficulty scale then `ceil(cost × (1 − discount))`; repair never discounted.
- Event **gold costs** scale by difficulty; effect magnitudes stay absolute.
- Monster HP/ATK: `Math.max(1, Math.round(base × modifier))` at battle/preview time.

---

## 7. Calendar / battle / reward flow

```text
prep days → optional event/consequence → battle every 10th day
wave 1–9 win → report → reward → next prep day
wave 10 win → report → victory
HP 0 → gameOver
```

---

## 8. FE / BE checklist

**Frontend**

- [ ] Difficulty on new game
- [ ] 100-day / wave N of 10 copy
- [ ] Variable 2–4 event choices + consequence badge
- [ ] Per-wave reward buttons from current wave set
- [ ] Drop hardcoded event days and old reward ids
- [ ] After `chooseEventOption`, re-read `phase`/`activeEvent` (same-day chain may keep `event`)
- [ ] Display `activeEvent.choices[].goldCost` as charged cost (already difficulty-scaled)
- [ ] Never call `enterDay` / `enterCalendarDay`

**Backend**

- [ ] Persist `version: 4` + new fields
- [ ] Create-run `difficulty`
- [ ] Loosen day validators to 1–100 / engine helpers
- [ ] AI schema 2–4 labels + consequence continuation context
- [ ] Reject v3 saves
- [ ] After `chooseEventOption`, regenerate narrative if `activeEvent` is still set / `eventId` changed
- [ ] `ensureLocalEvent` on load when mandatory event unfinished but `activeEvent` is null
- [ ] Do not expose or call `enterCalendarDay`
- [ ] Pass effective `goldCost` from `activeEvent` to AI; decorate labels only

---

## 9. v4 bugfix — consequence queue / calendar API / event gold

Engine-only fix (save `version: 4` unchanged). Details for FE/BE: [FOR_FRONTEND.md](./docs/FOR_FRONTEND.md) · [FOR_BACKEND.md](./docs/FOR_BACKEND.md).

| Topic | Rule |
|---|---|
| Consequence scheduling | Never share `triggerDay` with another pending or scheduled day when a free prep day exists. Prefer delay window → rest of segment → **defer to next prep segment** after battle. Do not silently drop. |
| Same-day queue | After `chooseEventOption`, engine may immediately activate the next unfinished consequence/scheduled event for the **same day** (`phase: "event"`, new `activeEvent`). Callers must not assume one event per day. |
| Plan shift | `shiftPlanEntryDay` moves scheduled entries forward (later decade if needed); it does **not** delete them when the current segment is full. |
| Calendar API | `enterCalendarDay` is **engine-internal only** (not exported from `src/game`). Advance only via `endPreparationDay` / `chooseReward`. |
| Event gold | Package config keeps **base** `goldCost` and `{goldCost}` in paid labels. Activation fills the label with the **effective** cost. Charge uses the same scale from the trusted package (once). Free stays `0`. An AI label that names a different gold amount is discarded. |
| Consequence wave | Prefer a prep day before `CONSEQUENCE_TARGET_WAVE`. If that window is full, schedule `CONSEQUENCE_SUCCESSOR`. Apply-time clamp sends stale defense/discount to the upcoming wave. |
| Late-game balance | Normal wave table is 150/22 through 600/64; hard monster HP 1.05 / ATK 1.03, upgrade 1.08, income 0.95, repair 1.05. Wall defense +3 and city MaxHP +35. Save `version` stays 4; suggested ruleset id `campaign-v4-100-day-v2`. |

---

## 10. Verify

```bash
npm run typecheck
npm test
```

Engine tests: `src/game/game.test.ts` (calendar, difficulty, plan, consequences, queue/chain, event gold, rewards, victory fixture).
