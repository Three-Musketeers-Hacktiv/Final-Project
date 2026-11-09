import { gameConfig } from "./config";
import type { BattleResult, BattleRoundLog } from "./types";

export type BattleSnapshot = {
  wave: number;
  day: number;
  cityHp: number;
  cityAttack: number;
  cityDefense: number;
  monsterHp: number;
  monsterAttack: number;
};

function isValidBattleSnapshot(snapshot: BattleSnapshot): boolean {
  const numericFields = [
    snapshot.wave,
    snapshot.day,
    snapshot.cityHp,
    snapshot.cityAttack,
    snapshot.cityDefense,
    snapshot.monsterHp,
    snapshot.monsterAttack,
  ];
  if (!numericFields.every((value) => Number.isFinite(value))) return false;
  if (!Number.isInteger(snapshot.wave) || snapshot.wave < 1) return false;
  if (!gameConfig.waves.some((wave) => wave.wave === snapshot.wave && wave.day === snapshot.day)) {
    return false;
  }
  if (snapshot.cityHp <= 0 || snapshot.monsterHp <= 0) return false;
  if (snapshot.cityAttack <= 0 || snapshot.monsterAttack <= 0) return false;
  if (snapshot.cityDefense < 0) return false;
  return true;
}

export function resolveBattle(snapshot: BattleSnapshot): BattleResult | null {
  if (!isValidBattleSnapshot(snapshot)) return null;

  let cityHp = snapshot.cityHp;
  let monsterHp = snapshot.monsterHp;
  const rounds: BattleRoundLog[] = [];
  let round = 0;
  while (cityHp > 0 && monsterHp > 0) {
    round += 1;
    const damageToMonster = snapshot.cityAttack;
    const damageToCity = Math.max(1, snapshot.monsterAttack - snapshot.cityDefense);
    cityHp = Math.max(0, cityHp - damageToCity);
    monsterHp = Math.max(0, monsterHp - damageToMonster);
    rounds.push({
      round,
      damageToMonster,
      damageToCity,
      cityHpAfter: cityHp,
      monsterHpAfter: monsterHp,
    });
  }
  const won = monsterHp === 0 && cityHp > 0;
  return {
    wave: snapshot.wave,
    day: snapshot.day,
    won,
    rounds,
    cityHpBefore: snapshot.cityHp,
    cityHpAfter: cityHp,
    monsterHpBefore: snapshot.monsterHp,
    monsterHpAfter: monsterHp,
    cityAttack: snapshot.cityAttack,
    cityDefense: snapshot.cityDefense,
    monsterAttack: snapshot.monsterAttack,
    cityHpLost: snapshot.cityHp - cityHp,
    monsterHpLost: snapshot.monsterHp - monsterHp,
  };
}
