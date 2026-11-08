import { randomUUID } from "node:crypto";

type GameStateView = {
  revision: number;
  day: number;
  phase: string;
  wallLevel: number;
  troopLevel: number;
  cityLevel: number;
};

type EventNarrativeView = {
  eventId: string;
  packageId: string;
  choices: [{ id: string; label: string }, { id: string; label: string }];
};

type GameView = {
  state: GameStateView;
  eventNarrative: EventNarrativeView | null;
};
type Success<T> = { ok: true; data: T };
type Failure = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = Success<T> | Failure;

const baseUrl = (process.env.CAMPAIGN_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const origin = process.env.CAMPAIGN_ORIGIN ?? new URL(baseUrl).origin;
const username = `campaign_${Date.now().toString(36)}`;
const password = `Campaign-${randomUUID()}`;

let cookie = "";
let runId = "";
let game: GameView;

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

function assertState(day: number, phase: string): void {
  if (game.state.day !== day || game.state.phase !== phase) {
    throw new Error(
      `Expected day ${day}/${phase}, received day ${game.state.day}/${game.state.phase}`,
    );
  }
}

function activeChoiceId(index: 0 | 1): string {
  const event = game.eventNarrative;
  if (!event || game.state.phase !== "event") {
    throw new Error(`Expected an active event before selecting choice index ${index}`);
  }
  const choice = event.choices[index];
  if (!choice?.id) throw new Error(`Active event does not expose choice index ${index}`);
  console.info(
    `event=${event.eventId} package=${event.packageId} choice=${choice.id}`,
  );
  return choice.id;
}

async function action(type: string, payload: Record<string, unknown> = {}): Promise<void> {
  const response = await request<{ game: GameView }>(
    `/api/runs/${runId}/actions`,
    {
      method: "POST",
      body: JSON.stringify({
        actionId: randomUUID(),
        expectedRevision: game.state.revision,
        type,
        payload,
      }),
    },
    200,
  );
  game = successData(response).game;
  console.info(
    `revision=${game.state.revision} day=${game.state.day} phase=${game.state.phase} action=${type}`,
  );
}

async function main(): Promise<void> {
  console.info(`Starting API campaign against ${baseUrl} with test user ${username}`);

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
  successData(await request("/api/auth/me", { method: "GET" }, 200));

  const created = successData(await request<{ runId: string; game: GameView; replayed: boolean }>(
    "/api/runs",
    {
      method: "POST",
      body: JSON.stringify({ startRequestId: randomUUID(), replaceActiveSave: false }),
    },
    201,
  ));
  runId = created.runId;
  game = created.game;
  assertState(1, "preparation");

  await action("upgradeCity");
  await action("endPreparationDay");
  await action("upgradeCity");
  await action("endPreparationDay");
  assertState(3, "event");
  await action("chooseEventOption", { choiceId: activeChoiceId(1) });
  await action("endPreparationDay");
  await action("upgradeCity");
  await action("endPreparationDay");
  await action("upgradeTroops");
  await action("endPreparationDay");
  await action("upgradeTroops");
  await action("endPreparationDay");
  assertState(7, "event");
  await action("chooseEventOption", { choiceId: activeChoiceId(0) });
  await action("endPreparationDay");
  await action("upgradeTroops");
  await action("endPreparationDay");
  await action("endPreparationDay");
  assertState(10, "battleReady");
  await action("startBattle");
  assertState(10, "battleReport");
  await action("continueFromReport");
  assertState(10, "reward");
  await action("chooseReward", { rewardId: "reward-income" });
  assertState(11, "preparation");

  await action("repairCity");
  await action("endPreparationDay");
  await action("repairCity");
  await action("endPreparationDay");
  assertState(13, "event");
  await action("chooseEventOption", { choiceId: activeChoiceId(1) });
  await action("repairCity");
  await action("endPreparationDay");
  await action("repairCity");
  await action("endPreparationDay");
  await action("upgradeTroops");
  await action("endPreparationDay");
  await action("upgradeWall");
  await action("endPreparationDay");
  assertState(17, "event");
  await action("chooseEventOption", { choiceId: activeChoiceId(0) });
  await action("upgradeWall");
  await action("endPreparationDay");
  await action("upgradeTroops");
  await action("endPreparationDay");
  await action("upgradeWall");
  await action("endPreparationDay");
  assertState(20, "battleReady");
  await action("startBattle");
  assertState(20, "battleReport");
  await action("continueFromReport");
  assertState(20, "victory");

  if (
    game.state.wallLevel !== 3 ||
    game.state.troopLevel !== 5 ||
    game.state.cityLevel !== 3
  ) {
    throw new Error(`Unexpected final upgrade levels: ${JSON.stringify(game.state)}`);
  }

  const stored = successData(await request<{ runId: string; game: GameView }>(
    `/api/runs/${runId}`,
    { method: "GET" },
    200,
  ));
  if (stored.game.state.phase !== "victory") {
    throw new Error("Stored run did not retain the victory state");
  }

  const current = await request<never>("/api/runs/current", { method: "GET" }, 404);
  if (current.ok || current.error.code !== "NO_ACTIVE_SAVE") {
    throw new Error("Completed campaign still appears as an active save");
  }

  successData(await request("/api/auth/logout", { method: "POST" }, 200));
  const afterLogout = await request<never>("/api/auth/me", { method: "GET" }, 401);
  if (afterLogout.ok || afterLogout.error.code !== "UNAUTHENTICATED") {
    throw new Error("Session remained authenticated after logout");
  }

  console.info(`Campaign passed: runId=${runId}, finalRevision=${game.state.revision}, phase=victory`);
}

main().catch((error) => {
  console.error("Campaign failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
