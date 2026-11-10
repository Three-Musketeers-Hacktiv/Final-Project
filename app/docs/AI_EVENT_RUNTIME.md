# AI Event Runtime Specification

Status: **Implemented and synchronized with latest engine patch**
Owner: Backend
Updated: 2026-11-09

## 1. Purpose and authority

The AI runtime decorates a trusted engine event when an action first enters an event day. Create-run does not call an AI provider, and prepared narratives are out of scope.

- The game engine owns `eventPlan`, event/choice IDs, costs, effects, rules, damage, and state transitions.
- Backend sends trusted event copy to a provider, validates the response, and persists the decorated narrative with the action.
- AI may change only the title, description, and choice labels.
- Provider failure must not fail a valid gameplay action; backend first checks the shared valid AI catalog, then uses the trusted engine copy as fallback.
- Frontend displays the backend response and never calls Gemini directly.

The active backend runtime uses the official Google Gen AI SDK. The former OpenAI dependency and hardcoded runtime path have been removed.

## 2. Default provider and configuration

Google Gemini is the default provider. The adapter is selected only by server environment configuration.

| Variable | Required | Recommended/default | Purpose |
|---|---:|---|---|
| `AI_PROVIDER` | Yes | `gemini` | Selects a supported backend adapter. |
| `GEMINI_API_KEY` | For Gemini runtime | none | Server-only Gemini credential. |
| `GEMINI_MODEL` | For Gemini runtime | chosen during deployment | Gemini model with JSON/schema output support. |
| `AI_TIMEOUT_MS` | No | `10000` | One provider-call timeout. |
| `AI_MAX_RETRIES` | No | `1` | Retry count for transient failures. |
| `AI_MAX_OUTPUT_TOKENS` | No | `800` | Maximum narrative output. |
| `AI_PROMPT_VERSION` | No | `event-advisor-en-v1` | Audit/reproduction identifier. |
| `AI_API_KEY` | Only for an implemented alternative adapter | none | Generic alternative-provider credential. |
| `AI_MODEL` | Only for an implemented alternative adapter | none | Generic alternative-provider model. |

The environment schema rejects an unsupported `AI_PROVIDER`. Defining generic variables does not imply that an adapter exists. Secrets never use a `NEXT_PUBLIC_` prefix and are stored only in local untracked environment files or Vercel Environment Variables.

Local/test may intentionally run fallback-only. Preview/Production preflight reports an incomplete AI configuration when live Gemini is required for the demo.

## 3. Provider-neutral interface

Domain services depend on an interface, not a Gemini SDK:

```ts
interface EventNarrativeGenerator {
  readonly provider: string;
  readonly model: string | null;
  generate(input: EventNarrativeInput): Promise<GeneratedEventNarrative>;
}
```

The implementation set consists of a Gemini generator, trusted fallback generator, and deterministic mock for tests. Another provider may be added only behind the same interface and validation rules.

## 4. Input and prompt

The provider receives only:

- `locale: "en-US"`;
- day, `eventId`, and `packageId` from the active engine event;
- trusted title and description;
- each trusted choice ID;
- effective `goldCost` from `activeEvent.choices` and trusted effect summaries when needed for coherent wording.

Prompt intent:

> Provide the narrative and choices in English as a loyal city advisor recommending options to his lord. Preserve every supplied choice ID, do not create or change gameplay rules, choices, costs, or effects, and do not mention currency terms such as gold, coin(s), treasury, or gp in a choice label.

Do not send username, password, cookie, JWT, IP address, MongoDB URI, full save state, secrets, or unsanitized player input.

## 5. Validated output

Zod is the runtime source of truth for provider output. The target shape is:

```ts
const GeneratedEventNarrativeSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  choices: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
    }).strict(),
  ).min(2).max(4),
}).strict();
```

Post-schema validation requires:

- exactly the trusted 2–4 choice-ID set, with no duplicate, missing, or invented ID;
- English text within configured length limits;
- no numeric gameplay authority from provider output;
- merge by choice ID, never by array position.

