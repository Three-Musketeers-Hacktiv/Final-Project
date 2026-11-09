import Image from "next/image";
import type { WavePreviewView } from "@/contracts/api";
import GameButton from "../GameButton";
import Icon, { type IconName } from "../Icon";
import Modal from "../Modal";
import { waveInfo } from "../waveInfo";

export const BATTLE_READY_DIALOG = "phase-battle-ready";

type BattleReadyDialogProps = {
  wave: NonNullable<WavePreviewView>;
  pending: boolean;
  onStart: () => void;
};

/** phase "battleReady": the wave is at the gates; the player starts the battle. */
export default function BattleReadyDialog({ wave, pending, onStart }: BattleReadyDialogProps) {
  const { art } = waveInfo(wave.wave, wave.name);
  const sides: { title: string; rows: { label: string; icon: IconName; value: number }[] }[] = [
    {
      title: "Your City",
      rows: [
        { label: "Attack", icon: "attack", value: wave.cityAttack },
        { label: "Defense", icon: "defense", value: wave.cityDefense },
      ],
    },
    {
      title: wave.name,
      rows: [
        { label: "HP", icon: "heart", value: wave.hp },
        { label: "Attack", icon: "attack", value: wave.attack },
      ],
    },
  ];

  return (
    <Modal
      id={BATTLE_READY_DIALOG}
      title={`Wave ${wave.wave} is at the gates!`}
      subtitle={`Day ${wave.day}`}
      icon={<Icon name="thisWave" className="size-6" />}
      accent
      dismissible={false}
    >
      <div className="flex justify-center">
        {art && <Image src={art} alt={wave.name} sizes="16rem" className="h-auto w-64" />}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {sides.map((side) => (
          <div key={side.title} className="rounded-sm border-2 border-frame/60 p-3">
            <h3 className="mb-2 font-semibold">{side.title}</h3>
            <dl className="flex flex-col gap-1.5">
              {side.rows.map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <Icon name={row.icon} className="size-5" />
                  <dt className="flex-1 text-muted">{row.label}</dt>
                  <dd className="font-semibold">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <GameButton variant="danger" className="mt-5 w-full" disabled={pending} onClick={onStart}>
        {pending ? "Fighting…" : "Start Battle"}
      </GameButton>
    </Modal>
  );
}
