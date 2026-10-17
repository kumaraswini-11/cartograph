# 0003 — The AI model and its tracing

**Status:** Accepted
**Date:** 2026-10-18

## Context

Spec `009` is the first to call a model. A model writes explanations of
files and folders from their real neighbours, and later answers questions
(`010`) and is evaluated (`011`). Spec `000` FR-006 asks for:

- model calls pinned to an exact version;
- a tracing service that records every call.

The project is personal, so the owner asked for **$0 in total**: no card on
any service, and no bill possible.

Three questions had to be settled:

1. **The model**: which one writes the explanations.
2. **Tracing**: which service records each call, so a cache hit can be told
   apart from a model call (`009` FR-011).
3. **The library**: what the code calls the model through.

Two more things came up and were ruled out for now: **web search** (Tavily)
and **background jobs** (Inngest and similar).

## The names, explained

Many products in this space sound alike. Most "Lang" names come from one
company, LangChain, but one of them, Langfuse, doesn't. The "Lang" is a
coincidence there.

| Name                                          | Who makes it                                                                                                     | What it is, in one line                                                                                                                     | Does Cartograph use it?                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **LangChain** (the company)                   | LangChain Inc.                                                                                                   | The company behind everything in this table except Langfuse.                                                                                | —                                                                                          |
| **LangChain** (the library)                   | LangChain Inc., open source                                                                                      | A toolkit for calling models and building agents in Python or JavaScript (`createAgent`, tools, middleware).                                | **No.** The AI SDK does this job (below).                                                  |
| **LangGraph**                                 | LangChain Inc., open source                                                                                      | A lower-level framework for agents as graphs of steps, with loops, saved state and pauses for human approval.                               | **No.** Nothing here is a long, branching agent.                                           |
| **Deep Agents**                               | LangChain Inc., open source                                                                                      | A ready-made agent built on LangGraph: it plans, uses subagents and keeps notes in virtual files.                                           | **No.** It was used only in a separate test agent, outside this repository, on 2026-10-17. |
| **LangSmith**                                 | LangChain Inc., hosted, with a free plan                                                                         | A service that **records** every model call (tracing), and **measures** answers (evaluation). It works with any code, not only LangChain's. | **Yes: tracing in `009`, evaluation planned for `011`.**                                   |
| **LangSmith Gateway**                         | LangChain Inc.                                                                                                   | A part of LangSmith that calls models for you, paid with LangSmith credits. Its credits cover only Moonshot's Kimi models.                  | **No.** Kept as a fallback for the owner's $50 credits.                                    |
| **LangSmith Deployment, Managed Deep Agents** | LangChain Inc.                                                                                                   | Hosting for agents on LangChain's servers (a paid plan).                                                                                    | **No.** Cartograph runs on Vercel (ADR 0002).                                              |
| **Langfuse**                                  | **Not LangChain.** A separate company, founded 2023 and part of ClickHouse since January 2026; open source (MIT) | LangSmith's competitor: tracing, evaluation and prompt management, which you can also run yourself.                                         | **No**, but it was the closest alternative to LangSmith (below).                           |

**Deep Agents, in more detail.**

- **What it is:** LangChain's ready-made **agent harness**, open source, for
  Python and JavaScript, built on LangGraph. An "agent" here is a model that
  works in a loop, choosing tools until a task is done.
- **What it adds to that loop:**
  - a to-do list it plans with;
  - a virtual file system, where it keeps large results instead of holding
    them all in its context;
  - **subagents**, which take on parts of a task;
  - long-running tasks, such as researching a question across many
    searches and writing a report.
- **How you use it:** `createDeepAgent({ model, tools, systemPrompt })`.
- **Where it was used:** the Deep Agents quickstart, built and run on
  2026-10-17 as a separate test, outside this repository, at the owner's
  request. It's a research agent that searches the web (Tavily) and writes
  a report on Gemini's free tier. Its folder has its own `DECISIONS.md`.
- **Why Cartograph doesn't use it:** Cartograph's model must never go
  looking for things on its own. It's handed the facts the parser found
  (`009` C-01). An agent that plans, searches and delegates is the opposite.
  `010`'s chat looks facts up with a few fixed tools; the AI SDK's tool
  calling covers that.

