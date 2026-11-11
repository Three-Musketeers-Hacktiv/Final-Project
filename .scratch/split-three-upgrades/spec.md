# Split Three Upgrades

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../PRD.md).

Status: ready-for-agent

## Problem Statement

Pemain dan tim playtest ingin keputusan belanja yang lebih bermakna: memperkuat pertahanan, daya serang, atau ketahanan/ekonomi kota sebagai jalur terpisah. Engine saat ini hanya punya satu `upgradeLevel` yang menaikkan attack dan defense sekaligus, sehingga tidak ada cara menaikkan MaxHP atau income lewat upgrade, dan UI/auto-run hanya mengenal satu tombol upgrade.

## Solution

Ganti upgrade tunggal dengan tiga jalur berbayar yang berbagi satu slot aksi ekonomi harian: tembok (defense), pasukan (attack), dan kota (MaxHP + income harian). Repair tetap ada untuk memulihkan HP rusak. Diskon upgrade dari event/reward berlaku ke ketiga jalur. State format naik ke version 3; save lama ditolak atau diganti permainan baru. Try UI menampilkan tiga tombol; auto-run memakai prioritas pasukan → tembok → kota.

## User Stories

1. As a player, I want to upgrade the wall to raise defense only, so that I can specialize against strong monster attacks.
2. As a player, I want to upgrade troops to raise attack only, so that I can clear waves faster.
3. As a player, I want to upgrade the city to raise max HP and daily gold income, so that survival and economy scale together.
4. As a player, I want city upgrade to also fill current HP by the max-HP increase amount (not a full heal), so that the investment is felt immediately without replacing repair.
5. As a player, I want repair to remain available as a separate action, so that battle damage can be healed without buying max HP.
6. As a player, I want at most one successful economic action per preparation day across wall, troops, city, and repair, so that each day forces a real choice.
7. As a player, I want a failed upgrade or repair to leave my daily action available, so that I can try another valid spend.
8. As a player, I want each track to have its own level from 0 to a max of 5, so that progression per path is clear.
9. As a player, I want upgrade costs to rise with that track’s current level using the shared base/step curve, so that late levels stay expensive.
10. As a player, I want insufficient gold and max-level upgrades rejected without changing state, so that mistakes are safe.
11. As a player, I want effective attack derived from troop level (plus base), so that wall/city upgrades do not silently change damage.
12. As a player, I want effective defense derived from wall level (plus base and wave defense effects), so that troop/city upgrades do not silently change mitigation.
13. As a player, I want preparation-day income to include city-level income bonus on top of base daily income and any timed reward bonus, so that city investment pays out over the calendar.
14. As a player, I want upgrade discounts from events or rewards to reduce the cost of any of the three upgrade tracks, so that “logistics” bonuses stay useful.
15. As a player, I want repair costs never discounted by upgrade discounts, so that healing stays a distinct economy lever.
16. As a player, I want discounts still non-stacking (highest rate wins) and ceil after discount, so that pricing stays predictable.
17. As a player, I want to see each track’s level and next cost in the try UI, so that I can plan spends.
18. As a player, I want three upgrade buttons plus repair in the try UI, so that I can exercise all paths manually.
19. As a player, I want auto-run’s optional auto-upgrade to pick troops, then wall, then city when affordable, so that automated runs still spend at most once per day with a stable priority.
20. As a player, I want auto-upgrade to skip quietly when all tracks are maxed or gold is short, so that the day can still advance.
21. As a frontend developer, I want public actions `upgradeWall`, `upgradeTroops`, and `upgradeCity` with the same result/error shape as other economy actions, so that UI wiring stays uniform.
22. As a frontend developer, I want selectors for per-track costs and effective attack, defense, income, and max HP, so that I never hardcode formulas.
23. As a frontend developer, I want stable error codes (`MAX_UPGRADE`, `INSUFFICIENT_GOLD`, `NO_ACTION_LEFT`, etc.) unchanged in meaning, so that existing UI handling still works.
24. As a backend developer, I want `GameState.version` bumped to 3 with `wallLevel`, `troopLevel`, and `cityLevel` instead of `upgradeLevel`, so that persistence matches the new contract.
25. As a backend developer, I want unsupported older saves rejected rather than silently migrated, so that prototype runs stay honest.
26. As an engine developer, I want all balancing numbers for the three tracks centralized in config, so that playtest tuning does not scatter constants.
27. As an engine developer, I want pure functions with no DOM/fetch/timer side effects, so that tests stay deterministic.
28. As a teammate, I want DEV1 contract and agent docs updated to supersede “single upgrade raises ATK+DEF”, so that Developer 2/3 do not integrate against the old field.
29. As a product owner, I want no individual troop HP, recruitment queues, or formations introduced by this change, so that the prototype stays simple.
30. As a QA engineer, I want a 20-day integration path that uses the new public upgrade actions, so that the campaign still closes without state jumps.

