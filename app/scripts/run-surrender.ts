import { randomUUID } from "node:crypto";

type GameStateView = Record<string, unknown> & {
  revision: number;
  phase: string;
};

type GameView = { state: GameStateView };
type Success<T> = { ok: true; data: T };
type Failure = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = Success<T> | Failure;

const baseUrl = (
  process.env.SURRENDER_BASE_URL ??
  process.env.CAMPAIGN_BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");
const origin = process.env.SURRENDER_ORIGIN ?? process.env.CAMPAIGN_ORIGIN ?? new URL(baseUrl).origin;
const username = `surrender_${Date.now().toString(36)}`;
const password = `Surrender-${randomUUID()}`;

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

function withoutFinalFields(state: GameStateView): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(state).filter(([key]) => key !== "phase" && key !== "revision"),
  );
}

async function main(): Promise<void> {
  console.info(`Starting surrender smoke test against ${baseUrl} with test user ${username}`);

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
  const before = created.game.state;

  const invalid = await request<never>(
    `/api/runs/${runId}/actions`,
    {
      method: "POST",
      body: JSON.stringify({
        actionId: randomUUID(),
        expectedRevision: before.revision,
        type: "surrender",
        payload: { reason: "client-controlled" },
      }),
    },
    400,
  );
  expectFailure(invalid, "VALIDATION_ERROR");

  const surrendered = successData(await request<{ game: GameView }>(
    `/api/runs/${runId}/actions`,
    {
      method: "POST",
      body: JSON.stringify({
        actionId: randomUUID(),
        expectedRevision: before.revision,
        type: "surrender",
        payload: {},
      }),
    },
    200,
  ));
  const after = surrendered.game.state;
  if (after.phase !== "gameOver" || after.revision !== before.revision + 1) {
    throw new Error(`Unexpected surrender result: ${JSON.stringify(after)}`);
  }
  if (JSON.stringify(withoutFinalFields(after)) !== JSON.stringify(withoutFinalFields(before))) {
    throw new Error("Surrender changed gameplay fields other than phase and revision");
  }

  const stored = successData(await request<{ runId: string; game: GameView }>(
    `/api/runs/${runId}`,
    { method: "GET" },
    200,
  ));
  if (stored.game.state.phase !== "gameOver" || stored.game.state.revision !== after.revision) {
    throw new Error("Stored run does not contain the final surrender state");
  }

  const current = await request<never>("/api/runs/current", { method: "GET" }, 404);
  expectFailure(current, "NO_ACTIVE_SAVE");

  const repeated = await request<never>(
    `/api/runs/${runId}/actions`,
    {
      method: "POST",
      body: JSON.stringify({
        actionId: randomUUID(),
        expectedRevision: after.revision,
        type: "surrender",
        payload: {},
      }),
    },
    409,
  );
  expectFailure(repeated, "GAME_ENDED");

  console.info(`Surrender smoke test passed: runId=${runId}, finalRevision=${after.revision}`);
}

main().catch((error) => {
  console.error("Surrender smoke test failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