So the only "Lang" product Cartograph uses is **LangSmith**, and only as a
recorder and a measurer. The code that calls the model is the AI SDK, which
isn't a LangChain product.

## Decision

| Question | Choice                                                         | Cost |
| -------- | -------------------------------------------------------------- | ---- |
| Model    | **Gemini `gemini-3.6-flash`**, on Google AI Studio's free tier | $0   |
| Tracing  | **LangSmith**, on its free Developer plan, APAC region         | $0   |
| Library  | **The AI SDK** (`ai` 7, `@ai-sdk/google`)                      | Free |
| Search   | **None.** Cartograph never searches the web                    | —    |

Only one package, `@workspace/ai`, names the model or the tracing service
(`009` C-04). Changing either takes a setting and a key there; nothing else
changes.

## Alternatives considered

Checked against each provider's own documentation on 2026-10-17 and
2026-10-18.

### The model

| Option                                                               | Cost                                                                                          | What it needs                                                                            | Why not, or why                                                                                                                                                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Gemini 3.6 Flash, free tier** (chosen)                             | **$0.** Google AI Studio's free tier makes no charge for these tokens                         | A key from Google AI Studio (`GEMINI_API_KEY`), with no billing set up                   | Free, and a stable model name (below). Its limits are acceptable here (see Consequences).                                                                                                        |
| OpenAI (for example `gpt-5.5`)                                       | Paid per token, prepaid with a card                                                           | An OpenAI key and billing                                                                | The owner's first choice, replaced by the $0 goal. It's the most direct switch if quality ever needs it.                                                                                         |
| Anthropic Claude (for example Sonnet or Haiku)                       | Paid per token                                                                                | An Anthropic key and billing                                                             | Not free.                                                                                                                                                                                        |
| Kimi (`moonshotai/kimi-k2.6`, `kimi-k3`) through LangSmith's Gateway | Paid from Gateway credits. The owner has a $50 LangChain credit grant, valid to November 2027 | A workspace-scoped LangSmith key with `gateway:invoke`; a "paid plan" in the docs' words | The only models the Gateway credits cover; OpenAI and others aren't included. LangSmith doesn't document whether the credits can be spent without a card. A good fallback while the grant lasts. |
| Ollama, run locally                                                  | $0, offline                                                                                   | Install Ollama and a tool-capable model (several GB)                                     | Runs on one machine, not on Vercel, and slowly without a GPU. Doesn't fit a deployed app.                                                                                                        |
| OpenRouter's free models                                             | $0, rate-limited                                                                              | An OpenRouter key                                                                        | Free models come and go, so an exact pinned version can disappear.                                                                                                                               |

**Why `gemini-3.6-flash` and not an alias:** Google's model page says a
stable name "points to a specific stable model" and usually doesn't change.
`gemini-flash-latest`, which AI Studio's own code sample uses, "will get
hot-swapped with every new release". FR-012 forbids that, so `009` AC-10
tests it.

### Tracing

**What tracing is for here.** Each time an explanation is asked for,
tracing records a "run": what went in, what came out, how long it took, and
whether the model was called at all. That's how a working cache is told from
a broken one. A cache hit shows as a run with no model call (`009` FR-011,
AC-03). Without it, a cache that never hits would look the same as one that
works, apart from the bill.

| Option                                                                    | Cost                                                        | Why not, or why                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LangSmith, Developer plan** (chosen)                                    | **$0**: 5,000 traces a month, 1 seat, traces kept 14 days   | See the reasons below.                                                                                                                                                                                                                                                                                                        |
| Langfuse                                                                  | Free cloud tier, or free to run yourself (open source, MIT) | Just as capable: it traces the AI SDK too, and has evaluation and prompt management. Running it yourself means a server and a database to keep, and its free cloud tier is one more account. Nothing it adds is needed here, and ADR 0001 had already planned LangSmith. **The alternative if LangSmith ever stops suiting.** |
| Other tracing services (Braintrust, Arize Phoenix, Helicone and the like) | Free tiers of various sizes                                 | Not compared in depth: none has an advantage here that would outweigh the reasons below.                                                                                                                                                                                                                                      |
| No tracing                                                                | $0                                                          | `009` FR-013 allows it to be off. FR-011 and AC-03 need it on, to show a cache hit as a run with no model call.                                                                                                                                                                                                               |

