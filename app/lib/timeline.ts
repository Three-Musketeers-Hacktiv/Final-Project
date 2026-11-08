import type { GameView, SubmitActionRequest } from "@/contracts/api";
import type { IconName } from "@/components/Icon";

export type TimelineCategory = "city" | "battle" | "event";
export type TimelineTone = "city" | "gain" | "loss" | "neutral";

export type TimelineEntry = {
  id?: string;
  day: number;
  category: TimelineCategory;
  tone: TimelineTone;
  icon: IconName;
  highlight?: string;
  text: string;
};

type Entry = Omit<TimelineEntry, "id" | "day">;

/** "+12 gold" / "−30 gold" from two server snapshots, or "" when nothing changed. */
function goldChange(before: number, after: number) {
  const diff = after - before;
  if (diff === 0) return "";
  return ` ${diff > 0 ? "+" : "−"}${Math.abs(diff)} gold.`;
}

/**
 * Describes what one successful action did, by comparing the GameViews the server returned before and
 * after it. Only wording: every number shown here comes from those two server snapshots.
 */
export function describeAction(action: SubmitActionRequest, before: GameView, after: GameView): TimelineEntry[] {
  const b = before.state;
  const a = after.state;
  const entries: (Entry & { day?: number })[] = [];

  switch (action.type) {
    case "upgradeWall":
      entries.push({
        category: "city", tone: "city", icon: "wallLevel", highlight: "Upgraded Wall",
        text: `to Lv.${a.wallLevel}. Defense ${before.stats.defense} → ${after.stats.defense}.`,
      });
      break;
    case "upgradeTroops":
      entries.push({
        category: "city", tone: "city", icon: "troopLevel", highlight: "Recruited Soldiers.",
        text: `Attack ${before.stats.attack} → ${after.stats.attack}.`,
      });
      break;
    case "upgradeCity":
      entries.push({
        category: "city", tone: "city", icon: "cityLevel", highlight: "Upgraded City",
        text: `to Lv.${a.cityLevel}. Max HP ${b.cityMaxHp} → ${a.cityMaxHp}, income ${before.stats.dailyIncome} → ${after.stats.dailyIncome}.`,
      });
      break;
    case "repairCity":
      entries.push({
        category: "city", tone: "gain", icon: "repairWall", highlight: "Repaired the walls.",
        text: `City HP ${b.cityHp} → ${a.cityHp}.`,
      });
      break;
    case "endPreparationDay":
      entries.push({
        day: a.day, category: "city", tone: "neutral", icon: "timeline",
        text: `Day ${a.day} began.${goldChange(b.gold, a.gold)}`,
      });
      if (a.phase === "event" && after.eventNarrative) {
        entries.push({
          day: a.day, category: "event", tone: "neutral", icon: "upcomingWaves", highlight: "Event:",
          text: after.eventNarrative.title,
        });
      }
      if (a.phase === "battleReady" && after.wavePreview) {
        entries.push({
          day: a.day, category: "battle", tone: "loss", icon: "thisWave", highlight: `Wave ${after.wavePreview.wave}`,
          text: "is at the gates!",
        });
      }
      break;
    case "chooseEventOption": {
      const { choiceId } = action.payload;
      const choice = before.eventNarrative?.choices.find((c) => c.id === choiceId);
      const hpLost = b.cityHp - a.cityHp;
      entries.push({
        category: "event",
        tone: a.gold < b.gold || hpLost > 0 ? "loss" : "gain",
        icon: a.gold < b.gold || hpLost > 0 ? "minus" : "plus",
        highlight: choice ? `Chose "${choice.label}".` : "Answered the event.",
        text: `${goldChange(b.gold, a.gold)}${hpLost > 0 ? ` City HP −${hpLost}.` : ""}`.trim(),
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
          highlight: result.won ? `Wave ${result.wave} defeated!` : `Wave ${result.wave} broke through.`,
          text: `City HP −${result.cityHpLost}.`,
        });
      }
      break;
    }
    case "chooseReward":
      entries.push({
        category: "event", tone: "gain", icon: "plus", highlight: "Took a reward.",
        text: goldChange(b.gold, a.gold).trim(),
      });
      break;
    case "continueFromReport":
      break;
  }

  return entries.map(({ day, ...entry }) => ({ ...entry, day: day ?? b.day, id: crypto.randomUUID() }));
}
