# 009 — File explanations: plan

**Spec:** [spec.md](spec.md)
**Status:** Approved

## Approach

A member asks for an explanation in the detail pane's Explanation tab.

1. A server function checks that the analysis is the member's organization's,
   reading with their token as every read does.
2. It reads the stored result for the file's content hash and its real
   neighbours (`001`): the paths of its dependencies and dependents.
3. Everything after that runs inside one traced function, so a cache hit is
   recorded as a run with no model call (FR-011):
   - It looks in the organization's cache.
   - On a miss, it fetches the file's source from GitHub at the analysed
     commit, checks it against the stored hash, and asks the model.
   - The model is given the source and the neighbours' paths. It is never
     asked to find connections (C-01).
   - The answer comes back as structured output: the paragraph, plus an
     inferred role for a file no adapter identified (FR-009), from a fixed
     list the schema itself allows.
   - Every file path in the paragraph is checked against the analysis. An
     ungrounded answer is discarded and asked for once more; a second one
     shows a message and nothing is cached (FR-005, FR-006).
   - A grounded answer is cached for the organization and returned.

In the browser:

- The tab renders only code, bullets and bold (FR-007), and every path
  becomes a button that moves the map's selection (FR-008).
- The session keeps what's been explained, so returning to a file shows it
  again at once (FR-004).
- In parallel, the repository's default branch is compared with the analysed
  commit, and a stale explanation says so and offers a re-run (FR-014,
  FR-015).

Both services cost nothing:

- **The model:** Gemini, on Google AI Studio's free tier.
- **Tracing:** LangSmith, on its free Developer plan.

The code names neither outside one package, so either can be replaced by a
setting and a key.

## Modules and interfaces