**Why LangSmith:**

- **It can't charge.** "Personal organizations are limited to 5,000 traces
  per month until a credit card is added" (LangSmith: billing). No card,
  and the worst case is that recording pauses until the month turns. The
  app keeps working (FR-013).
- **It's already set up.** The owner has an account (APAC region), with a
  $50 credit grant kept as a fallback for the model.
- **It traces the AI SDK officially**, documented for version 7.
- **Spec `011` (evaluation) can use the same place.** The traces this
  records become the examples `011` measures.
- **It was the plan.** ADR 0001 named LangSmith for tracing, and nothing found
  here argues against it.

**The key LangSmith needs:** a **"Tracing Only"** key, its own key type.

- **Where:** Settings → API Keys → "+ API Key", which opens "Create an API
  Key":

  | Field       | Choose                                                                                                                                                                                                       |
  | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | Description | `cartograph`                                                                                                                                                                                                 |
  | Key Type    | **Tracing Only**, the third card: "Org-owned, write-only keys for agents". Not "Personal Access Token" (it acts as you, with all your rights), and not "Service Key" (read and write access for automation). |
  | Workspaces  | The personal account's one workspace (Workspace 1)                                                                                                                                                           |
  | Expiration  | 1 year. Not "Never": a key that leaks should stop working on its own.                                                                                                                                        |

- It can only send traces (`runs:create`, `projects:create`), so a leaked
  key can't read or change anything else.
- LangSmith shows it **once**: copy it into a password manager, then
  `.env.local` (or Vercel).
- **One key, `cartograph`, serves local and Vercel** (the owner's decision,
  2026-10-18). Revoking it means pasting a new one into both.
- The account is in the **APAC** region, so the app also sets
  `LANGSMITH_ENDPOINT=https://apac.api.smith.langchain.com`. Without it,
  traces go to the US region and never reach the account.

### The library

**What a library like this does.** Calling a model means sending a request
to its provider's API. Each provider's API is a little different. A library
gives one way to call any of them, and adds what every app needs on top:

- structured answers that must fit a schema;
- tools the model can ask to use;
- streaming the answer into the page as it's written;
- telemetry, so a tracing service can record each call.

**The AI SDK** is an open-source TypeScript library (Apache 2.0) made by
Vercel. It runs on any host, not only Vercel. Version 7 has been stable since
June 2026. It's the most used library of its kind (Vercel reports over 16
million downloads a week at version 7's launch).

| Option                                                        | What it is                                                                                                      | Why not, or why                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The AI SDK** (chosen)                                       | Vercel's open-source TypeScript library for calling models, stable (7.x)                                        | Provider-neutral, with about 38 provider packages. It has structured output (`Output.object()`, for `009` D-06), tool calling for `010`'s lookups, and streaming into React. **LangSmith traces it officially** (on version 7, `registerTelemetry(LangSmithTelemetry())`), which no alternative below can say.                                                                                                                                  |
| **TanStack AI**                                               | The same idea, from TanStack, the team behind TanStack Start, which Cartograph already uses. Open source (MIT). | **The closest alternative, and the one to revisit.** It names TanStack Start as its recommended framework, and has structured output and 24 providers. But it's a **release candidate** (v0 RC, 21 August 2026; v1 "very close", with no date), maintained by three people in their spare time. Its tracing is OpenTelemetry middleware, with no documented LangSmith integration. **Revisit when it reaches a stable v1**, for `010` or later. |
| LangChain (JS)                                                | LangChain's library for models and agents                                                                       | It does the same calls, wrapped in an agent framework Cartograph doesn't need.                                                                                                                                                                                                                                                                                                                                                                  |
| LangGraph, Deep Agents                                        | Agent frameworks (see "The names, explained")                                                                   | `009` is one grounded call, and `010`'s lookups are a handful of tools. They'd add weight and a second way of doing things. Their skills were moved out of this repository to a separate test agent on 2026-10-18.                                                                                                                                                                                                                              |
| Mastra                                                        | An open-source TypeScript **agent** framework, itself built on the AI SDK                                       | One layer more than Cartograph needs. If agents ever are needed, it sits on the same library.                                                                                                                                                                                                                                                                                                                                                   |
| A provider's own SDK (`@google/genai`, OpenAI's, Anthropic's) | Each vendor's own client                                                                                        | Ties every call to one vendor, so switching would mean rewriting the calls rather than changing a setting. AI Studio's sample (`@google/genai`) is this.                                                                                                                                                                                                                                                                                        |

