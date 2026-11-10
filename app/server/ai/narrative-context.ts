import type { Effect, GameState } from "../../../src/game/types";
import { eventPackageById, gameConfig, getWaveByNumber, nextBattleDay } from "../../../src/game";

export const SCENE_PROMPT_VERSION = "event-scene-en-v2";

export type HpBand = "critical" | "wounded" | "steady" | "strong";
export type GoldBand = "broke" | "tight" | "comfortable" | "flush";

export type RecentDecision = {
  day: number;
  packageId: string;
  choiceId: string;
  choiceLabel: string;
};

export type NarrativeContext = {
  locale: "en-US";
  promptVersion: typeof SCENE_PROMPT_VERSION;
  day: number;
  difficulty: GameState["difficulty"];
  city: {
    hp: number;
    maxHp: number;
    hpBand: HpBand;
    gold: number;
    goldBand: GoldBand;
    wallLevel: number;
    troopLevel: number;
    cityLevel: number;
  };
  threat: {
    nextWave: number | null;
    nextBattleDay: number | null;
    nextEnemyName: string | null;
  };
  lastBattle: null | {
    wave: number;
    won: boolean;
    cityHpLost: number;
  };
  recentDecisions: RecentDecision[];
  activeEffects: {
    upgradeDiscountRate: number;
    upgradeDiscountUntilWave: number | null;
    prepIncomeBonus: number;
    defenseForNextWave: number | null;
  };
  event: {
    eventId: string;
    packageId: string;
    isConsequence: boolean;
    originalTitle: string;
    originalDescription: string;
    trustedChoices: Array<{
      id: string;
      goldCost: number;
      effects: Effect[];
      engineLabel: string;
      intent: string;
    }>;
  };
  origin: null | {
    eventId: string;
    choiceId: string;
    day: number | null;
    choiceLabel: string;
    packageId: string | null;
  };
};

type ActiveEvent = NonNullable<GameState["activeEvent"]>;

export function hpBand(hp: number, maxHp: number): HpBand {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  if (ratio < 0.25) return "critical";
  if (ratio < 0.6) return "wounded";
  if (ratio < 0.85) return "steady";
  return "strong";
}

export function goldBand(gold: number): GoldBand {
  if (gold < 30) return "broke";
  if (gold < 80) return "tight";
  if (gold < 180) return "comfortable";
  return "flush";
}

export function choiceIntent(choice: { goldCost: number; effects: Effect[]; consequence?: unknown }): string {
  if (choice.effects.some((effect) => effect.type === "nextWaveDefense")) return "brace_defenses";
  if (choice.effects.some((effect) => effect.type === "upgradeDiscount")) return "bargain_cheaper_works";
  if (choice.effects.some((effect) => effect.type === "maxHpBonus")) return "reinforce_structures";
  if (choice.effects.some((effect) => effect.type === "healCity")) return "tend_wounded";
  if (choice.effects.some((effect) => effect.type === "grantGold")) return "take_surplus";
  if (choice.effects.some((effect) => effect.type === "damageCity")) return "endure_harm";
  if (choice.goldCost > 0 && choice.effects.length === 0) return "settle_cleanly";
  if (choice.consequence) return "may_draw_later_trouble";
  return "hold_position";
}

function clip(label: string): string {
  return label.length <= 80 ? label : `${label.slice(0, 77)}...`;
}

export function buildNarrativeContext(
  state: GameState,
  event: ActiveEvent,
  recentDecisions: RecentDecision[] = [],
): NarrativeContext {
  const battleDay = nextBattleDay(state.day);
  const nextWave = gameConfig.waves.find((wave) => wave.day === battleDay);
  const defense = nextWave ? state.effects.defenseByWave[nextWave.wave] : undefined;
  const origin = originContext(state, event);

  return {
    locale: "en-US",
    promptVersion: SCENE_PROMPT_VERSION,
    day: state.day,
    difficulty: state.difficulty,
    city: {
      hp: state.cityHp,
      maxHp: state.cityMaxHp,
      hpBand: hpBand(state.cityHp, state.cityMaxHp),
      gold: state.gold,
      goldBand: goldBand(state.gold),
      wallLevel: state.wallLevel,
      troopLevel: state.troopLevel,
      cityLevel: state.cityLevel,
    },
    threat: {
      nextWave: nextWave?.wave ?? null,
      nextBattleDay: battleDay,
      nextEnemyName: nextWave ? getWaveByNumber(nextWave.wave)?.name ?? null : null,
    },
    lastBattle: state.battleResult
      ? {
          wave: state.battleResult.wave,
          won: state.battleResult.won,
          cityHpLost: state.battleResult.cityHpLost,
        }
      : null,
    recentDecisions: recentDecisions.slice(0, 3).map((decision) => ({
      ...decision,
      choiceLabel: clip(decision.choiceLabel),
    })),
    activeEffects: {
      upgradeDiscountRate: state.effects.upgradeDiscountRate,
      upgradeDiscountUntilWave: state.effects.upgradeDiscountUntilWave,
      prepIncomeBonus: state.effects.prepIncomeBonus,
      defenseForNextWave: defense ?? null,
    },
    event: {
      eventId: event.eventId,
      packageId: event.packageId,
      isConsequence: event.isConsequence ?? false,
      originalTitle: event.title,
      originalDescription: event.description,
      trustedChoices: event.choices.map((choice) => ({
        id: choice.id,
        goldCost: choice.goldCost,
        effects: choice.effects,
        engineLabel: choice.label,
        intent: choiceIntent(choice),
      })),
    },
    origin,
  };
}

function originContext(state: GameState, event: ActiveEvent): NarrativeContext["origin"] {
  if (!event.isConsequence || !event.originEventId || !event.originChoiceId) return null;
  const pkg = eventPackageById(event.originEventId) ?? eventPackageById(event.originEventId.split("::")[0] ?? "");
  const choice = pkg?.choices.find((entry) => entry.id === event.originChoiceId);
  const planned = state.eventPlan.find((entry) => entry.eventId === event.originEventId || entry.packageId === pkg?.packageId);
  return {
    eventId: event.originEventId,
    choiceId: event.originChoiceId,
    day: planned?.day ?? null,
    choiceLabel: clip(choice?.label ?? event.originChoiceId),
    packageId: pkg?.packageId ?? null,
  };
}
