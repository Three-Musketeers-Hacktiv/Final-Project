import Image from "next/image";
import type { ReactNode } from "react";
import type { ActiveEffects, Difficulty } from "../../src/game";
import cityCrest from "./assets/icons/city_crest.png";
import { spriteTier, TIER_NUMERALS } from "./citySprites";
import Panel from "./Panel";

/** The run's active effects in words; the numbers come from the engine's state. */
function describeBuffs(effects: ActiveEffects, wavesCleared: number): string[] {
  const buffs: string[] = [];
  if (effects.prepIncomeBonus > 0) buffs.push(`+${effects.prepIncomeBonus} gold per day`);
  if (effects.upgradeDiscountRate > 0) {
    const until = effects.upgradeDiscountUntilWave;
    buffs.push(`${Math.round(effects.upgradeDiscountRate * 100)}% off upgrades${until ? ` until wave ${until}` : ""}`);
  }
  // Extra defense granted for a wave that is still to come.
  for (const [wave, amount] of Object.entries(effects.defenseByWave)) {
    if (amount && amount > 0 && Number(wave) > wavesCleared) buffs.push(`+${amount} defense in wave ${wave}`);
  }
  return buffs;
}

type CityRecordProps = {
  /** Flavor text: the API has no city name, faction or region yet. */
  name: string;
  faction: string;
  region: string;
  /** The player's username. */
  lord: string;
  difficulty: Difficulty;
  cityLevel: number;
  effects: ActiveEffects;
  wavesCleared: number;
};

export default function CityRecord({
  name,
  faction,
  region,
  lord,
  difficulty,
  cityLevel,
  effects,
  wavesCleared,
}: CityRecordProps) {
  const buffs = describeBuffs(effects, wavesCleared);
  const rows: [string, ReactNode][] = [
    ["Lord", lord],
    ["Faction", faction],
    ["Region", region],
    ["Difficulty", <span key="difficulty" className="capitalize">{difficulty}</span>],
    // The tier follows the city's sprite tier (citySprites), so it changes when the city's picture does.
    ["City Tier", `Tier ${TIER_NUMERALS[spriteTier(cityLevel)]}`],
    [
      "Buff",
      buffs.length === 0 ? (
        <span key="buff" className="text-muted">None</span>
      ) : (
        <ul key="buff">
          {buffs.map((buff) => (
            <li key={buff}>{buff}</li>
          ))}
        </ul>
      ),
    ],
  ];

  return (
    <Panel title="City Record" accent>
      <div className="flex gap-4">
        <Image src={cityCrest} alt={`${name} crest`} sizes="6rem" className="h-auto w-24 shrink-0 self-start" />
        <div className="min-w-0 flex-1">
          <h3 className="mb-2 text-2xl font-bold text-parchment">{name}</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="text-parchment">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Panel>
  );
}
