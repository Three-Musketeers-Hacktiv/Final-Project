# Engine → Frontend contract (event price, labels, chains)

Companion: [CAMPAIGN_100_DAY_CONTRACT.md](./CAMPAIGN_100_DAY_CONTRACT.md) · [game-engine/API_AND_INTEGRATION.md](./game-engine/API_AND_INTEGRATION.md). UI code is not changed by the engine patch. Wire the product event modal to these fields.

## Fields to read

From `state.activeEvent` (present while `phase === "event"`):

| Field | Use |
|---|---|
| `title`, `description` | Narrative. Description may mention gold; do not parse it for a price. |
| `choices[].id` | Send back to `chooseEventOption`. Do not invent ids. |
| `choices[].label` | Display text only. If an AI or stored overlay mentions `gold`, `coin`, `treasury`, or `gp`, the engine replaces that label with the trusted local label. That fallback is normal, not an error. The local label may still show the materialized price. |
| `choices[].goldCost` | **Only** price to display and the amount that will be charged. Already difficulty-scaled. `0` means free. Do not multiply again. Do not parse `label` for a price. |
| `choices[].effects` | Mechanical summary. Include `healCity` and `maxHpBonus` as well as gold, damage, defense, and discount. |
| `isConsequence` | Show a consequence badge when true. Same choice control as a scheduled event. |

## Price line

```text
label          → button title (may be flavor)
goldCost > 0   → "{goldCost} gold"
goldCost === 0 → "Free"
```

Local packages materialize `{goldCost}` inside the engine label before the client sees it. If the title and the price line both show the same number, that is fine. If the title has no number, the price line is still authoritative.

## Same-day chain

`chooseEventOption` can finish one event and immediately open another on the same day (`phase` stays `"event"`, `activeEvent` is a new identity). Keep the modal open and render the new `activeEvent`. Do not require the player to refresh, and do not call a calendar jump.

## Do not

- Rescale `goldCost`.
- Treat the label as the price, including after a fallback to the engine label.
- Treat a fallback label as a failed request.
- Hide the price line because the label looks free.
- Close the modal while `phase === "event"`.
