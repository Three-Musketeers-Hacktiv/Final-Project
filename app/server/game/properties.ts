import { ObjectId } from "mongodb";

import { readEffectiveStats, type GameState } from "@/server/game-engine/adapter";
import type { GamePropertyDocument, GamePropertyKey } from "@/server/game/types";

export function createPropertyDocuments(
  gameRunId: ObjectId,
  state: GameState,
  gameActionId: ObjectId | null,
  createdAt: Date,
): GamePropertyDocument[] {
  const stats = readEffectiveStats(state);
  const values: Record<GamePropertyKey, number> = {
    gold: state.gold,
    cityHp: state.cityHp,
    cityMaxHp: state.cityMaxHp,
    wallLevel: state.wallLevel,
    troopLevel: state.troopLevel,
    cityLevel: state.cityLevel,
    attack: stats.attack,
    defense: stats.defense,
  };

  return Object.entries(values).map(([statKey, statValue]) => ({
    _id: new ObjectId(),
    gameRunId,
    gameActionId,
    revision: state.revision,
    statKey: statKey as GamePropertyKey,
    statValue,
    createdAt,
  }));
}
