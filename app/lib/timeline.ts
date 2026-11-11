// The timeline is built and stored by the server: every GameView carries the run's whole history as
// `game.timeline`, oldest first (app/docs/API_CONTRACT.md §3). The client only displays it.
export type { TimelineCategory, TimelineEntry, TimelineTone } from "@/contracts/api";
