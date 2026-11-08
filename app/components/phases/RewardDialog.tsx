import type { RewardOption } from "../../../src/game/types";
import Icon, { type IconName } from "../Icon";
import Modal from "../Modal";

export const REWARD_DIALOG = "phase-reward";

const KIND: Record<RewardOption["kind"], { icon: IconName; describe: (amount: number) => string }> = {
  grantGold: { icon: "gold", describe: (amount) => `+${amount} gold now` },
  prepIncomeBonus: { icon: "income", describe: (amount) => `+${amount} gold every preparation day` },
  upgradeDiscount: { icon: "cityLevel", describe: (amount) => `Upgrades ${Math.round(amount * 100)}% off until the next wave` },
};

type RewardDialogProps = {
  rewards: RewardOption[];
  pending: boolean;
  onChoose: (rewardId: string) => void;
};

/** phase "reward": after wave 1 the player picks one of three rewards. */
export default function RewardDialog({ rewards, pending, onChoose }: RewardDialogProps) {
  return (
    <Modal
      id={REWARD_DIALOG}
      title="Choose a Reward"
      subtitle="Pick one"
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
            <Icon name={KIND[reward.kind].icon} className="size-12" />
            <span className="text-lg font-semibold">{reward.label}</span>
            <span className="text-sm text-muted">{KIND[reward.kind].describe(reward.amount)}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
