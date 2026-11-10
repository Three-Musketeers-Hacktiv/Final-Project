# Narrative scene review

Manual check after a play session. Do not assert exact AI sentences in tests.

## Automated contract

- Context bands, next enemy name, origin choice, and no pending-consequence leak: `server/ai/narrative-context.test.ts`.
- Choice IDs, currency label policy, and local fallback: `server/ai/event-narrative.test.ts`.
- Shared AI rows are ignored; v3 seed is preferred over v2: `server/game/narrative-catalog.test.ts`.
- Fifty seeded scenes still match engine choice IDs and reject contradictory phrases: `server/content/fallback-events.validation.test.ts`.

## Editorial pass (catalog v3)

Reviewed the authored scene bank, not only schema checks. Each scheduled and consequence package has one scene: who is present, where, and why an order is needed today. Choice labels are orders. Costs and effect numbers stay on the engine buttons.

Checked specifically that shortage, late raid, mid raid, and finale scenes no longer say "no HP loss", "lose the discount", or "heal then lose HP". Consequence prose names the kind of earlier decision (gate, bargain, warning) and does not invent a different origin. Day clauses only change the opening sentence so the same package can appear on two days without copying a broken label.

## Manual scenes

1. Healthy, wealthy city on Alchemists (`d5-market-b`): the scene is the oil casks, not a generic quarrel. Labels are bargain, claim casks for shelters, or send them away. UI still shows the real cost and Max HP / discount effects.
2. Critical HP and little gold on the same package: tone may mention strain, but the three actions stay the same and do not promise a free heal or a payment that was not charged.
3. Hunters at the west gate (`d3-market-b`): hunters, not a copied alchemist scene.
4. Consequence after sending the alchemists away: the origin banner and prose refer to that refusal, not to scouts or a guild.
5. Refresh the same event: title and labels do not change, and no second AI call is required.

## Acceptance

- No “quarrel before wave”, “choose carefully”, or “incoming consequence” in the trusted package text.
- Title, scene, and choice actions belong to one situation.
- Effects and costs on the buttons still come from the engine.
