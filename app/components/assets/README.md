# Bastionfall — Sprite Assets

Individual sprite assets cropped from the supplied sprite sheets. PNG files retain their alpha channel.
File names carry only the tier (`_01` … `_06`); which levels use a tier is decided in code
(`components/citySprites.ts`).

## Folders

- `city/`: 6 combined city sprites, without wall structures.
- `wall_background/`: 6 horizontal wall-background sprites.
- `tower/`: 6 standalone side-tower sprites. Mirror each sprite for the opposite side.
- `troops/`: 12 individual troop sprites, two separate soldiers per tier. All face right, toward the
  monsters: `_a` stands behind, `_b` in front.

## Level mapping

Upgrade tracks go from level 0 to 18 (`gameConfig.maxTrackLevel`).

| Tier | Game level |
|---|---|
| 01 | 0–3 |
| 02 | 4–6 |
| 03 | 7–9 |
| 04 | 10–12 |
| 05 | 13–15 |
| 06 | 16–18 |

## Tier 06 notes

Tier 06 was drawn at a larger scale than tiers 01–05, so its files were resized to continue the size
progression: the city, wall and tower by one shared factor (tower 452 → 320 px tall), the troops so the
tallest is 185 px. `troop_06_a.png` (cavalry) and `troop_06_b.png` (swordsman) were cut from one
two-soldier sheet and mirrored to face right.
