import type { Db, IndexSpecification } from "mongodb";

type IndexDefinition = {
  collection: string;
  keys: IndexSpecification;
  options?: {
    name: string;
    unique?: boolean;
    expireAfterSeconds?: number;
  };
};

const indexDefinitions: IndexDefinition[] = [
  { collection: "users", keys: { username: 1 }, options: { name: "users_username_unique", unique: true } },
  { collection: "sessions", keys: { userId: 1 }, options: { name: "sessions_user_unique", unique: true } },
  { collection: "sessions", keys: { jti: 1 }, options: { name: "sessions_jti_unique", unique: true } },
  { collection: "sessions", keys: { expiresAt: 1 }, options: { name: "sessions_expiry_ttl", expireAfterSeconds: 0 } },
  { collection: "game_rulesets", keys: { rulesetId: 1 }, options: { name: "rulesets_id_unique", unique: true } },
  {
    collection: "game_runs",
    keys: { userId: 1, startRequestId: 1 },
    options: { name: "runs_start_request_unique", unique: true },
  },
  { collection: "game_runs", keys: { userId: 1, updatedAt: -1 }, options: { name: "runs_user_updated" } },
  { collection: "game_runs", keys: { userId: 1, endedAt: 1 }, options: { name: "runs_user_ended" } },
  {
    collection: "game_actions",
    keys: { runId: 1, actionId: 1 },
    options: { name: "actions_idempotency_unique", unique: true },
  },
  {
    collection: "game_actions",
    keys: { runId: 1, revisionAfter: 1 },
    options: { name: "actions_revision_unique", unique: true },
  },
  {
    collection: "game_properties",
    keys: { runId: 1, revision: 1, statKey: 1 },
    options: { name: "properties_revision_stat_unique", unique: true },
  },
  {
    collection: "runs_event",
    keys: { runId: 1, eventId: 1 },
    options: { name: "run_events_unique", unique: true },
  },
  {
    collection: "game_reports",
    keys: { runId: 1, wave: 1 },
    options: { name: "reports_wave_unique", unique: true },
  },
  {
    collection: "game_reports",
    keys: { runId: 1, actionId: 1 },
    options: { name: "reports_action_unique", unique: true },
  },
  {
    collection: "event_data",
    keys: { rulesetId: 1, packageId: 1, day: 1 },
    options: { name: "events_ruleset_package_day" },
  },
  {
    collection: "auth_rate_limits",
    keys: { key: 1, windowStart: 1 },
    options: { name: "auth_rate_limit_window_unique", unique: true },
  },
  {
    collection: "auth_rate_limits",
    keys: { expiresAt: 1 },
    options: { name: "auth_rate_limit_expiry_ttl", expireAfterSeconds: 0 },
  },
];

export async function ensureDatabaseIndexes(database: Db): Promise<void> {
  for (const definition of indexDefinitions) {
    await database
      .collection(definition.collection)
      .createIndex(definition.keys, definition.options);
  }
}
