import { describe, expect, it } from "vitest";
import {
  createInitialState,
  getWavePreview,
  resolveBattle,
  startBattle,
  type BattleSnapshot,
} from "../../../src/game/index";
import { expectError, callWithoutMutating } from "../helpers/assertions";
import { play } from "../helpers/campaignPlayer";
import { avoidDamageChoice, scoredEventChoice } from "../helpers/policies";
import { mustOk } from "../helpers/mustOk";
import { roundTrip } from "../helpers/roundTrip";
import { RUN } from "../fixtures/runIds";

const waveOne = {
  wave: 1,
  day: 10,
} as const;

describe("battle deterministik", () => {
  it("BAT-01 damage ronde pertama diterapkan bersamaan", () => {
    const result = resolveBattle({
      ...waveOne,
      cityHp: 150,
      cityAttack: 10,
      cityDefense: 2,
      monsterHp: 150,
      monsterAttack: 22,
    });
    expect(result).not.toBeNull();
    expect(result!.rounds[0]).toEqual({
      round: 1,
      damageToMonster: 10,
      damageToCity: 20,
      cityHpAfter: 130,
      monsterHpAfter: 140,
    });
  });

  it("BAT-02 defense di atas attack monster tetap memberi damage 1", () => {
    const result = resolveBattle({
      ...waveOne,
      cityHp: 50,
      cityAttack: 10,
      cityDefense: 100,
      monsterHp: 10,
      monsterAttack: 22,
    });
    expect(result!.rounds[0]!.damageToCity).toBe(1);
    expect(result!.cityHpAfter).toBe(49);
    expect(result!.cityHpLost).toBe(1);
    expect(result!.won).toBe(true);
  });

  it("BAT-03 overkill tidak menambah HP yang hilang di laporan", () => {
    const result = resolveBattle({
      ...waveOne,
      cityHp: 150,
      cityAttack: 100,
      cityDefense: 0,
      monsterHp: 30,
      monsterAttack: 5,
    });
    expect(result!.rounds).toHaveLength(1);
    expect(result!.rounds[0]!.damageToMonster).toBe(100);
    expect(result!.monsterHpAfter).toBe(0);
    expect(result!.monsterHpLost).toBe(30);
    expect(result!.cityHpLost).toBe(5);
    expect(result!.won).toBe(true);
  });

  it("BAT-04 kedua pihak nol pada ronde yang sama dihitung kalah", () => {
    const result = resolveBattle({
      ...waveOne,
      cityHp: 10,
      cityAttack: 10,
      cityDefense: 0,
      monsterHp: 10,
      monsterAttack: 20,
    });
    expect(result!.cityHpAfter).toBe(0);
    expect(result!.monsterHpAfter).toBe(0);
    expect(result!.won).toBe(false);
    expect(result!.cityHpLost).toBe(10);
  });

  it("BAT-05 snapshot yang sama menghasilkan log yang sama", () => {
    const snapshot: BattleSnapshot = {
      ...waveOne,
      cityHp: 80,
      cityAttack: 25,
      cityDefense: 8,
      monsterHp: 150,
      monsterAttack: 22,
    };
    expect(JSON.stringify(resolveBattle(snapshot))).toBe(JSON.stringify(resolveBattle(snapshot)));
  });

  it("BAT-06 input tidak valid ditolak, termasuk NaN dan Infinity", () => {
    const valid: BattleSnapshot = {
      ...waveOne,
      cityHp: 150,
      cityAttack: 10,
      cityDefense: 2,
      monsterHp: 150,
      monsterAttack: 22,
    };
    expect(resolveBattle({ ...valid, cityHp: Number.NaN })).toBeNull();
    expect(resolveBattle({ ...valid, cityAttack: Number.POSITIVE_INFINITY })).toBeNull();
    expect(resolveBattle({ ...valid, monsterHp: 0 })).toBeNull();
    expect(resolveBattle({ ...valid, cityAttack: 0 })).toBeNull();
    expect(resolveBattle({ ...valid, cityDefense: -1 })).toBeNull();
    expect(resolveBattle({ ...valid, day: 11 })).toBeNull();
  });

  it("BAT-07 preview sama dengan angka yang dipakai startBattle, lalu battle tidak dihitung ulang", () => {
    const ready = play(createInitialState({ runId: RUN.battle, difficulty: "easy" }), {
      spend: "knownWin",
      eventChoice: scoredEventChoice,
      stop: (state) => state.phase === "battleReady",
    }).state;
    const preview = getWavePreview(ready);
    expect(preview).not.toBeNull();

    const fought = mustOk(startBattle(ready));
    expect(fought.phase).toBe("battleReport");
    expect(fought.cityHp).toBe(fought.battleResult!.cityHpAfter);
    expect(fought.battleResult!.monsterHpBefore).toBe(preview!.hp);
    expect(fought.battleResult!.monsterAttack).toBe(preview!.attack);
    expect(fought.battleResult!.cityAttack).toBe(preview!.cityAttack);
    expect(fought.battleResult!.cityDefense).toBe(preview!.cityDefense);

    const again = callWithoutMutating(fought, (current) => startBattle(current));
    expectError(again, "BATTLE_ALREADY_RESOLVED");

    const loaded = roundTrip(fought);
    const afterLoad = callWithoutMutating(loaded, (current) => startBattle(current));
    expectError(afterLoad, "BATTLE_ALREADY_RESOLVED");
    expect(loaded.cityHp).toBe(fought.cityHp);
    expect(loaded.battleResult!.rounds).toEqual(fought.battleResult!.rounds);

    const lostReady = play(createInitialState({ runId: RUN.defeat }), {
      spend: "skip",
      eventChoice: avoidDamageChoice,
      stop: (state) => state.phase === "battleReady",
    }).state;
    const lost = mustOk(startBattle(lostReady));
    expect(lost.phase).toBe("gameOver");
    const blocked = callWithoutMutating(lost, (current) => startBattle(current));
    expectError(blocked, "GAME_ENDED");
    expect(lost.cityHp).toBe(0);
  });
});
