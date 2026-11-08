import type { ActiveEvent, Effect } from "../../../src/game";
import Icon from "../Icon";
import Modal from "../Modal";

export const EVENT_DIALOG = "phase-event";

/** Wording only: the amounts come from the engine's event package. */
function describeEffect(effect: Effect) {
  switch (effect.type) {
    case "grantGold":
      return `+${effect.amount} gold`;
    case "damageCity":
      return `City HP −${effect.amount}`;
    case "nextWaveDefense":
      return `Defense +${effect.amount} during wave ${effect.wave}`;
    case "upgradeDiscount":
      return `Upgrades ${Math.round(effect.rate * 100)}% off until wave ${effect.untilWave}`;
  }
}

type EventDialogProps = {
  event: ActiveEvent;
  pending: boolean;
  onChoose: (choiceId: string) => void;
};

/** phase "event": the player must pick one of two choices before the day goes on. */
export default function EventDialog({ event, pending, onChoose }: EventDialogProps) {
  return (
    <Modal
      id={EVENT_DIALOG}
      title={event.title}
      subtitle={`Day ${event.day} · Event`}
      icon={<Icon name="timeline" className="size-6" />}
      dismissible={false}
    >
      <p className="text-lg">{event.description}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {event.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            disabled={pending}
            onClick={() => onChoose(choice.id)}
            className="flex flex-col gap-2 rounded-sm border-2 border-gold/60 bg-panel-head p-3 text-left transition-colors hover:border-gold hover:bg-track disabled:cursor-wait disabled:opacity-60"
          >
            <span className="text-lg font-semibold">{choice.label}</span>
            <span className="flex items-center gap-1.5 text-gold">
              <Icon name="gold" className="size-5" />
              {choice.goldCost > 0 ? `${choice.goldCost} gold` : "Free"}
            </span>
            <ul className="text-sm text-muted">
              {choice.effects.length === 0 ? <li>No other effect</li> : choice.effects.map((effect, i) => <li key={i}>{describeEffect(effect)}</li>)}
            </ul>
          </button>
        ))}
      </div>
    </Modal>
  );
}
