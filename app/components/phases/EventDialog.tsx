import type { ActiveEvent, Effect } from "../../../src/game";
import Icon from "../Icon";
import Modal from "../Modal";

export const EVENT_DIALOG = "phase-event";

/** Wording only: the amounts come from the engine's event package. */
function describeEffect(effect: Effect): string {
  switch (effect.type) {
    case "grantGold":
      return `+${effect.amount} gold`;
    case "damageCity":
      return `City HP −${effect.amount}`;
    case "healCity":
      return `City HP +${effect.amount}`;
    case "maxHpBonus":
      return `Max HP +${effect.amount}`;
    case "nextWaveDefense":
      return `Defense +${effect.amount} during wave ${effect.wave}`;
    case "upgradeDiscount":
      return `Upgrades ${Math.round(effect.rate * 100)}% off until wave ${effect.untilWave}`;
  }
}

type EventDialogProps = {
  event: ActiveEvent;
  /** For a consequence event: the earlier choice that led to it, and its day when known. */
  cause: { label: string; day: number | null } | null;
  pending: boolean;
  onChoose: (choiceId: string) => void;
  /** Hides the screen for a look at the game; it comes back from the bar at the bottom. */
  onHide: () => void;
};

/**
 * phase "event": the player must pick one of the choices (2–4) before the day goes on. A choice can
 * open a follow-up event on the same day; the phase stays "event" and this dialog simply shows it.
 */
export default function EventDialog({ event, cause, pending, onChoose, onHide }: EventDialogProps) {
  return (
    <Modal
      id={EVENT_DIALOG}
      title={event.title}
      subtitle={`Day ${event.day} · ${event.isConsequence ? "Consequence" : "Event"}`}
      icon={<Icon name="timeline" className="size-6" />}
      // A consequence is a payback for an earlier choice: the red header marks it at a glance.
      accent={event.isConsequence}
      dismissible={false}
      onHide={onHide}
    >
      {/* Ties the payback to the decision that caused it. */}
      {event.isConsequence && (
        <p className="mb-4 rounded-sm border-2 border-crimson/70 bg-crimson/15 px-3 py-2">
          <span className="font-bold text-crimson day:text-red-700">⚠ Consequence</span>
          {cause ? (
            <>
              {" · "}You chose <q className="italic">{cause.label}</q>
              {cause.day !== null && ` on day ${cause.day}`}.
            </>
          ) : (
            " · This follows from an earlier choice."
          )}
        </p>
      )}
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
