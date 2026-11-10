import { chooseEventOption, chooseReward, continueFromReport, endPreparationDay, getEffectiveAttack, getEffectiveDefense, getWavePreview, startBattle, } from "../../../src/game/index.mjs";
import { mustOk } from "./mustOk.mjs";
import { avoidDamageChoice, scoredEventChoice, spendOnce } from "./policies.mjs";
import { chooseRewardId } from "./rewardPolicies.mjs";
/**
 * Memainkan state hanya lewat aksi publik.
 * Berhenti saat `stop` benar, fase akhir, atau batas langkah.
 */
export function play(start, options = {}) {
    let state = start;
    const events = [];
    const rewards = [];
    const preBattle = [];
    const spend = options.spend ?? "knownWin";
    const repair = options.repair ?? "off";
    const pickEvent = options.eventChoice ?? scoredEventChoice;
    const pickReward = options.rewardChoice ?? ((current) => chooseRewardId(current, options.rewardPolicy ?? "standard"));
    const maxSteps = options.maxSteps ?? 800;
    let steps = 0;
    let repairs = 0;
    let repairGold = 0;
    for (; steps < maxSteps; steps += 1) {
        if (options.stop?.(state))
            break;
        if (state.phase === "victory" || state.phase === "gameOver")
            break;
        if (state.phase === "event" && state.activeEvent) {
            const choiceId = pickEvent(state);
            const eventId = state.activeEvent.eventId;
            const day = state.day;
            state = mustOk(chooseEventOption(state, choiceId));
            events.push({ day, eventId, choiceId });
            continue;
        }
        if (state.phase === "preparation") {
            const spent = spendOnce(state, spend, repair);
            if (spent) {
                state = spent.state;
                if (spent.repaired) {
                    repairs += 1;
                    repairGold += spent.repairCost;
                }
            }
            if (state.phase === "preparation")
                state = mustOk(endPreparationDay(state));
            continue;
        }
        if (state.phase === "battleReady") {
            const preview = getWavePreview(state);
            preBattle.push({
                day: state.day,
                wave: preview?.wave ?? state.wavesCleared + 1,
                cityHp: state.cityHp,
                cityMaxHp: state.cityMaxHp,
                gold: state.gold,
                attack: getEffectiveAttack(state),
                defense: preview?.cityDefense ?? getEffectiveDefense(state),
                monsterHp: preview?.hp ?? 0,
                monsterAttack: preview?.attack ?? 0,
                wallLevel: state.wallLevel,
                troopLevel: state.troopLevel,
                cityLevel: state.cityLevel,
            });
            state = mustOk(startBattle(state));
            continue;
        }
        if (state.phase === "battleReport") {
            state = mustOk(continueFromReport(state));
            continue;
        }
        if (state.phase === "reward") {
            const rewardId = pickReward(state);
            const wave = state.wavesCleared;
            state = mustOk(chooseReward(state, rewardId));
            rewards.push({ wave, rewardId });
            continue;
        }
        break;
    }
    return { state, steps, events, rewards, repairs, repairGold, preBattle };
}
export { avoidDamageChoice, scoredEventChoice };
