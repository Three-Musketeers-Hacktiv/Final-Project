import { randomUUID } from "node:crypto";

type Effect =
  | { type: "grantGold"; amount: number }
  | { type: "damageCity"; amount: number }
  | { type: "healCity"; amount: number }
  | { type: "maxHpBonus"; amount: number }
  | { type: "nextWaveDefense"; amount: number; wave: number }
  | { type: "upgradeDiscount"; rate: number; untilWave: number };

type EventChoice = {
  id: string;
  label: string;
  goldCost: number;
  effects: Effect[];
  consequence?: { packageId: string };
};

type RewardOption = { id: string; kind: string; amount: number };

type GameStateView = {
  version: number;
  revision: number;
  difficulty: string;
  day: number;
  phase: string;
  gold: number;
  cityHp: number;
  cityMaxHp: number;
  wallLevel: number;
  troopLevel: number;
  cityLevel: number;
  actionUsedToday: boolean;
  wavesCleared: number;
};

type GameView = {
  state: GameStateView;
  stats: { wallCost: number; troopCost: number; cityCost: number; repairCost: number };
  wavePreview: null | {
    wave: number;
    hp: number;
    attack: number;
    cityAttack: number;
    cityDefense: number;
  };
  eventNarrative: null | {
    eventId: string;
    packageId: string;
    choices: EventChoice[];
  };
  rewardOptions: RewardOption[];
};

type Success<T> = { ok: true; data: T };
type Failure = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = Success<T> | Failure;

const baseUrl = (process.env.CAMPAIGN_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const origin = process.env.CAMPAIGN_ORIGIN ?? new URL(baseUrl).origin;
const username = `campaign_v4_${Date.now().toString(36)}`;
const password = `Campaign-${randomUUID()}`;

let cookie = "";
let runId = "";
let game: GameView;
let actionCount = 0;
let eventCount = 0;
let battleCount = 0;

async function request<T>(path: string, init: RequestInit, expectedStatus: number): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers);
  headers.set("Origin", origin);
  if (init.body) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";", 1)[0] ?? "";
  const body = await response.json() as ApiResponse<T>;
  if (response.status !== expectedStatus) {
    throw new Error(`${init.method ?? "GET"} ${path}: expected ${expectedStatus}, got ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

function successData<T>(response: ApiResponse<T>): T {
  if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`);
  return response.data;
}

async function action(type: string, payload: Record<string, unknown> = {}): Promise<void> {
  const response = await request<{ game: GameView }>(`/api/runs/${runId}/actions`, {
    method: "POST",
    body: JSON.stringify({
      actionId: randomUUID(),
      expectedRevision: game.state.revision,
      type,
      payload,
    }),
  }, 200);
  game = successData(response).game;
  actionCount += 1;
}

function eventChoiceScore(choice: EventChoice): number {
  let score = choice.goldCost === 0 ? 20 : -choice.goldCost;
  if (choice.consequence) score -= 80;
  for (const effect of choice.effects) {
    if (effect.type === "nextWaveDefense") score += 240 + effect.amount;
    if (effect.type === "upgradeDiscount") score += 220;
    if (effect.type === "maxHpBonus") score += 90 + effect.amount;
    if (effect.type === "grantGold") score += 100 + effect.amount;
    if (effect.type === "healCity") score += 60 + effect.amount;
    if (effect.type === "damageCity") score -= 200 + effect.amount;
  }
  return score;
}

function predictedBattleDamage(view: GameView, overrides?: { attack?: number; defense?: number }): number {
  const wave = view.wavePreview;
  if (!wave) return 0;
  const attack = overrides?.attack ?? wave.cityAttack;
  const defense = overrides?.defense ?? wave.cityDefense;
  return Math.ceil(wave.hp / attack) * Math.max(1, wave.attack - defense);
}

