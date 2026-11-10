import type { GameState } from "../../../src/game/index";

/**
 * Salinan state untuk batas yang sulit dicapai lewat 18 hari bermain
 * (level maksimum, HP hampir nol, gold persis biaya).
 * Bukan jalur campaign. Alasan wajib diisi supaya pemanggilan terlihat di test.
 */
export function asBoundary(state: GameState, _reason: string, patch: Partial<GameState>): GameState {
  const effects = patch.effects
    ? {
        ...state.effects,
        ...patch.effects,
        defenseByWave: {
          ...state.effects.defenseByWave,
          ...patch.effects.defenseByWave,
        },
      }
    : state.effects;
  return {
    ...state,
    ...patch,
    effects,
    rewardsChosenByWave: patch.rewardsChosenByWave ?? { ...state.rewardsChosenByWave },
    incomeGrantedDays: patch.incomeGrantedDays ?? [...state.incomeGrantedDays],
    completedEventIds: patch.completedEventIds ?? [...state.completedEventIds],
    eventPlan: patch.eventPlan ?? state.eventPlan.map((entry) => ({ ...entry })),
    pendingConsequences: patch.pendingConsequences ?? state.pendingConsequences.map((entry) => ({ ...entry })),
  };
}