| Module                                           | What it does                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ai/` (`@workspace/ai`)                 | The one place that builds the model client and turns tracing on (C-04). Server-only, except `./text`.                                                                                                                                                                                    |
| `packages/ai/src/model.ts`                       | `MODEL`: the exact pinned version, `gemini-3.6-flash` (FR-012). `languageModel(env)`: the provider-neutral AI SDK model, built here only.                                                                                                                                                |
| `packages/ai/src/tracing.ts`                     | `tracing(env)`: when `LANGSMITH_TRACING` is `true`, LangSmith's telemetry is registered once and `traced(name, fn)` records runs; when it isn't, `traced` is the function itself, and `enabled` is false (FR-013). `flush()` waits for traces to send before a serverless response ends. |
| `packages/ai/src/explain.ts`                     | `explainFile(input, deps)` and `explainBox(input, deps)`: prompt (versioned), structured output, the grounding check with one retry, inside `traced`. The cache read and write are passed in, so the package knows nothing of storage.                                                   |
| `packages/ai/src/grounding.ts`                   | `ungroundedPaths(text, analysisPaths)`: every path the paragraph names that isn't in the analysis (FR-005).                                                                                                                                                                              |
| `packages/ai/src/text.ts` (`@workspace/ai/text`) | `parseExplanation(text)`: the paragraph as blocks (paragraphs, bullet lists) of runs (plain, bold, code). Anything else is plain text, so no stray marks are shown (FR-007, C-03). Pure, so the browser renders with it.                                                                 |
| `packages/ai/src/roles.ts`                       | `INFERRED_ROLES`: service, data access, model, utility, configuration, component, hook (FR-009). Never a surface role (C-02).                                                                                                                                                            |
| `packages/github/src/file.ts`                    | `fileAtCommit(repository, commit, path)`: one file's bytes from GitHub at a commit, capped at the parser's `MAX_FILE_BYTES`.                                                                                                                                                             |
| `packages/database/supabase/migrations/`         | `explanations`: the organization's cache, with members reading through 007's policy and the server writing with the secret key.                                                                                                                                                          |
| `packages/database/src/explanations.ts`          | `readExplanation(storage, key)` with the member's token; `explanationWriter(access).store(…)` with the secret key, taking the organization from the session (008 D-06).                                                                                                                  |
| `apps/web/src/lib/explanations.server.ts`        | `explainSelection(analysisId, subject)`: the steps in Approach, wiring storage, GitHub and `@workspace/ai`.                                                                                                                                                                              |
| `apps/web/src/lib/explanations.functions.ts`     | `explain` (POST) and `staleness` (GET): server functions, the organization from the session.                                                                                                                                                                                             |
| `apps/web/src/components/detail/explanation.tsx` | The tab: Explain button, pending state, the rendered paragraph with path links, the inferred role, a stale notice with Re-run, "tracing is off", and messages for errors and limits.                                                                                                     |
| `apps/web/src/components/map/explanations.tsx`   | The session's explanations by subject, held beside the map's state (FR-004).                                                                                                                                                                                                             |

## Data

```sql
-- The organization's explanations (FR-010): one per cache key.
explanations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations on delete cascade,
  analysis_id uuid not null,              -- the analysis it was first written for
  cache_key text not null,                -- sha256, below
  subject text not null,                  -- the file's or folder's path
  kind text not null check (kind in ('file', 'box')),
  body text not null,                     -- the paragraph, as the model wrote it
  inferred_role text check (inferred_role in ('service', 'data access', 'model',
    'utility', 'configuration', 'component', 'hook')),
  model text not null,                    -- the exact version (FR-012)
  prompt_version integer not null,
  created_at timestamptz not null default now(),
  unique (organization_id, cache_key),
  foreign key (organization_id, analysis_id)
    references analyses (organization_id, id) on delete cascade
)
```

- **The cache key** is a SHA-256 of `kind`, the subject's content, its
  neighbours, `MODEL` and `PROMPT_VERSION` (FR-010):
  - for a file, its content is its stored hash, and its neighbours are the
    sorted paths of its dependencies and dependents;
  - for a box, both are the sorted paths and hashes of its files and the
    edges into it.

  A re-run that changes nothing hits the cache. A changed file, a changed
  import, a new model or a new prompt misses it.

- **Grants and policies:**
  - `authenticated` gets `select`, with 007's policy;
  - `service_role` gets `select, insert`;
  - `insert … on conflict (organization_id, cache_key) do nothing`, so two
    tabs racing write one row.

## Decisions

The model, the tracing service and the library, with every option weighed
(OpenAI, Anthropic, Kimi on LangSmith's credits, Ollama, OpenRouter,
Langfuse, LangChain) and why Tavily isn't used, are recorded in
[ADR 0003](../../adr/0003-ai-model-and-tracing.md). D-01 to D-03 below are
the short form.

- **D-01 The AI SDK (`ai` 7, `@ai-sdk/google`), not LangChain.**
  - _Why:_ 009 is one grounded call per explanation, 010 a chat with lookups
    streamed to the page, 011 an evaluation of functions. The AI SDK is
    provider-neutral, has structured output and tool calling, and streams to
    React. LangSmith traces it officially.
  - _Rejected:_
    - LangChain or Deep Agents: agent frameworks Cartograph doesn't need.
      Their skills were moved to the separate test agent.
    - The provider's own SDK: it would tie the code to one vendor.
- **D-02 Gemini `gemini-3.6-flash` on the free tier.**
  - _Why:_ $0, the owner's decision on 2026-10-18.
  - `gemini-3.6-flash` is a stable name for one model (Google: stable models
    "point to a specific stable model"). `gemini-flash-latest` is an alias
    "hot-swapped with every new release", which FR-012 forbids.
  - The free tier allows 5 requests a minute and **20 a day** per model,
    for the whole project (ADR 0003). Explanations are cached per
    organization, so each is paid for once. At either limit, the tab says to
    try again later, without retrying: a daily limit won't lift in seconds,
    and every retry is another refused request.
  - Google may use free-tier data, but Cartograph sends only public
    repositories' code (`008` C-06).
  - _Changing it:_ `MODEL` and the provider in `model.ts`, and a key.
- **D-03 LangSmith tracing, on the free Developer plan.**
  - Per the docs for AI SDK 7:
    - `registerTelemetry(LangSmithTelemetry({ client }))` once;
    - `traceable` around the function that reads the cache;
    - `client.awaitPendingTraceBatches()` before the server function
      returns, since Vercel can end the function as soon as it responds.
  - The account is in APAC (`LANGSMITH_ENDPOINT`), with one project per
    environment (`LANGSMITH_PROJECT`).
  - $0 is guaranteed: a personal organization is capped at 5,000 traces a
    month until a card is added (LangSmith: billing).
- **D-04 The source comes from GitHub at the analysed commit**:
  `raw.githubusercontent.com/<repository>/<commit>/<path>`, no token.
  - It's checked against the parser's stored SHA-256 of the same bytes. A
    mismatch sends nothing to the model (the spec's edge case).
  - Only the first `EXPLAIN_MAX_LINES` (500) lines are sent, and the prompt
    says the file was shortened.
- **D-05 Repository content is data (C-05).**
  - The source goes in a delimited block, with the instructions outside it
    saying it's data to describe, never instructions to follow.
  - The model gets no tools.
  - Its answer must fit a schema. A paragraph or role outside that is
    refused before anyone sees it.
  - The grounding check stops it naming files that aren't there, whatever
    the file says.
- **D-06 Structured output.** `generateText` with
  `Output.object({ body: string, inferredRole: enum | null })`:
  - The schema's enum is `INFERRED_ROLES`, so a surface role can't come back
    (C-02, AC-07).
  - A role is asked for only when the file's detected role is
    "unidentified".
- **D-07 Grounding, and paths as links.**
  - The prompt asks the model to write every file path in inline code,
    exactly as given.
  - `ungroundedPaths` checks every inline code span that looks like a path,
    meaning it has a `/` or a source extension, against the analysis's files
    and folders. Any absent one fails the answer (FR-005).
  - The renderer makes each code span that names a file in the analysis a
    button that selects it (FR-008).
- **D-08 Formatting is parsed, not rendered as HTML.**
  - `parseExplanation` keeps paragraphs, `-` bullets, `**bold**` and
    `` `code` ``. Anything else (headings, links, HTML) becomes plain text
    with its marks removed.
  - The tab renders the blocks as React elements, with no
    `dangerouslySetInnerHTML` and no Markdown library.
  - AC-02's test checks that no `` ` ``, `*` or `#` survives rendering.