function economicAction(): string | null {
  const { state, stats, wavePreview } = game;
  const daysUntilBattle = 10 - (state.day % 10);
  if (
    state.cityHp < state.cityMaxHp &&
    state.gold >= stats.repairCost &&
    (daysUntilBattle <= 2 || state.cityMaxHp - state.cityHp >= 45)
  ) return "repairCity";

  const candidates: Array<{ type: string; cost: number; score: number }> = [];
  const currentDamage = predictedBattleDamage(game);
  if (state.troopLevel < 18 && state.gold >= stats.troopCost && wavePreview) {
    const damage = predictedBattleDamage(game, { attack: wavePreview.cityAttack + 5 });
    candidates.push({ type: "upgradeTroops", cost: stats.troopCost, score: (currentDamage - damage) / stats.troopCost });
  }
  if (state.wallLevel < 18 && state.gold >= stats.wallCost && wavePreview) {
    const damage = predictedBattleDamage(game, { defense: wavePreview.cityDefense + 2 });
    candidates.push({ type: "upgradeWall", cost: stats.wallCost, score: (currentDamage - damage) / stats.wallCost });
  }
  if (state.cityLevel < 18 && state.gold >= stats.cityCost) {
    candidates.push({ type: "upgradeCity", cost: stats.cityCost, score: 35 / stats.cityCost });
  }
  candidates.sort((a, b) => b.score - a.score || a.cost - b.cost);
  return candidates[0]?.type ?? null;
}

function preferredReward(): RewardOption {
  const priorities = [
    "grantGold",
    "upgradeDiscount",
    "prepIncomeBonus",
    "nextWaveDefense",
    "maxHpBonus",
    "healCity",
    "combo",
  ];
  for (const kind of priorities) {
    const reward = game.rewardOptions.find((candidate) => candidate.kind === kind);
    if (reward) return reward;
  }
  throw new Error(`Wave ${game.state.wavesCleared} did not expose a trusted reward option`);
}

async function playCampaign(): Promise<void> {
  while (game.state.phase !== "victory" && game.state.phase !== "gameOver") {
    switch (game.state.phase) {
      case "event": {
        const event = game.eventNarrative;
        if (!event) throw new Error("Event phase did not expose eventNarrative");
        const affordable = event.choices.filter((choice) => choice.goldCost <= game.state.gold);
        const selected = [...affordable].sort((a, b) => eventChoiceScore(b) - eventChoiceScore(a))[0];
        if (!selected) throw new Error(`No affordable choice for ${event.eventId}`);
        await action("chooseEventOption", { choiceId: selected.id });
        eventCount += 1;
        break;
      }
      case "preparation": {
        if (!game.state.actionUsedToday) {
          const type = economicAction();
          if (type) await action(type);
        }
        await action("endPreparationDay");
        break;
      }
      case "battleReady":
        await action("startBattle");
        battleCount += 1;
        break;
      case "battleReport":
        await action("continueFromReport");
        break;
      case "reward":
        await action("chooseReward", { rewardId: preferredReward().id });
        break;
      default:
        throw new Error(`Unsupported campaign phase: ${game.state.phase}`);
    }
  }
}

async function main(): Promise<void> {
  console.info(`Starting engine-v4 API campaign against ${baseUrl} as ${username}`);
  successData(await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, confirmPassword: password }),
  }, 201));
  successData(await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  }, 200));

  const created = successData(await request<{ runId: string; game: GameView; replayed: boolean }>("/api/runs", {
    method: "POST",
    body: JSON.stringify({
      startRequestId: randomUUID(),
      replaceActiveSave: false,
      difficulty: "easy",
    }),
  }, 201));
  runId = created.runId;
  game = created.game;
  if (game.state.version !== 4 || game.state.difficulty !== "easy") {
    throw new Error(`Create run returned incompatible state ${game.state.version}/${game.state.difficulty}`);
  }

  await playCampaign();
  if (game.state.phase !== "victory" || game.state.day !== 100 || battleCount !== 10) {
    throw new Error(
      `Campaign did not reach v4 victory: day=${game.state.day} phase=${game.state.phase} waves=${game.state.wavesCleared} battles=${battleCount}`,
    );
  }

  const stored = successData(await request<{ runId: string; game: GameView }>(`/api/runs/${runId}`, { method: "GET" }, 200));
  if (stored.game.state.phase !== "victory" || stored.game.state.revision !== game.state.revision) {
    throw new Error("Stored run did not retain the final v4 victory state");
  }
  const current = await request<never>("/api/runs/current", { method: "GET" }, 404);
  if (current.ok || current.error.code !== "NO_ACTIVE_SAVE") {
    throw new Error("Completed campaign still appears as an active save");
  }
  successData(await request("/api/auth/logout", { method: "POST" }, 200));
  console.info(`Campaign passed: runId=${runId} actions=${actionCount} events=${eventCount} battles=${battleCount}`);
}

main().catch((error) => {
  console.error("Campaign failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