### Evals ("Vercel evals")

- **What "evals" are:** a general practice, not one product. Vercel's guide,
  "An introduction to evals" (November 2025), defines them as "systematic
  tests that measure how well AI models perform at specific tasks". They're
  like ordinary tests, but built for answers that vary from run to run.
- **Every eval has three parts**, in the guide's words:
  - a **dataset** of test cases;
  - a **runner** that executes them;
  - a **scorer** that grades the results.
- **Ways to score:**
  - exact matching, for structured output;
  - semantic similarity, the same meaning in other words;
  - **LLM-as-judge**, a second model grading the answer;
  - custom metrics.
- **The tools the guide uses:**
  - **the AI SDK** for the runner, so the model can be swapped. That's the
    library already chosen above;
  - **Vercel AI Gateway**, Vercel's paid service that calls many providers'
    models with one key, the way LangSmith's Gateway does. It isn't needed
    here: Cartograph calls Gemini directly, on its free key;
  - **Braintrust**, a hosted evaluation and monitoring service.
- **There is no Vercel product called "Evals".** The guide is a tutorial.
- **How it maps to Cartograph:**
  - Spec `009` already has the deterministic kind, as ordinary tests:
    - no stray marks in the rendered text (AC-02);
    - no explanation naming an absent file (AC-05);
    - never a surface role (AC-07).
  - Spec `011` is the "is the answer good?" kind. Its fixed inputs are what
    `CONTEXT.md` calls **cases**, which are the guide's dataset. Its scores
    are the scorer.
  - LangSmith includes datasets, runners and scorers, which is why ADR 0001
    planned it for `011`. Braintrust is the other candidate the guide
    names. `011` compares them, with sources, when it starts, and records
    its choice as an ADR.

### Web search (Tavily), ruled out

- **What it is:** a web search API. Its free plan gives 1,000 credits a
  month, with no card.
- **Where it came up:** in the Deep Agents quickstart that was built and run
  as a separate test (outside this repository). There, the agent researches
  the web, and Gemini's own search isn't on the free tier, so Tavily was its
  free search.