- **D-09 Writes with the secret key, as in `008` D-06.**
  - The member asks; the server writes, taking the organization from the
    verified session.
  - Members only read the cache, through 007's policy.
- **D-10 Staleness is measured on the server, apart from the explanation.**
  - `staleness(analysisId, path)` compares the default branch's commit (git
    HTTP, `008` D-02) with the analysed commit. When they differ, it compares
    the file at the new commit with the stored hash, to say whether the file
    itself changed or only the repository moved (FR-014, FR-015).
  - The tab shows the explanation at once and adds the notice when the
    answer arrives. The explanation is never held back for it.
- **D-11 Session memory in the browser (FR-004).**
  - A provider beside the map's state keeps each explanation by subject for
    the page's life.
  - When the selection returns to an explained subject, the tab shows it
    without a request.
  - The server's cache makes a fresh visit cheap too, but only on request
    (the tab's button), so nothing is spent unasked.

## Thresholds

| Name                    | Value | Where           | Why                                                               |
| ----------------------- | ----- | --------------- | ----------------------------------------------------------------- |
| `EXPLAIN_MAX_LINES`     | 500   | `@workspace/ai` | The spec: the same as `OVERSIZED_LINES`.                          |
| `PROMPT_VERSION`        | 1     | `@workspace/ai` | Raised with every prompt change, which misses the cache (FR-010). |
| Retries when ungrounded | 1     | `@workspace/ai` | The spec (FR-006).                                                |

## What needs doing outside the code

By the repository's owner:

- **LangSmith:**
  - Settings → Plans and Pricing should say Developer. Add no card.
  - Settings → API Keys → "+ API Key", Key Type **Tracing Only** (the third
    card), named `cartograph`, expiring in a year: one key for local and
    Vercel. ADR 0003 has the screen's every field.
- **`apps/web/.env.local`:**
  - `GEMINI_API_KEY` (already there);
  - `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY`,
    `LANGSMITH_ENDPOINT=https://apac.api.smith.langchain.com`,
    `LANGSMITH_PROJECT=cartograph-development`;
  - the two `VITE_SUPABASE_*` renames from `008`, pointing at the local
    stack.
- **Vercel**, before this branch's previews or merge:
  - `GEMINI_API_KEY` (Preview and Production, Sensitive). The server won't
    start without it;
  - the four `LANGSMITH_*` values, with `LANGSMITH_PROJECT` set to
    `cartograph-preview` for Preview and `cartograph-production` for
    Production.

## Testing

- **Vitest, `@workspace/ai`:**
  - AC-10: `MODEL` is an exact version. No `latest` and no alias, checked
    against the provider's naming.
  - AC-07: the output schema refuses a surface role.
  - AC-05: an answer naming an absent file is retried once, then refused,
    and nothing is cached.
  - AC-02: rendered blocks contain no stray marks.
  - With tracing off, `traced` calls the function and reports it disabled
    (FR-013).
  - The model is stubbed: the AI SDK's test model.
- **Vitest, `@workspace/github`:** `fileAtCommit`'s address, its cap, and a
  missing file.
- **pgTAP:**
  - `explanations` under 007's every-table tests;
  - a member reads only their organization's;
  - a duplicate key writes one row.
- **Vitest, the web app:**
  - the hash check refuses a mismatched source before any model call;
  - the organization comes from the session.
- **Browser, locally with the real key:** AC-01, AC-03 (the LangSmith project
  shows two runs, the second with no model call), AC-04, AC-06 (a repository
  whose default branch has moved on), AC-08 (tracing off) and AC-09.

## Risks

- **The free tier's 5 requests a minute and 20 a day.** That's about 20 new
  explanations a day across everyone, fewer with retries. The cache, and
  explaining only on request, keep calls rare. If it isn't enough, the
  options are recorded in ADR 0003: another Gemini model with its own
  quota, or Kimi on the LangSmith credits.
- **raw.githubusercontent.com throttles.** It's GitHub's file host, with its
  own generous limits. A refusal shows a message, as fetching does in `008`.
- **Traces lost when a function ends.** Each server function flushes before
  it returns (D-03).
- **A model that ignores the path convention.** It may name a file in plain
  text, not code. The grounding check also scans plain text for anything
  shaped like a repository path, and the prompt states the rule.