## Implementation Decisions

- **Primary test seam (existing):** public game engine API consumed by callers and Vitest. Prefer this seam over new internals. Secondary consumer seam: try UI / auto-run controllers that only call public actions and selectors.
- Replace single `upgradeLevel` with three integer levels starting at 0. Bump save `version` to `3`. Do not migrate version `2` payloads.
- Decision-rich state excerpt (from approved plan):

```ts
type GameState = {
  version: 3;
  // ...existing fields...
  cityHp: number;
  cityMaxHp: number;
  wallLevel: number;
  troopLevel: number;
  cityLevel: number;
  actionUsedToday: boolean;
  // no upgradeLevel
};
```

- Public economy API: `upgradeWall`, `upgradeTroops`, `upgradeCity`, `repairCity`. Remove the old ATK+DEF semantics of `upgradeCity`. All four share the existing daily economy gate (phase, unresolved event, battle day, `actionUsedToday`).
- City upgrade atomic effect: pay discounted cost → increment `cityLevel` → increase `cityMaxHp` by config bonus → increase `cityHp` by the same amount capped at new max → set `actionUsedToday` → bump `revision`.
- Attack = base + `troopLevel × troopAttackBonus`. Defense = base + `wallLevel × wallDefenseBonus` + active wave defense effects. Do not store derived ATK/DEF on state.
- Income on preparation days = `dailyIncome + cityLevel × cityIncomeBonus + prepIncomeBonus` (reward bonus still only days 11–19 as today).
- Playtest defaults (config): each track base cost 50, step 20, max level 5; wall DEF +2; troops ATK +5; city MaxHP +20 and income +8 per level. Income bonus is +8 rather than the first sketch of +3, because separate attack and defense purchases cannot clear wave 2 on +3. Base ATK/DEF/HP/daily income otherwise stay at the previous playtest config.
- Upgrade discount effects remain global rate + until-wave expiry; apply when computing any track’s next cost; repair never discounted; ceil after discount; rates do not stack (max wins).
- Try UI: three upgrade controls, per-track level/cost display, show effective income and max HP. Auto-run auto-upgrade priority: troops → wall → city; still one successful spend max per day.
- Update contract docs so Developer 2/3 replace `upgradeLevel` / single upgrade action assumptions. Event narrative packages need not invent new effect types for this feature.
- Engine remains pure TypeScript; no product Mongo/auth/AI work in this feature.

## Testing Decisions

- Good tests assert observable behavior at the **public engine API** (and auto-run public behaviour where relevant): resulting state fields, selector values, and stable error codes. Do not export private helpers solely for tests.
- Prior art: `src/game/game.test.ts` economy/discount/campaign cases; `src/ui/autoRun.test.ts` for auto upgrade scheduling behaviour.
- Cover: each track raises only its intended stats/income/max HP; shared daily slot across the four economic actions; failed spends preserve the slot; cost curve and max per track; city upgrade HP fill vs repair; discount applies to all three upgrade costs but not repair; income includes city bonus on prep days and still skips battle days; JSON-serializable state version 3; 20-day integration using real public actions with the new upgrades; auto-run priority order and skip when unaffordable/maxed.
- Do not require Mongo, browser E2E, or live AI for acceptance.

## Out of Scope

- Final monster/wave balancing beyond keeping current wave numbers while wiring works.
- Save migration from version 2 to 3.
- Individual troop units, recruitment, formations, mana, or per-unit HP.
- Changing event package effect types (discount remains upgrade discount).
- Product Frontend/Backend production apps beyond try UI / contract doc updates.
- Expanding campaign length to 50 days.

## Further Notes

Plan: `plans/split-three-upgrades.md`. This supersedes the earlier locked decision that a single city upgrade raises attack and defense together. Glossary: keep using run, revision, version (save format), phase, wave, effects, packageId. Related older feature folder `game-engine-prototype` remains historical; new work lives under `split-three-upgrades`.
