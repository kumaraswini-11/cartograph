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

## Explaining a file

`explainFile(file, deps)` (spec 009) runs inside one traced call: the
organization's cache first (a hit is a run with no model call), then, on a
miss, the source and the model. `file` carries the facts the parser found:
the file's hash, its role, and its real dependencies and dependents. The
model is handed those and never asked to find connections (C-01). `deps`
supplies the cache, the source and the model call, so the package knows
nothing of storage or GitHub.

- The answer must fit `answerSchema`: a paragraph, and an inferred role
  from `INFERRED_ROLES` or none, never a surface role (C-02).
- `ungroundedPaths` checks every file it names against the analysis
  (`pathIndex`, built once). An answer naming an absent file is asked for
  once more, then refused, and nothing is cached (FR-006).
- A refusal for the model's request limit returns `limited` at once; it
  isn't retried.
- A role is asked for only when the file's role is `UNIDENTIFIED`, taken
  from `@workspace/frameworks/taxonomy`, never spelled again here.

## Explaining a box

`explainBox(box, deps)` takes the same steps, with no source to fetch: the
box's folders, its files and their roles, and the imports across its edge
(spec 009, FR-002, plan D-12). The caller builds the box with the map's own
`buildBoxes`, so it's the box on screen. Each list is capped at 60, with
the rest counted. A box never gets an inferred role.

## Shared by both

- Browser-safe subpaths: `@workspace/ai/text` reads an explanation into its
  three formats (code, bold, bullets) and drops any other mark (FR-007);
  `@workspace/ai/grounding` turns a named path into the analysis's file, for
  links (FR-008); `@workspace/ai/source` fences a file's source as data and
  shortens it (`fenced`, `shortenSource`).
- A busy model (HTTP 408 or 5xx) is told apart from the free tier's request
  limit (429): `isUnavailable` and `isLimited`. `paced` spaces requests to
  the model's per-minute limit, for the evaluation's runs.

## Answering a question (spec 010)

`answerQuestion(analysis, messages, deps)` returns an AI SDK UI message
stream for `useChat`. The model (`CHAT_MODEL`) is handed lookups, never the
repository: each runs `@workspace/graph`'s query (a walk is the detail
pane's `walk`), is its own traced run, and writes itself to the stream as it
finishes. The answer is held until every file it names is in the analysis,
asked for once more if not, and with no lookup made nothing is answered.
The stream ends with a `data-outcome` part: answered (and whether it
stopped at `MAX_LOOKUPS`), declined, ungrounded, limited (the model's
request limit), unavailable (the model busy), or paused (the organization's
own limit, spec 012).

- `readChatMessages` checks a request's conversation against the UI message
  shape; `keptHistory` sends the model only its recent text
  (`@workspace/ai/chat/history`, `recentText`, browser-safe, so the tab
  sends the same); `chatResponse` turns the stream into the HTTP response.
- `outcomeOnly(outcome)` is a reply that is only its ending, with no model
  asked: the app's refusal at the organization's limit (spec 012, FR-007).
  The caller checks the limit; this package knows none.

- `toModelOutput` cuts each list the model sees to `MODEL_LIST_LIMIT`
  paths; the browser gets the whole result.
- A file's source goes to the model fenced as data (`source.ts`, shared
  with explanations).
- `@workspace/ai/chat/limits` is browser-safe, for the tab's words.

## The choices behind it

The model (Gemini, free tier), the tracing service (LangSmith, free plan),
the library (the AI SDK), and every option weighed are recorded in
[ADR 0003](../../docs/adr/0003-ai-model-and-tracing.md).

## Docs

[Spec 009](../../docs/specs/009-file-explanations/spec.md) and its
[plan](../../docs/specs/009-file-explanations/plan.md), D-01 to D-03 ·
[Spec 010](../../docs/specs/010-repository-chat/spec.md) ·
[Spec 012](../../docs/specs/012-production-readiness/spec.md), FR-007.
