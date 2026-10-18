# @workspace/evals

The evaluation of explanations (spec 009) and chat answers (spec 010): a
fixed set of cases, pinned to commits, scored by arithmetic, so a change of
model or prompt can be shown to have helped or hurt (spec 011).

## Why a separate package

It needs the parser, detection, the map's arithmetic, the golden checkout
and `@workspace/ai`; the app needs none of it at run time. Kept apart,
nothing the app runs imports it, as with `@workspace/golden` (plan D-01).

## What's in it

- `archives/`: GitHub's own archive of each pinned commit
  (`expressjs/express`, `vercel/commerce`,
  `lujakob/nestjs-realworld-example-app`), committed, so a case runs even if
  its repository goes, and with no network (plan D-03).
- `cases.json`: the case set, generated, never edited by hand: 6 files and
  2 boxes to explain, and 20 questions, each with the facts its output must
  name and the rule that derived them (plan D-04).

## Use

| Command (from the repository root)     | What it does                                                              |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm eval`                            | Runs every case, prints the scores, stores the run, fails on a regression |
| `pnpm eval --accept`                   | The same, then makes this run the one later runs are compared with        |
| `pnpm eval compare <run> <run>`        | Compares two stored runs: each score's change, and their versions         |
| `pnpm --filter @workspace/evals cases` | Derives the case set from the archives and writes `cases.json`            |
| `pnpm --filter @workspace/evals test`  | Runs its tests, including that `cases.json` is what the rules derive      |

`cases.json` is written as the command writes it (it's in
`.prettierignore`), so its test compares it with a fresh derivation.

`pnpm eval` reads the keys in `apps/web/.env.local` (plan D-10) and traces to
the LangSmith project `cartograph-evals` (D-08). It spends free quota, so it
isn't run in CI: run it before a model or prompt change. A run takes a few
minutes, paced to the free tiers (D-09). Runs are kept in `runs/`, written as
the command writes them (`.prettierignore`).

## Status

Internal and dev-only: never published, and not run by the app.

## Docs

[Spec 011](../../docs/specs/011-ai-evaluation/spec.md) ·
[plan](../../docs/specs/011-ai-evaluation/plan.md) ·
[tasks](../../docs/specs/011-ai-evaluation/tasks.md)
