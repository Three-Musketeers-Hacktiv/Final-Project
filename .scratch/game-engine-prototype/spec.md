# Game Engine Prototype

Status: ready-for-agent

## Problem Statement

Tim membutuhkan mesin permainan TypeScript murni untuk kampanye prototipe 20 hari agar Frontend dan Backend dapat mengintegrasikan UI Next.js dan MongoDB tanpa menyalin rumus ekonomi, battle, atau transisi. Saat ini aturan tersebar di dokumen yang sempat bertentangan (rekrutmen vs upgrade kota), dan belum ada spek engine utuh yang mengunci model produk disepakati: upgrade kota menaikkan attack dan defense, tanpa pasukan, dengan event terjadwal yang mengubah trajectory kota.

## Solution

Bangun game engine murni dengan satu API publik: state masuk, aksi diterapkan, state baru atau error terstruktur keluar. Engine menutupi kalender 20 hari, ekonomi upgrade/repair, event berpaket, battle deterministik dua wave, reward setelah wave pertama, serta kondisi menang/kalah. Persistensi, auth, AI narasi, dan UI produk tetap di luar engine; mereka memanggil API yang sama dengan yang diuji.

## User Stories

1. As a player, I want day-1 income applied exactly once when a run starts, so that starting gold is consistent.
2. As a player, I want income once per preparation day, so that the economy follows the calendar.
3. As a player, I want no income on battle days 10 and 20, so that shopping pressure stays fair.
4. As a player, I want at most one successful economic action per preparation day, so that each upgrade or repair choice matters.
5. As a player, I want failed actions to leave my daily action available, so that I can try a valid alternative.
6. As a player, I want to skip spending and advance the day, so that I can save gold.
7. As a player, I want unused actions not to carry over, so that the daily limit stays clear.
8. As a player, I want city upgrades to raise both attack and defense, so that one shop path strengthens the city.
9. As a player, I want upgrade costs to rise with level and respect max level, so that progression has a ceiling.
10. As a player, I want repair to restore limited HP without exceeding max HP, so that healing is bounded.
11. As a player, I want repair rejected when HP is full, so that I do not waste gold.
12. As a player, I want insufficient gold rejected without changing state, so that mistakes are safe.
13. As a player, I want effective attack and defense derived from base stats, upgrade level, and active effects, so that totals cannot drift.
14. As a player, I want scheduled events on days 3, 7, 13, and 17 with exactly two choices, so that story moments feel regular like a life-sim pause.
15. As a player, I want at least one free event choice, so that I am never soft-locked by gold.
16. As a player, I want paid event choices rejected when gold is short, so that costs are honest.
17. As a player, I want unfinished events to block shopping and day advance, so that I cannot skip consequences.
18. As a player, I want event effects applied once (gold, damage, wave defense, upgrade discount), so that bonuses are predictable.
19. As a player, I want fatal event damage to end the run immediately, so that risk is real.
20. As a player, I want next-wave threat stats visible during preparation, so that spending is informed.
21. As a player, I want battles to resolve with simultaneous damage and minimum one damage to the city, so that fights cannot soft-lock.
22. As a player, I want both sides at zero on the same round to count as defeat, so that ties favor the monster.
23. As a player, I want battle computed once and stored, so that replay or refresh does not damage the city again.
24. As a player, I want remaining city HP to carry after a won wave, so that prep between waves matters.
25. As a player, I want a battle report after each wave, so that I understand what happened.
26. As a player, I want exactly one of three rewards after winning wave 1, so that mid-run strategy shifts.
27. As a player, I want reward income or upgrade-discount bonuses to apply only on valid later preparation days, so that expiry is clear.
28. As a player, I want wave 2 victory without an extra reward, so that the finale stays clean.
29. As a player, I want city HP zero from any source to be game over, so that loss conditions are unified.
30. As a player, I want ended games to reject further gameplay actions, so that results stay final.
31. As a frontend developer, I want stable error codes from failed actions, so that the UI can explain rejections.
32. As a frontend developer, I want selectors for costs and effective stats, so that I never hardcode formulas.
33. As a backend developer, I want JSON-serializable GameState aligned with game_runs.state, so that Mongo persistence is straightforward.
34. As a backend developer, I want revision to increment only on successful state changes, so that optimistic concurrency can be layered later.
35. As a backend developer, I want effects and choices driven by trusted packages, so that AI narrative cannot invent mechanics.
36. As an engine developer, I want pure functions with no React, DOM, fetch, localStorage, timers, or env access, so that tests stay deterministic.
37. As an engine developer, I want a 20-day integration test through public actions only, so that the full campaign is verified without state jumps.
38. As a product owner, I want recruitment and wall-only upgrades excluded, so that the prototype matches the agreed simplified model.
39. As a product owner, I want the prototype fixed at 20 days / 2 waves, so that the team can ship before expanding to a 50-day production ruleset.
40. As a teammate, I want documented public API and phase names shared with FE/BE, so that integration does not fork rules.

## Implementation Decisions

