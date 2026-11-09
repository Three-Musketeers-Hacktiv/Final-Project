# Engine → Backend contract (consequence trust + narrative labels)

Companion: [CAMPAIGN_100_DAY_CONTRACT.md](./CAMPAIGN_100_DAY_CONTRACT.md). This document is the wiring spec. Do **not** accept every package that merely exists in `eventPackageById`.

Engine helpers (import from `src/game`):

```ts
import {
  CONSEQUENCE_SUCCESSOR,
  decorateActiveEvent,
  isTrustedConsequencePackage,
  labelStatesCurrencyAmount,
  trustedChoiceLabel,
} from "../src/game";
```

## Why equality is wrong

A skip choice stores `consequence.packageId` as the **origin** package (example `c-raid-wave1`). If no prep day remains before that package’s target wave, `scheduleConsequence` walks `CONSEQUENCE_SUCCESSOR` and persists the **scheduled** package (example `c-raid-wave2` on run `late-3`).

The validator **must** call `isTrustedConsequencePackage(originChoice.consequence.packageId, pending.packageId)`. Do **not** require `pending.packageId === originChoice.consequence.packageId`. Equality rejects a legal successor.

`isTrustedConsequencePackage(origin, scheduled)` is true when `scheduled === origin` or `scheduled` is reached by walking `CONSEQUENCE_SUCCESSOR` forward, with a cycle guard. Reverse links and other families are false:

```ts
isTrustedConsequencePackage("c-raid-wave1", "c-raid-wave2"); // true
isTrustedConsequencePackage("c-raid-wave1", "c-raid-mid"); // true (further along the same chain)
isTrustedConsequencePackage("c-raid-wave2", "c-raid-wave1"); // false
isTrustedConsequencePackage("c-raid-wave1", "c-unrest-mid"); // false
isTrustedConsequencePackage("c-raid-wave1", "c-foreign"); // false
```

## Identity

Consequence id format, exact:

```text
${packageId}::${originEventId}::${originChoiceId}::${triggerDay}
```

| Record | Accept | Reject |
|---|---|---|
| `pendingConsequences[]` | `id` matches the four fields; `eventPackageById(packageId)` exists; origin event is on this run’s `eventPlan`; origin choice exists and has `consequence`; `isTrustedConsequencePackage(originChoice.consequence.packageId, pending.packageId)`; `triggerDay` is an integer prep day; ids are unique | foreign package, broken chain, duplicate id, non-prep day, id/field mismatch |
| `completedEventIds` | id is a planned `eventId`, or a consequence id that passes the same trust check | anything else; duplicates |
| `activeEvent` when `isConsequence` | `eventId === pending.id`, `packageId === pending.packageId`, `day === pending.triggerDay`, origin ids match that pending | active package that is not the stored pending |
| `activeEvent` when scheduled | `eventId` / `packageId` match the plan entry for `activeEvent.day` | foreign package |

Do not replace this with “any known package id”. A known package that is not the origin and not on its successor chain is still invalid.

## Narrative adapter

- Ask the model for title, description, and labels only. Tell it not to put a currency amount in choice labels. The effective price is `activeEvent.choices[].goldCost`.
- Merge with `decorateActiveEvent`. `labelStatesCurrencyAmount` is true for any supported currency term (`gold`, `coin`/`coins`, `treasury`, `gp`), not only a parsed price. `trustedChoiceLabel` then keeps the engine label. That fallback is normal, not an error.
- Do not scan description text. Do not regex-replace prices yourself. Do not write `goldCost` from the model.
- Local engine labels may still contain the materialized `{goldCost}` number. That string is produced by `scaleChoicesForDifficulty`, not by the model.

### No AI API: reuse a stored narrative

If the AI API is not configured (no provider, no API key, or the client cannot be constructed), do **not** call the model. Load a narrative that AI already wrote and that was saved in the database, then attach it with the same engine merge.

Lookup, in order:

1. **This run.** If `runs_event` (or the run document) already stores a narrative for this `eventId` — scheduled id or consequence id `packageId::originEventId::originChoiceId::triggerDay` — use that copy. Do not overwrite it with a newer generation.
2. **Shared catalog.** Otherwise query `event_data` by `gameRulesetId` + `packageId` + `day`, `source: "ai"`. For a consequence, `packageId` is the scheduled package (`c-raid-wave2`), not the origin package (`c-raid-wave1`). Pick one validated document. Reuse keeps `source: "ai"`.
3. **Engine labels.** If neither store has a match, use the active event’s engine title, description, and labels (`source: "fallback"`). Do not invent a story.

The same catalog lookup applies when a configured API call fails (timeout, 5xx, invalid JSON) before step 3.

Stored text is narrative only. Ignore any gold, HP, or effect numbers in the database document. After load, run `decorateActiveEvent` so choice ids stay trusted and a currency amount in a stored label is replaced by the engine label. Costs and effects stay on the live `activeEvent` from the engine. Do not apply effects when the narrative is read.

## Integration test the backend should add

Do not change the engine for this test. Reproduce run `late-3`:

1. `createInitialState({ runId: "late-3" })`. Decade-1 event days are 6 and 8.
2. On each of those days, `chooseEventOption` the free choice that has `consequence` (origin package `c-raid-wave1`).
3. Assert one `pendingConsequences` entry has `packageId === "c-raid-wave2"` and `isTrustedConsequencePackage("c-raid-wave1", "c-raid-wave2")` is true. An equality check against `c-raid-wave1` must not be what accepts it.
4. Persist the state blob, load it, and run the adapter trust gate (`assertSupportedState` or the load path). Expect success: action → persist → load.
5. The same gate must still reject a pending package `c-foreign`, a reverse chain such as scheduled `c-raid-wave1` from origin `c-raid-wave2`, and a duplicated pending id.

Until the adapter uses `isTrustedConsequencePackage`, step 4 fails on a valid engine save. That is an adapter bug, not an engine bug.