Backend restores trusted costs/effects after validation. Labels pass through the engine trusted-label policy; any supported currency term (`gold`, `coin`/`coins`, `treasury`, or `gp`) makes the label fall back to the engine label even without a numeric amount. Descriptions are not scanned because they have no gameplay authority.

## 6. On-demand flow

1. The client submits an ordinary game action.
2. The engine returns a next state whose `activeEvent` is newly present.
3. Backend derives input from that trusted scheduled/consequence event, including origin IDs when present.
4. Backend reuses an existing `runs_event` snapshot for the same run/event when present.
5. Otherwise backend calls Gemini before opening the MongoDB transaction and validates with Zod plus trusted choice IDs.
6. If generation is unavailable or fails, backend tries seeded `source: "fallback"` rows for the same ruleset/package/day, preferring `fallback-catalog-v3`, then `fallback-catalog-v2`, then older seeded rows. Shared `source: "ai"` rows are not reused, because they may describe another city's condition. Invalid rows are skipped.
7. If no seeded row fits, the trusted engine scene text is used. A new AI success is stored for that run's `runs_event` snapshot and is not regenerated on refresh.
8. The action transaction persists state, logs, properties, any new `event_data`, and `runs_event` atomically. Shared catalog reuse creates only the run allocation.
9. If resolving one event activates another on the same day, backend repeats this flow for the successor event in the same action response.

On load, `ensureLocalEvent` recovers an unfinished required event whose active copy is missing. The backend neutralizes the helper's standalone revision increment when folding recovery into a player action, so one public action still advances exactly one revision.

An idempotent retry detected before generation does not call the provider. Concurrent requests may briefly issue more than one provider call, but revision checks and unique indexes permit only one committed transition.

## 7. Fallback and sources

Fallback is mandatory for missing configuration, timeout, network/rate error, refusal, invalid JSON/schema, unsafe text, unknown choice IDs, or any adapter exception.

Persistent source values are:

```ts
type EventNarrativeSource = "ai" | "fallback" | "mock";
```

Engine `activeEvent.source === "local"` is a transient pre-decoration value and is never stored as the backend narrative source.

Minimum metadata includes source, provider/model when applicable, prompt version, and creation time. Operational logs may include correlation ID, run/event ID, latency, source, error category, and usage metadata. Logs must not contain provider keys, cookies, tokens, connection strings, or full prompts.

## 8. Timeout and retry

- Initial timeout: 10 seconds.
- At most one application retry for an explicitly transient failure.
- Invalid output/refusal goes directly to trusted fallback unless the adapter classifies it as safely retryable.
- The total provider budget stays below the Vercel function timeout.
- MongoDB transactions are never held open while waiting for AI.

Final values are verified in Vercel Preview and remain configurable through the generic `AI_*` variables.

## 9. Test requirements

- Valid Gemini output changes narrative fields only.
- Reordered valid choices merge by ID.
- Missing, duplicate, invented, or dynamic-ID mismatch falls back.
- Missing key, timeout, network error, refusal, and invalid schema fall back.
- Provider failure reuses a valid shared AI catalog entry before local fallback.
- Stored narrative IDs are revalidated and labels mentioning supported currency terms fall back to trusted engine labels.
- Same-day successor events and missing-active-event recovery do not duplicate effects or revision increments.
- Fallback and AI responses expose the same API shape.
- On-demand generation occurs once for the successfully committed event transition.
- Default unit/integration/campaign tests use a mock or fallback and never call live Gemini.
- A live Gemini smoke test is explicit, budget-limited, and requires dedicated environment opt-in.

## 10. Acceptance criteria

- Gemini is the default configured provider.
- Advisor text is English and addresses the player as “my lord”.
- Gameplay remains fully engine-owned.
- A provider outage does not block a valid event transition.
- Only validated provider output is persisted.
- Provider credentials remain server-only.
- Source/provider/model/prompt version are auditable without logging secrets.

Implementation and verification are tracked as BE-R06 in [BACKEND_REMEDIATION_PLAN.md](./BACKEND_REMEDIATION_PLAN.md).
