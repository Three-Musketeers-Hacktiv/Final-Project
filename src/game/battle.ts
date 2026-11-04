import type {
  ActionResult,
  BattleResult,
  BattleRoundLog,
  CityBattleSnapshot,
  MonsterSnapshot,
  WaveId,
} from "./types";

export function resolveBattle(
  city: CityBattleSnapshot,
  monster: MonsterSnapshot,
  wave: WaveId,
): ActionResult<BattleResult> {
  if (city.hp <= 0 || monster.hp <= 0 || city.attack <= 0) {
    return {
      ok: false,
      error: {
        code: "BATTLE_INVALID",
        message: "Battle requires positive city HP, monster HP, and city attack",
      },
    };
  }

  let cityHp = city.hp;
  let monsterHp = monster.hp;
  const rounds: BattleRoundLog[] = [];
  let round = 0;

  while (cityHp > 0 && monsterHp > 0) {
    round += 1;
    const damageToMonster = city.attack;
    const damageToCity = Math.max(1, monster.attack - city.defense);
    const nextCity = Math.max(0, cityHp - damageToCity);
    const nextMonster = Math.max(0, monsterHp - damageToMonster);
    cityHp = nextCity;
    monsterHp = nextMonster;
    rounds.push({
      round,
      damageToMonster,
      damageToCity,
      cityHpAfter: cityHp,
      monsterHpAfter: monsterHp,
    });
  }

  const won = monsterHp <= 0 && cityHp > 0;
  return {
    ok: true,
    state: {
      wave,
      won,
      rounds,
      cityHpBefore: city.hp,
      cityHpAfter: cityHp,
      monsterHpBefore: monster.hp,
      monsterHpAfter: monsterHp,
      cityAttack: city.attack,
      cityDefense: city.defense,
      monsterAttack: monster.attack,
    },
  };
}
