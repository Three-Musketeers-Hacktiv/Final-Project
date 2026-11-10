# Fallback event catalog

This catalog is narrative copy only. The game engine still owns packages, choice IDs, costs, effects, consequences, and scheduling.

## What is stored

- Authoring files: `app/server/content/fallback-events/v1/events.json` and `manifest.json`.
- MongoDB: 50 documents inserted into the existing `event_data` collection with `source: "fallback"`.
- No new collection and no new document fields.

There are 30 scheduled variations and 20 consequence variations. A run still plans only 20 scheduled days from `runId`, so this catalog does not cover every possible day. `d8-market-b` and `d10-market-b` have no seeded narrative. Consequence copy is generic because several origin choices can schedule the same package.

## Selection order

1. Existing `runs_event` snapshot for that run and event id.
2. Live Gemini, when configured.
3. Newest valid shared `event_data` row with `source: "ai"` for the same ruleset, package, and day.
4. Newest valid seeded row with `source: "fallback"` for that same key.
5. Trusted local engine title, description, and labels.

Invalid catalog rows are skipped. A seeded fallback is not relabeled as AI. The first accepted narrative is snapshotted, so refresh does not change it or reapply effects.

## Commands

From `app/`:

```text
npm run content:validate-fallback-events
npm run db:seed-fallback-events
npm run db:seed-fallback-events -- --write
```

The seed command is a dry-run unless `--write` is passed. It checks the current engine ruleset (`campaign-v4-100-day-v3` plus config fingerprint) and only inserts missing `promptVersion` keys. It does not drop data and does not update rows that already exist.

The app must have created the ruleset document first. Do not commit database credentials, and do not expect this command to print a connection string.
