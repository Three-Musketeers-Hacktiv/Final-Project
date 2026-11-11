import Image from "next/image";
import defeatArt from "../assets/defeat/defeat.png";
import victoryArt from "../assets/victory/victory_transparent.png";
import GameButton from "../GameButton";
import Icon, { type IconName } from "../Icon";
import Modal from "../Modal";
import NewGameButton from "../NewGameButton";

export const VICTORY_DIALOG = "phase-victory";
export const GAME_OVER_DIALOG = "phase-game-over";

type EndScreenProps = {
  outcome: "victory" | "gameOver";
  day: number;
  wavesCleared: number;
  cityHp: number;
  cityMaxHp: number;
  gold: number;
  /** Hides the screen for a look at the game; it comes back from the bar at the bottom. */
  onHide: () => void;
};

/** phase "victory" / "gameOver": the run is over and can no longer take actions. */
export default function EndScreen({ outcome, day, wavesCleared, cityHp, cityMaxHp, gold, onHide }: EndScreenProps) {
  const won = outcome === "victory";
  // Game over with the city still standing means the player surrendered.
  const surrendered = !won && cityHp > 0;
  const stats: { label: string; icon: IconName; value: string }[] = [
    { label: "Day reached", icon: "timeline", value: String(day) },
    { label: "Waves cleared", icon: "thisWave", value: String(wavesCleared) },
    { label: "City HP", icon: "cityHp", value: `${cityHp} / ${cityMaxHp}` },
    { label: "Gold left", icon: "gold", value: String(gold) },
  ];

  return (
    <Modal
      id={won ? VICTORY_DIALOG : GAME_OVER_DIALOG}
      title={won ? "Victory" : "Game Over"}
      accent={!won}
      dismissible={false}
      onHide={onHide}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src={won ? victoryArt : defeatArt}
          alt={won ? "The castle standing with its banners raised" : "The castle in ruins under a white flag"}
          sizes="(min-width: 640px) 24rem, 100vw"
          // defeat.png has empty space above and below the ruins (they fill rows 172–838 of 1024): crop it.
          className={`w-full max-w-sm select-none ${won ? "h-auto" : "aspect-[1536/690] object-cover"}`}
          draggable={false}
        />
        <h3 className="text-3xl font-bold">
          {won ? "The city stands!" : surrendered ? "The city has surrendered" : "The city has fallen"}
        </h3>
        <p className="text-muted">
          {won
            ? `Your walls held through all ${day} days of the siege.`
            : surrendered
              ? `You gave up the defense on day ${day}.`
              : `The walls broke on day ${day}.`}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2 rounded-sm border-2 border-frame/60 px-3 py-2">
            <Icon name={stat.icon} className="size-6" />
            <dt className="flex-1 text-sm text-muted">{stat.label}</dt>
            <dd className="font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <GameButton href="/">Main Menu</GameButton>
        {/* The finished run no longer counts as the active save, so this starts fresh. */}
        <NewGameButton saveDay={null} />
      </div>
    </Modal>
  );
}
