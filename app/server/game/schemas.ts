import { z } from "zod";

const emptyPayload = z.object({}).strict();
const baseAction = {
  actionId: z.uuid(),
  expectedRevision: z.number().int().min(0),
};

export const createRunSchema = z.object({
  startRequestId: z.uuid(),
  replaceActiveSave: z.boolean().default(false),
  difficulty: z.enum(["easy", "normal", "hard"]),
}).strict();

export const submitActionSchema = z.discriminatedUnion("type", [
  z.object({ ...baseAction, type: z.literal("upgradeWall"), payload: emptyPayload }).strict(),
  z.object({ ...baseAction, type: z.literal("upgradeTroops"), payload: emptyPayload }).strict(),
  z.object({ ...baseAction, type: z.literal("upgradeCity"), payload: emptyPayload }).strict(),
  z.object({ ...baseAction, type: z.literal("repairCity"), payload: emptyPayload }).strict(),
  z.object({ ...baseAction, type: z.literal("endPreparationDay"), payload: emptyPayload }).strict(),
  z.object({
    ...baseAction,
    type: z.literal("chooseEventOption"),
    payload: z.object({ choiceId: z.string().min(1).max(100) }).strict(),
  }).strict(),
  z.object({ ...baseAction, type: z.literal("startBattle"), payload: emptyPayload }).strict(),
  z.object({ ...baseAction, type: z.literal("continueFromReport"), payload: emptyPayload }).strict(),
  z.object({
    ...baseAction,
    type: z.literal("chooseReward"),
    payload: z.object({ rewardId: z.string().min(1).max(100) }).strict(),
  }).strict(),
  z.object({ ...baseAction, type: z.literal("surrender"), payload: emptyPayload }).strict(),
]);

export type CreateRunInput = z.infer<typeof createRunSchema>;
export type SubmitActionInput = z.infer<typeof submitActionSchema>;