- Build the pure engine modules covering types, centralized config, initial state, derived stats selectors, calendar helpers, economy actions, deterministic battle, effect application, event choice handling, rewards, phase transitions, and a public export surface.
- Public API seam (approved): `createInitialState`, `getEffectiveStats` (and related cost/preview selectors), `upgradeCity`, `repairCity`, `endPreparationDay`, `attachActiveEvent` / `ensureLocalEvent`, `chooseEventOption`, `startBattle`, `continueFromReport`, `chooseReward`. Callers never jump to an arbitrary day.
- Result shape: successful actions return a new state; failures return structured `{ code, message }` without mutating the input state. Successful gameplay changes increment `revision` once; errors and no-ops do not.
- Persistable state shape (from agreed contract / prototype docs) — decision-rich excerpt:

```ts
type GameState = {
  version: 2;
  revision: number;
  runId: string;
  day: number;
  phase: "preparation" | "event" | "battleReady" | "battleReport" | "reward" | "gameOver" | "victory";
  gold: number;
  cityHp: number;
  cityMaxHp: number;
  upgradeLevel: number;
  actionUsedToday: boolean;
  incomeGrantedDays: number[];
  completedEventIds: string[];
  activeEvent: ActiveEvent | null;
  effects: ActiveEffects;
  wavesCleared: number;
  battleResult: BattleResult | null;
  rewardChosenId: string | null;
};
```

- Economy: city upgrade raises attack and defense together; repair is separate; no troop recruitment; upgrade discount replaces any former recruit discount; discounts do not stack (max rate); ceil after discount; discount does not apply to repair.
- Calendar: preparation days 1–9 and 11–19; battles on 10 and 20; events on 3, 7, 13, 17; max one successful economic action per preparation day; event resolution stays on the same day without extra income or action reset.
- Battle: pure function from city/monster snapshot; simultaneous damage; city damage `max(1, monsterAttack - effectiveDefense)`; store full log in `battleResult`; reject invalid configs; never re-resolve when result already present.
- Flow: wave 1 win → report → mandatory reward → day 11 with reward bonuses active before day-11 income; wave 2 win → victory; city HP 0 → gameOver from any source.
- Config holds all balancing numbers and event/reward packages; engine trusts packages, not arbitrary UI/AI numbers. Playtest income may differ from the AGENTS table — single value lives in config and is documented in the contract.
- Engine does not write Mongo, open HTTP, or render UI. Backend later loads state, calls engine, commits `game_runs` / `game_actions` / `game_properties`; Frontend displays selectors and sends action intents.
- Related work: day-advance hardening and controller dedupe live under the separate feature “pengamanan-transisi-hari”. This spec owns game rules completeness for the 20-day prototype; do not re-implement controller `actionId` / `expectedRevision` here unless missing and required to export a minimal pure API.
- Production 50-day campaign (PRD §12) is a future ruleset after this prototype is accepted; keep schedules config-driven so expansion does not require rewriting action APIs.

## Testing Decisions

- Good tests assert observable behavior at the **public engine API** only (approved single seam): resulting `GameState` fields and stable error codes. Do not export internals solely for tests. Do not assert helper call order or private structure.
- Prefer Vitest (or the repository’s existing runner once present). Prior art: behavioural suites described under pengamanan-transisi-hari and the mandatory cases in AGENTS (income, economy, battle edges, events, rewards, serialization, no re-battle on reload, 20-day integration).
- Cover: day-1 and preparation income once; no income on 10/20; one successful economic action per day; failed actions preserve action slot; upgrade cost curve and caps; repair partial/full/reject; simultaneous battle, defense > attack, overkill, mutual KO; wave 1 → reward → day 11; wave 2 → victory; game over paths; event invalid/insufficient gold/fatal HP/no double apply; reward once and timed bonuses; discount non-stacking and ceil; input state unchanged on failure; JSON round-trip; stored battle report not reapplied; one integration run of days 1–20 via real public actions (planned upgrades/repairs must assert success, not silently skip failures).
- Do not require Mongo, browser, or E2E frameworks for this feature’s acceptance.

## Out of Scope

- Product Frontend pages, animations, and auth UI.
- MongoDB drivers, Next.js route handlers, sessions, password hashing.
- Live AI narrative generation and API keys (local/fixture packages only inside engine).
- Full mock harness / mock HTTP server (optional later; not required to close this spec).
- Controller-layer duplicate `actionId` / stale revision enforcement beyond what the pure API already guarantees (owned by pengamanan-transisi-hari).
- Save migration from unsupported older versions (separate ticket in related feature).
- Recruitment, formations, mana, individual troop HP.
- Player-selectable day counts; 50-day / 100-day production campaigns.

## Further Notes

Glossary terms to keep consistent with docs: run, revision, version (save format), phase, packageId, wave, effects, ruleset. Domain docs live under `docs/agents/` and `docs/database/`; product rules in PRD/MVP v2; module map in `plans/game-engine-modules.md`.

Status `ready-for-agent` means the specification is ready for implementation tickets, not that code has been written.
