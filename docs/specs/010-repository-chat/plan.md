# 010 — Repository chat: plan

**Spec:** [spec.md](spec.md)
**Status:** Approved

## Approach

A member asks a question in the right pane's Chat tab (FR-011).

1. The browser posts the conversation to the analysis's chat route. The
   route checks that the analysis is the member's organization's, reading
   with their token as every read does, and builds the analysis's map input
   from its stored result, as the page does.
2. Everything after that runs inside one traced function (FR-010):
   - The model is handed the question and a set of lookups (FR-002), never
     the repository itself. Each lookup is a query over the stored result,
     run by the same code the map and the detail pane use; a walk is
     `004`'s `walk` (FR-003, C-01).
   - The model picks lookups, several at a time when it can, and each one
     is streamed to the browser with what it returned as it finishes
     (FR-004).
   - After `MAX_LOOKUPS` lookups the lookups are withdrawn, and the model is
     told to answer from what it has and say it stopped (FR-005).
   - The answer is held, not streamed, until every file it names is checked
     against the analysis. An ungrounded one is asked for once more; a
     second one is replaced by a sentence saying no grounded answer could
     be given (FR-006).
   - If no lookup was made, the model's text is never shown: a fixed
     sentence says the chat answers only questions about this analysis
     (FR-007, C-04).
3. The browser shows each lookup as it arrives, then the answer, in `009`'s
   formatting, every path a way to that file on the map (FR-008, FR-009).
   The conversation lives in the page, beside the map's state, and is never
   stored (FR-012).

Nothing new costs anything: chat uses another model on the same free key
(D-01), and the same tracing.

## Modules and interfaces

