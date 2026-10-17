# @workspace/ai

The one place that builds the model client and its tracing (spec 009,
C-04). Every model call in Cartograph goes through here, so none can go
untraced, and changing the model touches this package only.

## Why a separate package

A second place that constructs a model client is a second, untraced path
(`009` C-04). Kept here, the model's name, its key's use and the tracing
setup are each defined once. Specs `010` and `011` reuse them. It knows
nothing of storage or the web app: keys and settings are passed in.

## Use

```ts
import { generateText } from "ai"
import { MODEL, languageModel, tracing } from "@workspace/ai"

const traces = tracing({
  tracing: env.LANGSMITH_TRACING,
  apiKey: env.LANGSMITH_API_KEY,
  endpoint: env.LANGSMITH_ENDPOINT,
  project: env.LANGSMITH_PROJECT,
})

const explain = traces.traced("explain-file", async (path: string) => {
  // A cache read here is recorded too: a hit is a run with no model call.
  const { text } = await generateText({
    model: languageModel(env.GEMINI_API_KEY),
    prompt: `…`,
  })
  return text
})

await explain("src/index.ts")
await traces.flush() // before a serverless function returns
```

- `MODEL` is `gemini-3.6-flash`, an exact version, never an alias
  (`009` FR-012). Its test refuses `-latest` names and previews.
- `tracing(…)` is made once per server: the AI SDK's telemetry is global.
  When `LANGSMITH_TRACING` isn't `"true"`, or there's no key, `traced`
  returns the function itself, `enabled` is `false`, and nothing is
  recorded (`009` FR-013).

## The choices behind it

The model (Gemini, free tier), the tracing service (LangSmith, free plan),
the library (the AI SDK), and every option weighed are recorded in
[ADR 0003](../../docs/adr/0003-ai-model-and-tracing.md).

## Docs

[Spec 009](../../docs/specs/009-file-explanations/spec.md) and its
[plan](../../docs/specs/009-file-explanations/plan.md), D-01 to D-03.