- **Why Cartograph doesn't use it:** its model never searches. It's handed
  the file and its real neighbours, from the parser. It must never go
  looking for connections itself (`009` C-01; `docs/project-doc.md`: "the
  AI may explain and label. It may never decide that two files are
  connected"). A search tool would invite exactly that. So
  `TAVILY_API_KEY` isn't in `.env.example`.
- **Tavily's "agent setup" prompt** ("read and execute
  tavily.com/agent-setup/SKILL.md") was read and not run. It pipes a script
  from the internet into `bash`, installs skills globally, and scans git
  history across the user's folders. None of that was needed.

### Background jobs (Inngest and similar), not needed now

- **What Inngest is:** a service for **durable** background work. Code is
  split into steps; if a step fails or the server stops, it retries or
  resumes from the last finished step. It also has queues, schedules, and
  **throttling**: "no more than N calls a minute", which is why it's often
  mentioned with AI, where model calls are slow, costly and rate-limited.
  Its free Hobby plan is reported at 50,000 executions a month, no card
  (third-party listings; check inngest.com/pricing before relying on it).
- **Similar services:** Trigger.dev; Upstash QStash; Vercel's own Workflow.
- **Why Cartograph doesn't need one now:**
  - An explanation is **one short request**, answered while the member
    waits, not a long job.
  - A repository's run (`008`) already continues after the response within
    the host's own limit (`waitUntil`, 300 s, `008` D-04). A run cut off is
    shown as stale and can be re-run (`008` C-05). `000` C-01 asks for one
    application with no separate worker.
  - A service like this is another account, more keys, and another thing to
    keep running, for problems Cartograph doesn't have yet.
- **When to revisit**, any of:
  - a run regularly needs longer than `MAX_RUN_SECONDS` (300 s);
  - stale runs become common, so they need retrying rather than re-running
    by hand;
  - Gemini's free limits (5 a minute, 20 a day) turn many requests away.
    Then a
    throttled queue would hold explanations until there's room, instead of
    asking the member to try again.

  The decision then is recorded as a new ADR.

## Consequences

- **Gemini's free tier on `gemini-3.6-flash` allows 5 requests a minute
  and 20 a day**, for the whole project, so for everyone using Cartograph.
  - The minute limit was measured 2026-10-17. The day limit is from Google's
    own error on 2026-10-18 (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`,
    20), after the separate Deep Agents test had used up the day.
  - Daily quotas reset at midnight Pacific time, and each model has its own.
  - Google's docs don't publish the free numbers; each account's are at
    aistudio.google.com/rate-limit.
  - Explanations are cached per organization and asked for only on request,
    so each is paid for once.
  - At the limit, the tab says to try again shortly, and nothing is cached.
- **Google may use free-tier prompts and answers to improve its products**
  (Gemini API pricing: "Used to improve our products: Yes" on the free
  tier). Cartograph sends only public repositories' code (`008` C-06), so
  nothing private is exposed.
- **Never set up billing on the Gemini key's project, and never add a card
  to LangSmith.** Either would end the $0 guarantee.
- **Keys:**
  - `GEMINI_API_KEY` is required at start-up;
  - `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_ENDPOINT` and
    `LANGSMITH_PROJECT` are optional;
  - where to find each is in `apps/web/.env.example`, and
    `src/lib/env.server.ts` checks them;
  - one LangSmith project per environment (`cartograph-development`,
    `cartograph-preview`, `cartograph-production`) keeps local runs out of
    production's traces.
- **To change the model:** set `MODEL` and the provider in
  `packages/ai/src/model.ts`, install that provider's AI SDK package
  (`@ai-sdk/openai`, `@ai-sdk/anthropic` …), and add its key to
  `.env.example` and `env.server.ts`. Raise `PROMPT_VERSION`, so cached
  explanations from the old model aren't reused (FR-010).
- **To use the Kimi credits instead:** point the AI SDK's OpenAI-compatible
  provider at LangSmith's Gateway (`https://gateway.smith.langchain.com/v1`,
  or the region's), with a LangSmith key that has `gateway:invoke`. Confirm
  first whether the credits need a card.

## Sources

- Gemini models and version names: <https://ai.google.dev/gemini-api/docs/models>
- Gemini pricing, free tier: <https://ai.google.dev/gemini-api/docs/pricing>
- Gemini rate limits: <https://ai.google.dev/gemini-api/docs/rate-limits>
- LangSmith billing (the 5,000-trace cap without a card): <https://docs.langchain.com/langsmith/billing>
- LangSmith API keys and regions: <https://docs.langchain.com/langsmith/create-account-api-key>
- LangSmith with the AI SDK (v5 to v7): <https://docs.langchain.com/langsmith/trace-with-vercel-ai-sdk>
- LangSmith Gateway credits (Kimi only): <https://docs.langchain.com/langsmith/llm-gateway-credits>
- LangSmith pricing: <https://www.langchain.com/pricing>
- Tavily pricing: <https://www.tavily.com/pricing>
- Deep Agents quickstart: <https://docs.langchain.com/oss/javascript/deepagents/quickstart>
- TanStack AI enters release candidate (21 August 2026): <https://tanstack.com/blog/tanstack-ai-rc>
- The AI SDK compared with TanStack AI (Vercel's own guide, so it may favour the AI SDK): <https://vercel.com/kb/guide/vercel-ai-sdk-vs-tanstack-ai>
- Langfuse, part of ClickHouse since January 2026: <https://www.langfuse.com/press>
- Inngest, durable execution (check the pricing page itself; the free-tier figures above are from third-party listings): <https://www.inngest.com/pricing>
- Vercel, "An introduction to evals" (published 2025-11-03): <https://vercel.com/kb/guide/an-introduction-to-evals>
- Deep Agents overview: <https://docs.langchain.com/oss/javascript/deepagents/overview>