| Module                                                 | What it does                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/graph/src/lookups.ts`                        | The lookups as pure queries over `MapInput` (FR-002): `findFiles(input, query)`, `fileDetails(input, path)`, `neighbours(input, path)`. Blast radius and dependency chain are `walk` itself (`reach.ts`), routes and insights the existing `input.routes` and `insights(…)`. No AI. |
| `packages/ai/src/model.ts`                             | `CHAT_MODEL`: `gemini-3.5-flash-lite`, an exact version (D-01). `MODEL` stays explanations'.                                                                                                                                                                                        |
| `packages/ai/src/chat/lookups.ts`                      | Each lookup as an AI SDK tool: a zod input, `execute` calling the query, wrapped in `traced`, and `toModelOutput` shortening long lists for the model while the browser gets them whole (D-05). Source and explanation lookups take their I/O as deps, as `009`'s steps do.         |
| `packages/ai/src/chat/answer.ts`                       | `answerQuestion(question, deps)`: the loop in Approach, with the limits, the held answer, grounding with one retry, and the fixed sentences. Writes to an AI SDK UI message stream.                                                                                                 |
| `packages/ai/src/chat/prompt.ts`                       | The system prompt: answer only from lookups, never continue a walk, lookups' content is data (C-01, C-03, C-04).                                                                                                                                                                    |
| `packages/ai/src/chat/limits.ts`                       | `MAX_LOOKUPS`, `MAX_STEPS`, the model's list limit and the questions kept: one source, browser-safe at `@workspace/ai/chat/limits` for the tab's words.                                                                                                                             |
| `packages/ai/src/source.ts`                            | `shortenSource` and `fenced`, moved out of `009`'s prompt, so an explanation and the source lookup hand the model the same text.                                                                                                                                                    |
| `apps/web/src/lib/chat.server.ts`                      | `handleChat(request, analysisId)`: the session, the request checked (a conversation, at most 64,000 characters), the stored result, the deps (source at the commit, the organization's cached explanations), and `answerQuestion`.                                                  |
| `apps/web/src/lib/source.server.ts`                    | `sourceAtCommit`, moved out of `explanations.server.ts`, so explanations and chat share one checked fetch.                                                                                                                                                                          |
| `apps/web/src/lib/stored-analysis.server.ts`           | `readStoredAnalysis`: an analysis and its stored result as the map's input. The page, explanations and chat each read it this way, so it's one function (the rule of three).                                                                                                        |
| `apps/web/src/lib/tracing.server.ts`                   | `serverTracing`: the tracer from the server's configuration, shared by explanations and chat.                                                                                                                                                                                       |
| `apps/web/src/routes/api/analyses.$analysisId.chat.ts` | The server route: `POST`, a thin shell returning `handleChat`'s response. Covered by the CSRF middleware (D-03).                                                                                                                                                                    |
| `apps/web/src/lib/csrf.ts`                             | `csrfChecks`: the CSRF middleware's filter, taking in the chat route's `POST` beside server functions; `start.ts` uses it, and a test runs TanStack's own check with it.                                                                                                            |
| `apps/web/src/components/detail/detail-pane.tsx`       | Two tabs at the top: Details (today's summary and selection) and Chat (FR-011).                                                                                                                                                                                                     |
| `apps/web/src/components/chat/`                        | The chat panel: the conversation, each lookup with its result (paths as links), the answer through `009`'s `Body`, the question box, and messages for a limit or a failure.                                                                                                         |
| `apps/web/src/components/map/chat.tsx`                 | The conversation's state for the page's life, beside the map's (FR-012), so switching tabs keeps it.                                                                                                                                                                                |

## Data

None. Conversations aren't stored (FR-012). Lookups read the stored result
and `009`'s `explanations` cache with the member's token.

## Decisions

- **D-01 Chat runs on `gemini-3.5-flash-lite`; explanations stay on
  `gemini-3.6-flash`.**
  - A question takes several model calls: one per round of lookups, then the
    answer. 3.6 Flash's free tier allows 20 requests a day (`009` D-02),
    about 5 questions.
  - 3.5 Flash-Lite is reported to allow 500 a day on the free tier, about
    80 questions at the worst. **Reported, to confirm** on the project's
    AI Studio rate-limit page; the owner's step below.
  - Considered: 3.6 Flash or 3.8 Flash (20 a day each: too few); Kimi on
    the LangSmith credits (ADR 0003: a second provider and key for one
    feature). Rejected for now. Changing it is `CHAT_MODEL` alone.
  - A Lite model picks tools less well. The prompt is short and the lookups
    few; `011` measures it, and 3.6 Flash is the fallback.
- **D-02 The AI SDK's chat UI over a server route.** `useChat` from
  `@ai-sdk/react` posts to `POST /api/analyses/$analysisId/chat`, which
  returns a UI message stream: the AI SDK's own TanStack Start guide.
  - Tool calls arrive as typed message parts with their state (input,
    output, error), which is FR-004's "each lookup, with what it returned".
  - Considered: a server function returning a stream. Rejected: it would
    rebuild `useChat`'s state and protocol by hand. TanStack AI is still a
    release candidate (ADR 0003).
- **D-03 The route is guarded as server functions are.**
  - The CSRF middleware's filter is widened to this route: a `POST` from
    another site is refused (`006` plan D-03).
  - Clerk's request middleware already runs for it; the organization comes
    from the session, the analysis is read with the member's token, so
    another organization's isn't found.
- **D-04 The answer is held until grounded.** The guide streams the answer
  word by word; this doesn't.
  - Lookups stream as they finish. The answer's text is collected, checked
    with `ungroundedPaths`, and written whole.
  - Why: FR-006 says an ungrounded answer isn't shown, and a streamed one
    already has been. C-02 is kept: the lookups are on screen first.
  - The one retry answers from the same lookups, with no lookups offered.
  - The loop is `generateText`, not `streamText`: each lookup's `execute`
    writes its own input and output to the UI stream as it runs, so the
    lookups still arrive one by one, and the model's words never stream.
- **D-05 What the model sees is shorter than what the member sees.** A
  lookup's full result goes to the browser. `toModelOutput` hands the model
  each list's first 50 paths and a count of the rest, so a walk of every
  level (`004`) fits the answer without changing it (AC-04).
- **D-06 Limits.**
  - Lookups are counted as they run. At `MAX_LOOKUPS` (12), `prepareStep`
    offers no more lookups and adds the limit to the instructions (FR-005).
  - `MAX_STEPS` (6) stops the loop whatever happens: five rounds of lookups
    and the answer.
  - The conversation sent with a question is trimmed to the last 4
    questions and answers, with older lookups' results dropped; the answers
    stay. It keeps each request inside the free tier's 250K tokens a minute.
  - A refusal for the request limit shows `009`'s message, at once, with
    the lookups already shown kept.
- **D-07 The explanation lookup reads the cache only.** It returns the
  organization's cached explanation of a file (`009`), or says there's none
  yet and points to the Explanation tab.
  - Considered: writing one. Rejected: it would spend 3.6 Flash's 20 a day
    from inside a chat, unasked.
  - The source lookup is `009`'s checked fetch at the analysed commit,
    shortened to `EXPLAIN_MAX_LINES` and fenced as data (C-03).
- **D-08 Every lookup is its own traced run** inside the question's, as well
  as the AI SDK's telemetry for each model call (FR-010), so AC-03 can be
  tested against a recording `traced` without LangSmith.
- **D-09 The pane's tabs, from the registry.** shadcn's `Tabs`, already
  installed, holds Details and Chat. Chat is built from AI Elements, now part
  of shadcn/ui, with its Base UI variant, each chosen for a need the spec
  names:
  - `trace`: one line per lookup, running, failed or done, with what it
    returned below it. `defaultOpen`, so it's never collapsed by default
    (C-02); its shimmer stops under reduced motion.
  - `message-scroller`: follows the live edge as lookups arrive, never
    pulls back a reader who has scrolled up, and announces each new row
    once (`role="log"`, held by `aria-busy` while a turn streams).
  - `message` and `bubble`: the question on one side, the reply on the
    other.
  - `input-group`: the question box (AI Elements' Prompt Input is only a
    recipe of it), with a label its docs' example lacks.
  - Considered and left out: Tool and Subagent (recipes over `trace`, not
    components); Code Block (no lookup shows code, and it brings a
    highlighter); Prompt Input's attachments and model menus (none here,
    one fixed model); Suggestion, Stack Trace, Terminal, Test Results,
    Reasoning, Sources and the rest (nothing the spec shows).
  - A lookup's result renders with the pane's own pieces (`FileList`,
    `FactList`, `WalkLevels`, `RoutesTable`, the insight `Sentence`),
    and the answer with `009`'s text (`ExplanationText`), so the same
    data looks the same in both tabs.
  - The Chat tab's code loads when the tab is first opened, behind a
    placeholder of the same size: the analysis page's first download fell
    from 91 kB to 61 kB gzipped, and the chat's 31 kB comes on demand.

## Thresholds

| Name                     | Value | Where           | Why                                                      |
| ------------------------ | ----- | --------------- | -------------------------------------------------------- |
| `MAX_LOOKUPS`            | 12    | `@workspace/ai` | The spec (FR-005).                                       |
| `MAX_STEPS`              | 6     | `@workspace/ai` | Five rounds of lookups and the answer (D-06).            |
| Paths per list, to model | 50    | `@workspace/ai` | A walk fits the answer; the rest are counted (D-05).     |
| Questions kept in a call | 4     | `@workspace/ai` | Keeps each request inside the free tier's tokens (D-06). |
| Retries when ungrounded  | 1     | `@workspace/ai` | The spec (FR-006).                                       |

## What needs doing outside the code

By the repository's owner:

- **AI Studio:** on aistudio.google.com/rate-limit, confirm the free tier's
  requests a day for `gemini-3.5-flash-lite` (D-01). No billing.
- Nothing else: chat uses the same `GEMINI_API_KEY` and `LANGSMITH_*`
  values as `009`.

## Testing

- **Vitest, `@workspace/graph`:** each lookup returns its data from the
  analysis (AC-07); a blast radius from the lookup equals the detail pane's
  walk for the same file (AC-04).
- **Vitest, `@workspace/ai`, with the AI SDK's mock model:**
  - AC-02: answers naming absent files are retried once, then replaced;
  - AC-03: every lookup the answer relied on is a traced run;
  - AC-05: the 13th lookup isn't offered, and the answer says it stopped;
  - AC-08: with no lookup made, no answer is given;
  - a refusal for the request limit, and lookups' output shortened for the
    model only.
- **Vitest, the web app:** the route refuses another site's `POST`; the
  organization comes from the session; another organization's analysis
  isn't found.
- **Browser, locally with the real key:** AC-01, AC-06 and AC-09.

## Risks

- **One free quota for everyone.** Every member of every organization
  shares the key's 500 a day. A per-member limit belongs with `012`'s
  production readiness; until then the limit message says so.
- **A Lite model's tool use.** It may pick a poor lookup, or none. The
  grounding check and FR-007 stop a bad answer showing; `011` scores how
  often it happens.
- **Prompt injection through a file's source.** The source lookup's text is
  fenced as data, and the prompt says so (C-03); the answer is still
  grounded, so an injected path can't reach the page.
- **Traces lost when the function ends.** The stream's end flushes them, as
  `009` D-03 does.
