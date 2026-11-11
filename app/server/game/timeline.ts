import type {
  GameView,
  SubmitActionRequest,
  TimelineEntry,
} from "@/contracts/api";

type TimelineDraft = Omit<TimelineEntry, "id" | "day"> & { day?: number };

function goldChange(before: number, after: number): string {
  const difference = after - before;
  if (difference === 0) return "";
  return ` ${difference > 0 ? "+" : "−"}${Math.abs(difference)} gold.`;
}

export function describeTimelineAction(
  action: SubmitActionRequest,
  before: GameView,
  after: GameView,
): TimelineEntry[] {
  const previous = before.state;
  const next = after.state;
  const entries: TimelineDraft[] = [];

  switch (action.type) {
    case "upgradeWall":
      entries.push({
        category: "city",
        tone: "city",
        icon: "wallLevel",
        highlight: "Upgraded Wall",
        text: `to Lv.${next.wallLevel}. Defense ${before.stats.defense} → ${after.stats.defense}.`,
      });
      break;
    case "upgradeTroops":
      entries.push({
        category: "city",
        tone: "city",
        icon: "troopLevel",
        highlight: "Recruited Soldiers.",
        text: `Attack ${before.stats.attack} → ${after.stats.attack}.`,
      });
      break;
    case "upgradeCity":
      entries.push({
        category: "city",
        tone: "city",
        icon: "cityLevel",
        highlight: "Upgraded City",
        text: `to Lv.${next.cityLevel}. Max HP ${previous.cityMaxHp} → ${next.cityMaxHp}, income ${before.stats.dailyIncome} → ${after.stats.dailyIncome}.`,
      });
      break;
    case "repairCity":
      entries.push({
        category: "city",
        tone: "gain",
        icon: "repairWall",
        highlight: "Repaired the walls.",
        text: `City HP ${previous.cityHp} → ${next.cityHp}.`,
      });
      break;
    case "endPreparationDay":
      entries.push({
        day: next.day,
        category: "city",
        tone: "neutral",
        icon: "timeline",
        text: `Day ${next.day} began.${goldChange(previous.gold, next.gold)}`,
      });
      if (next.phase === "event" && after.eventNarrative) {
        entries.push({
          day: next.day,
          category: "event",
          tone: "neutral",
          icon: "upcomingWaves",
          highlight: "Event:",
          text: after.eventNarrative.title,
        });
      }
      if (next.phase === "battleReady" && after.wavePreview) {
        entries.push({
          day: next.day,
          category: "battle",
          tone: "loss",
          icon: "thisWave",
          highlight: `Wave ${after.wavePreview.wave}`,
          text: "is at the gates!",
        });
      }
      break;
    case "chooseEventOption": {
      const choice = before.eventNarrative?.choices.find(
        (candidate) => candidate.id === action.payload.choiceId,
      );
      const hpLost = previous.cityHp - next.cityHp;
      const hasLoss = next.gold < previous.gold || hpLost > 0;
      entries.push({
        category: "event",
        tone: hasLoss ? "loss" : "gain",
        icon: hasLoss ? "minus" : "plus",
        highlight: choice ? `Chose "${choice.label}".` : "Answered the event.",
        text: `${goldChange(previous.gold, next.gold)}${hpLost > 0 ? ` City HP −${hpLost}.` : ""}`.trim(),
      });
      break;
    }
    case "startBattle": {
      const result = after.report?.battleResult;
      if (result) {
        entries.push({
          category: "battle",
          tone: result.won ? "gain" : "loss",
          icon: "thisWave",
          highlight: result.won
            ? `Wave ${result.wave} defeated!`
            : `Wave ${result.wave} broke through.`,
          text: `City HP −${result.cityHpLost}.`,
        });
      }
      break;
    }
    case "chooseReward":
      entries.push({
        category: "event",
        tone: "gain",
        icon: "plus",
        highlight: "Took a reward.",
        text: goldChange(previous.gold, next.gold).trim(),
      });
      break;
    case "surrender":
      entries.push({
        category: "battle",
        tone: "loss",
        icon: "thisWave",
        highlight: "City surrendered.",
        text: `The defense ended on day ${previous.day}.`,
      });
      break;
    case "continueFromReport":
      break;
  }

  return entries.map(({ day, ...entry }, index) => ({
    ...entry,
    id: `${action.actionId}:${index}`,
    day: day ?? previous.day,
  }));
}
