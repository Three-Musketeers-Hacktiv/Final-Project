import { randomUUID } from "node:crypto";

type TimelineEntry = {
  id: string;
  day: number;
  category: "city" | "battle" | "event";
  tone: "city" | "gain" | "loss" | "neutral";
  icon: string;
  highlight?: string;
  text: string;
};

type GameView = {
  state: { revision: number; phase: string };
  timeline: TimelineEntry[];
};

type ActionResponse = {
  action: {
    actionId: string;
    revisionBefore: number;
    revisionAfter: number;
  };
  game: GameView;
};

type Success<T> = { ok: true; data: T };
type Failure = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = Success<T> | Failure;

const baseUrl = (
  process.env.TIMELINE_BASE_URL ??
  process.env.CAMPAIGN_BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");
const origin = process.env.TIMELINE_ORIGIN ?? process.env.CAMPAIGN_ORIGIN ?? new URL(baseUrl).origin;
const username = `timeline_${Date.now().toString(36)}`;
const password = `Timeline-${randomUUID()}`;

let cookie = "";

async function request<T>(
  path: string,
  init: RequestInit,
  expectedStatus: number,
): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers);
  headers.set("Origin", origin);
  if (init.body) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";", 1)[0] ?? "";

  const body = await response.json() as ApiResponse<T>;
  if (response.status !== expectedStatus) {
    throw new Error(
      `${init.method ?? "GET"} ${path}: expected ${expectedStatus}, received ${response.status} ${JSON.stringify(body)}`,
    );
  }
  return body;
}

function successData<T>(response: ApiResponse<T>): T {
  if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`);
  return response.data;
}

function expectFailure<T>(response: ApiResponse<T>, code: string): void {
  if (response.ok || response.error.code !== code) {
    throw new Error(`Expected ${code}, received ${JSON.stringify(response)}`);
  }
}

function expectTimeline(game: GameView, expectedIds: string[]): void {
  const actualIds = game.timeline.map((entry) => entry.id);
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error(`Expected timeline ${JSON.stringify(expectedIds)}, received ${JSON.stringify(actualIds)}`);
  }
}

async function submit(
  runId: string,
  body: Record<string, unknown>,
  expectedStatus: number,
): Promise<ApiResponse<ActionResponse>> {
  return request(
    `/api/runs/${runId}/actions`,
    { method: "POST", body: JSON.stringify(body) },
    expectedStatus,
  );
}

async function main(): Promise<void> {
  console.info(`Starting timeline smoke test against ${baseUrl} with test user ${username}`);

  successData(await request(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ username, password, confirmPassword: password }),
    },
    201,
  ));
  successData(await request(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ username, password }) },
    200,
  ));

  const created = successData(await request<{ runId: string; game: GameView }>(
    "/api/runs",
    {
      method: "POST",
      body: JSON.stringify({ startRequestId: randomUUID(), replaceActiveSave: false, difficulty: "normal" }),
    },
    201,
  ));
  const { runId } = created;
  expectTimeline(created.game, []);

  const upgradeActionId = randomUUID();
  const upgradeRequest = {
    actionId: upgradeActionId,
    expectedRevision: created.game.state.revision,
    type: "upgradeWall",
    payload: {},
  };
  const upgraded = successData(await submit(runId, upgradeRequest, 200));
  expectTimeline(upgraded.game, [`${upgradeActionId}:0`]);
  const upgradedTimeline = JSON.stringify(upgraded.game.timeline);

  const replayedUpgrade = successData(await submit(runId, upgradeRequest, 200));
  expectTimeline(replayedUpgrade.game, [`${upgradeActionId}:0`]);
  if (
    replayedUpgrade.game.state.revision !== upgraded.game.state.revision ||
    JSON.stringify(replayedUpgrade.game.timeline) !== upgradedTimeline
  ) {
    throw new Error("Identical action replay changed state or timeline");
  }

  const conflict = await submit(
    runId,
    { ...upgradeRequest, type: "upgradeTroops" },
    409,
  );
  expectFailure(conflict, "ACTION_PAYLOAD_CONFLICT");

  const rejected = await submit(
    runId,
    {
      actionId: randomUUID(),
      expectedRevision: upgraded.game.state.revision,
      type: "upgradeTroops",
      payload: {},
    },
    422,
  );
  expectFailure(rejected, "NO_ACTION_LEFT");

  const current = successData(await request<{ runId: string; game: GameView }>(
    "/api/runs/current",
    { method: "GET" },
    200,
  ));
  expectTimeline(current.game, [`${upgradeActionId}:0`]);

  const surrenderActionId = randomUUID();
  const surrenderRequest = {
    actionId: surrenderActionId,
    expectedRevision: current.game.state.revision,
    type: "surrender",
    payload: {},
  };
  const surrendered = successData(await submit(runId, surrenderRequest, 200));
  expectTimeline(surrendered.game, [`${upgradeActionId}:0`, `${surrenderActionId}:0`]);
  if (surrendered.game.state.phase !== "gameOver") {
    throw new Error("Surrender did not produce gameOver");
  }

  const replayedSurrender = successData(await submit(runId, surrenderRequest, 200));
  expectTimeline(replayedSurrender.game, [`${upgradeActionId}:0`, `${surrenderActionId}:0`]);
  if (replayedSurrender.game.state.revision !== surrendered.game.state.revision) {
    throw new Error("Final action replay changed revision");
  }

  const stored = successData(await request<{ runId: string; game: GameView }>(
    `/api/runs/${runId}`,
    { method: "GET" },
    200,
  ));
  if (JSON.stringify(stored.game.timeline) !== JSON.stringify(surrendered.game.timeline)) {
    throw new Error("GET by ID did not restore the persisted timeline");
  }

  const noCurrent = await request<never>("/api/runs/current", { method: "GET" }, 404);
  expectFailure(noCurrent, "NO_ACTIVE_SAVE");

  console.info(
    `Timeline smoke test passed: runId=${runId}, entries=${stored.game.timeline.length}, finalRevision=${stored.game.state.revision}`,
  );
}

main().catch((error) => {
  console.error("Timeline smoke test failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
