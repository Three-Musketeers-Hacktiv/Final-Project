import type { RewardOption } from "../../../src/game/types";
import Icon, { type IconName } from "../Icon";
import Modal from "../Modal";

export const REWARD_DIALOG = "phase-reward";

// The engine's labels already state the amount (e.g. "Field medics (heal 35 HP)"); the icon shows the kind.
const ICON: Record<RewardOption["kind"], IconName> = {
  grantGold: "gold",
  prepIncomeBonus: "income",
  upgradeDiscount: "cityLevel",
  healCity: "cityHp",
  maxHpBonus: "heart",
  nextWaveDefense: "defense",
  combo: "plus",
};

type RewardDialogProps = {
  /** The wave just cleared; its reward set is shown. */
  wave: number;
  rewards: readonly RewardOption[];
  pending: boolean;
  onChoose: (rewardId: string) => void;
};

/** phase "reward": after waves 1–9 the player picks one of that wave's three rewards. */
export default function RewardDialog({ wave, rewards, pending, onChoose }: RewardDialogProps) {
  return (
    <Modal
      id={REWARD_DIALOG}
      title="Choose a Reward"
      subtitle={`Wave ${wave} cleared · Pick one`}
      icon={<Icon name="plus" className="size-6" />}
      size="lg"
      dismissible={false}
    >
      <p className="text-lg">The city survived the wave. The people offer their thanks.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {rewards.map((reward) => (
          <button
            key={reward.id}
            type="button"
            disabled={pending}
            onClick={() => onChoose(reward.id)}
            className="flex flex-col items-center gap-2 rounded-sm border-2 border-gold/60 bg-panel-head p-4 text-center transition-colors hover:border-gold hover:bg-track disabled:cursor-wait disabled:opacity-60"
          >
            <Icon name={ICON[reward.kind]} className="size-12" />
            <span className="text-lg font-semibold">{reward.label}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
