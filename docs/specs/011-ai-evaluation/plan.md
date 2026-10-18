# 011 — AI evaluation: plan

**Spec:** [spec.md](spec.md)
**Status:** Approved

## Approach

One command, `pnpm eval`, from the repository root:

1. It unpacks the three pinned repositories from archives kept beside the
   cases (C-02, the spec's edge case), and analyses each as a run would:
   `001`'s parser, `002`'s detection, the map's input.
2. It runs every case through the code that ships, never a copy of it
   (C-03):
   - an explanation case through `009`'s `explainFile` or `explainBox`,
     with the cache left out, so the model is measured, not the cache;
   - a question case through `010`'s `answerQuestion`, reading its stream:
     the lookups it showed, and the answer it gave.
3. It scores each output by arithmetic (C-01): groundedness, fact coverage
   and, for questions, lookup use.
4. It prints each score per kind and overall, with the model and prompt
   versions (FR-006), stores the run as a file in the repository (FR-008),
   compares it with the last accepted run, and fails if groundedness is
   below 100% or an overall score fell by more than 2 points (FR-009).

The cases and their facts are generated, not written by hand (FR-002): a
second command picks each case's subject by rule and records the facts the
analysis's edges give it. A test recomputes every fact from the pinned
analysis and fails on any difference (AC-06).

Nothing new costs anything: the same free model tiers, and the same
LangSmith plan, in a project of its own.

## Modules and interfaces

| Module                                 | What it does                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/evals/` (`@workspace/evals`) | The evaluation, dev-only, as `@workspace/golden` is: nothing the app runs imports it.                                                                           |
| `packages/evals/archives/`             | The three pinned repositories, as GitHub's own archives (`.tar.gz`, about 575 kB together), so a case runs even if its repository goes (D-03).                  |
| `packages/evals/cases.json`            | Every case: its kind (file, box or question), repository and commit, subject or question, and its facts, each with the rule that derived it.                    |
| `packages/evals/src/analysis.ts`       | A pinned repository unpacked from its archive (through `@workspace/golden`'s `checkout`) and analysed: parsed, detected, the map's input.                       |
| `packages/evals/src/facts.ts`          | The rules that choose each case's subject and derive its facts from the analysis (D-04). Pure.                                                                  |
| `packages/evals/src/score.ts`          | `groundedness`, `factCoverage` and `lookupUse`, by arithmetic over `@workspace/ai`'s path reading (`parseExplanation`, `resolvePath`, `ungroundedPaths`). Pure. |
| `packages/evals/src/run.ts`            | Runs the cases through `@workspace/ai`, paced to each model's free requests a minute, traced (C-03).                                                            |
| `packages/evals/src/report.ts`         | Scores per kind and overall; the stored run; the comparison with another run (AC-05); the exit decision (FR-009).                                               |
| `packages/evals/runs/`                 | One file per run, and `accepted.json` naming the run new ones are compared with (D-02).                                                                         |
| `packages/golden/src/index.ts`         | `checkout` takes an archive file as well as GitHub, so the evaluation unpacks the same way the golden checks do.                                                |
| `packages/ai/src/chat/prompt.ts`       | `CHAT_PROMPT_VERSION`, beside `009`'s `PROMPT_VERSION`: FR-006 reports the prompt that produced each score.                                                     |

## Data

None in storage. The evaluation's records are files in the repository:
`cases.json`, the archives, and `runs/`.

## Decisions

- **D-01 A package of its own, dev-only.** The evaluation needs the parser,
  detection, the map's arithmetic, the golden checkout and `@workspace/ai`;
  the app needs none of it at run time. Considered: scripts in
  `@workspace/ai`. Rejected: they would give the model package a dependency
  on the parser's whole pipeline and on the network.
- **D-02 Runs are stored as files in the repository** (`runs/`), and the
  baseline is `accepted.json`, changed only by `pnpm eval --accept`.
  - Considered: LangSmith experiments. Rejected: the free plan keeps traces
    14 days (ADR 0003), and an experiment is traces, so last month's run
    couldn't be compared. The model calls are still traced there (D-08).
  - Considered: a table in storage. Rejected: every table belongs to an
    organization (`007`), and these runs belong to the code.
  - A file per run is reviewed in its pull request, like any other change
    that moves a number.
- **D-03 The archives are committed.** GitHub's own `.tar.gz` of each pinned
  commit, unpacked with `@workspace/github`'s `extractArchive` reading the
  file instead of the network.
  - Considered: the golden package's download into a git-ignored cache.
    Rejected: a deleted repository breaks the case (the spec's edge case).
  - Considered: Git LFS. Rejected: another tool, for 575 kB.
- **D-04 Facts come from rules, applied to the pinned analysis.**
  - A file case's facts are its neighbours, a box case's the files outside
    it that import it. Subjects are chosen with at most 4 facts, so a
    paragraph of 120 words can hold all of them.
  - A question comes from a template, each with its rule: "What breaks if
    `X` changes?" (the blast radius), "What does `X` depend on?" (the
    dependency chain), "Which files import `X`?" (the dependents), "Which
    file handles `METHOD /path`?" (the route's file), "Are there import
    cycles?" (the files of each cycle), and a question about another
    repository, whose fact is that it's declined (C-04 of `010`). Subjects
    are chosen with at most 6 facts.
  - Subjects are picked in path order from those that fit, so generating
    again picks the same ones.
- **D-05 The scores, exactly.**
  - Groundedness: an output is grounded if `ungroundedPaths` finds no file
    it names outside the analysis. Score: grounded outputs over all.
  - Fact coverage: a fact is covered if the output names that path. Score:
    the mean over cases of each case's covered facts over its facts (AC-07:
    three of four is 75%).
  - Lookup use, questions only: an answer passes if every file it names was
    returned by a lookup it showed (AC-08). Score: passing answers over all.
  - A declined question's facts are covered if it was declined; an output
    that's empty, refused or limited scores zero on every score (the spec's
    edge case).
- **D-06 The code that ships, with the cache left out.** Explanations read
  no cache and write none; the source comes from the unpacked archive,
  checked against the parser's hash as in production.
- **D-07 The model's default temperature.** Google: "For all Gemini 3
  models, we strongly recommend keeping the temperature parameter at its
  default value of 1.0", as lower values "may lead to unexpected behavior,
  such as looping or degraded performance". Outputs vary between runs, so
  `RERUN_VARIANCE` and the regression gate apply to the overall scores
  (spec, resolved).
- **D-08 Traced, in a project of its own.** `LANGSMITH_PROJECT` is set to
  `cartograph-evals` for the command, so its calls are told apart from
  production traffic and counted on their own (C-03).
- **D-09 Paced to the free tiers.** Calls wait to stay within each model's
  requests a minute (3.6 Flash: 5). A run is 8 explanation calls, up to 8
  retries, and at most 120 chat calls: two runs a day fit 3.6 Flash's 20
  requests (AC-03).
  - A case the model's server was busy for (HTTP 503, "This model is
    currently experiencing high demand", seen on the first run) is tried
    again, up to 3 times, waiting 15, 30, then 60 seconds, give or take a
    fifth. Google: retry only "transient errors (like 429, 408, or 5xx)",
    with exponential backoff, jitter and a maximum (Gemini API:
    troubleshooting). A 429 isn't retried: on the free tier it's the day's
    limit. Still unavailable, the case scores zero, as the spec says, marked
    `unavailable`, so an outage isn't read as a worse model.
  - The chat says so too (`010`): a busy model ends a turn as
    `unavailable`, "The model is busy right now. Try again in a minute."
- **D-10 The keys are the app's.** `pnpm eval` loads `apps/web/.env.local`
  (`node --env-file`), the one place they're kept locally. It doesn't run
  in CI: it spends quota and needs keys. Its scorers, rules and report are
  tested in CI like any package.

## Thresholds

| Name                         | Value     | Where              | Why                                        |
| ---------------------------- | --------- | ------------------ | ------------------------------------------ |
| `GROUNDED_REQUIRED`          | 100%      | `@workspace/evals` | The spec: no invented file at all.         |
| `SCORE_REGRESSION_TOLERANCE` | 2 points  | `@workspace/evals` | The spec, on overall scores.               |
| `RERUN_VARIANCE`             | 3 points  | `@workspace/evals` | The spec, on overall scores (AC-03).       |
| Facts per explanation case   | at most 4 | `@workspace/evals` | A 120-word paragraph can name them (D-04). |
| Facts per question case      | at most 6 | `@workspace/evals` | A short answer can name them (D-04).       |
| Cases a run                  | 8 + 20    | `cases.json`       | The spec: 6 files, 2 boxes, 20 questions.  |

## What needs doing outside the code

By the repository's owner:

- **LangSmith:** nothing to create; the project `cartograph-evals` appears
  with the first traced run.
- **Running it:** `pnpm eval`, twice on one day for AC-03, then
  `pnpm eval --accept` for the first baseline.

## Testing

- **Vitest, `@workspace/evals`:**
  - AC-02: an output naming an absent file isn't grounded.
  - AC-07: three of four facts is 75%.
  - AC-08: an answer naming a file no shown lookup returned fails lookup
    use.
  - AC-06: every fact in `cases.json` is derived again from the pinned
    analysis, and matches.
  - AC-04: a run more than 2 points below the accepted one fails; one at
    99% groundedness fails whatever the baseline.
  - AC-05: a comparison shows each score's change and both runs' versions.
  - An empty output scores zero on every score.
- **Terminal, by the owner:** AC-01 (the scores printed), AC-03 (two runs
  within 3 points overall), AC-05 (a comparison of the two).

## Risks

- **A run is slow.** At 5 requests a minute, the explanations alone take
  about two minutes, and the questions more. It's a command run before a
  model or prompt change, not on every commit.
- **Twenty questions is a small sample.** One answer moves a question score
  by 5 points; the gate is on the overall scores, and the comparison shows
  each case's result, so a change can be traced to the cases behind it.
- **Facts are only paths.** A file named wrongly about, not just named, still
  counts as covered. Groundedness and coverage are what arithmetic can check
  (C-01); a judged score was left out by decision.
