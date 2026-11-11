/** One tutorial step: the part of the screen it points at (a `data-tutorial` value) and what it says. */
export type TutorialStep = {
  /** `data-tutorial` attribute of the element to highlight; none for a centered message. */
  target?: string;
  title: string;
  /** One string per paragraph. */
  body: string[];
};

// The order follows how a player reads the screen.
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome, Lord",
    body: [
      "Your city must hold for 100 days against 10 waves of monsters. Here is a quick tour of how to defend it.",
      "Remember, Lord: survival is not about winning every day. It is about being ready when the monsters arrive.",
    ],
  },
  {
    target: "day",
    title: "The Calendar",
    body: [
      "This shows today's day out of 100, and how many days are left until the next invasion. A wave attacks every 10 days.",
      "Use these peaceful days wisely. Every invasion gets you one step closer to the end.",
    ],
  },
  {
    target: "clock",
    title: "Time",
    body: [
      "Press Play and the days pass on their own. The thin bar shows how much of today is left. Pause at any time, or speed things up.",
      "My advice? Take your time when making important decisions. There's no shame in stopping to think, Lord.",
    ],
  },
  {
    target: "scene",
    title: "Your City",
    body: [
      "This is your town and its soldiers. On invasion days, the enemy wave appears here and the battle plays out.",
      "Keep an eye on your defenses. A beautiful city means nothing if there's nothing left to defend it!",
    ],
  },
  {
    target: "gold",
    title: "Gold",
    body: [
      "Your treasury, Lord! You earn gold at the start of every day and spend it on upgrades and repairs.",
      "A little economic investment early on can pay off later. Just don't spend everything you have. You never know when an emergency repair might be needed.",
    ],
  },
  {
    target: "action-buttons",
    title: "One Action a Day",
    body: [
      "Each day, you may take one action: upgrade the city, recruit soldiers, upgrade the wall, or repair it. The cost is shown on each button.",
      "Choose carefully. More income helps you afford future upgrades, soldiers improve your attack, and stronger walls improve your defense. There's no such thing as a perfect choice, only the one your city needs most.",
    ],
  },
  {
    target: "end-day",
    title: "Ending the Day",
    body: [
      "End Day moves on to tomorrow. Tick Auto End Day to move on automatically after each successful action.",
      "But be careful, Lord! Don't let the days slip away without checking how close the next invasion is.",
    ],
  },
  {
    target: "status",
    title: "City Status",
    body: [
      "Here you'll find your city's HP and its three upgrade tracks. Each track climbs through tiers, and your city's appearance changes with every new tier. Attack, defense, and income are displayed below.",
      "A strong army is useless if your walls crumble too quickly. And the strongest walls won't help if your soldiers can't fight back. Balance your upgrades!",
    ],
  },
  {
    target: "this-wave",
    title: "This Wave",
    body: [
      "This shows the next wave approaching your walls, including its HP and attack. Compare its strength with your own attack and defense before the battle.",
      "Study your enemy before they reach your gates. If their attack is too strong, consider repairing or strengthening your walls. If they have too much HP, perhaps you need more soldiers.",
    ],
  },
  {
    target: "upcoming",
    title: "Upcoming Waves",
    body: [
      "These are the waves coming after the next one. Only their shadows are known until they come closer.",
      "Don't get too comfortable after defeating a wave, Lord. Another one is always waiting.",
    ],
  },
  {
    target: "timeline",
    title: "Timeline",
    body: [
      "Everything that has happened in this run: upgrades, events, battles, and rewards. Use the filters to narrow it down.",
      "Not sure where your gold went? Forgot what happened during the last invasion? The timeline has you covered. Keep track of your mistakes as well as your victories.",
    ],
  },
  {
    target: "settings",
    title: "Settings",
    body: [
      "You can pause the game, return to the menu, surrender, or replay this tutorial from here.",
      "And that's about it, Lord! Your kingdom is counting on you. Make every day count, prepare for every invasion, and whatever you do...",
      "Don't let those monsters through the gates!",
      "Good luck, Lord!",
    ],
  },
];
