import type { BattleResult } from "../../../src/game";
import GameButton from "../GameButton";
import Icon from "../Icon";
import Modal from "../Modal";

export const BATTLE_REPORT_DIALOG = "phase-battle-report";

type BattleReportDialogProps = {
  result: BattleResult;
  pending: boolean;
  onContinue: () => void;
};

/**
 * phase "battleReport": the result the engine already resolved, round by round.
 * Later the rounds also play back in the battle scene; nothing here is recalculated.
 */
export default function BattleReportDialog({ result, pending, onContinue }: BattleReportDialogProps) {
  const summary = [
    { label: "City HP", value: `${result.cityHpBefore} → ${result.cityHpAfter}`, note: `−${result.cityHpLost}` },
    { label: "Wave HP", value: `${result.monsterHpBefore} → ${result.monsterHpAfter}`, note: `−${result.monsterHpLost}` },
  ];

  return (
    <Modal
      id={BATTLE_REPORT_DIALOG}
      title={result.won ? "Wave Defeated!" : "Defeat"}
      subtitle={`Wave ${result.wave} · Day ${result.day}`}
      icon={<Icon name="thisWave" className="size-6" />}
      accent={!result.won}
      size="lg"
      dismissible={false}
    >
      <p className="text-lg">
        {result.won ? "The wave was driven back from the walls." : "The wave survived the assault."}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {summary.map((row) => (
          <div key={row.label} className="flex items-baseline gap-3 rounded-sm border-2 border-frame/60 px-3 py-2">
            <span className="flex-1 text-muted">{row.label}</span>
            <span className="font-semibold">{row.value}</span>
            <span className="text-sm text-crimson day:text-red-700">{row.note}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 max-h-64 overflow-y-auto rounded-sm border-2 border-frame/60">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-panel-head text-sm text-muted">
            <tr>
              <th className="px-3 py-1.5 font-semibold">Round</th>
              <th className="px-3 py-1.5 font-semibold">Damage dealt</th>
              <th className="px-3 py-1.5 font-semibold">Damage taken</th>
              <th className="px-3 py-1.5 font-semibold">City HP</th>
              <th className="px-3 py-1.5 font-semibold">Wave HP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-frame/40">
            {result.rounds.map((round) => (
              <tr key={round.round}>
                <td className="px-3 py-1.5">{round.round}</td>
                <td className="px-3 py-1.5 text-sky-300 day:text-sky-700">{round.damageToMonster}</td>
                <td className="px-3 py-1.5 text-crimson day:text-red-700">{round.damageToCity}</td>
                <td className="px-3 py-1.5">{round.cityHpAfter}</td>
                <td className="px-3 py-1.5">{round.monsterHpAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <GameButton variant="primary" className="mt-5 w-full" disabled={pending} onClick={onContinue}>
        Continue
      </GameButton>
    </Modal>
  );
}
