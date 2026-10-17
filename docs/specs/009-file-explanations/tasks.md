# 009 — File explanations: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** In progress

## T01 — The checks carried from 008

**Status:** Todo, the owner's (needs a sign-in on production)
**Blocked by:** none
**Covers:** `008` AC-01 to AC-04, AC-07 and AC-10 on production, and D-04's
`waitUntil` on Vercel; `006` AC-01 (GitHub, Google), AC-02, AC-03, AC-05,
AC-07; `007` AC-01 to AC-08

**What to build:** nothing. On production: sign in, map a repository, and
watch its stages, the map, a re-run and a second tab. The carried 006 and
007 checks are done along the way.

**Done when:**

- [ ] Each passes, or what fails is fixed, and `008`'s, `007`'s and `006`'s
      tasks files say so.

## T02 — The model and its tracing

**Status:** Done
**Blocked by:** none
**Covers:** FR-011 to FR-013, C-04, AC-08, AC-10, D-01 to D-03

**What to build:** `@workspace/ai`:

- `MODEL` and `languageModel`, the one place that builds the model client;
- `tracing`, with `traced` and `flush`, which is a plain call when
  tracing is off.

**Done when:**

- [x] AC-10: `MODEL` is an exact version, and a test refuses any alias.
- [x] With the real key locally, one call to Gemini returns (3.6 s,
      2026-10-18), and with tracing off it still returns.
- [x] With `LANGSMITH_*` set, a traced run (`t02-tracing-check`) appears in
      the `cartograph-development` project (2026-10-18).
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — The cache in storage

**Status:** Todo
**Blocked by:** none
**Covers:** FR-010, D-09

**What to build:** the `explanations` migration, its pgTAP tests and types;
`readExplanation` and `explanationWriter` in `@workspace/database`.

**Done when:**

- [ ] pgTAP: `explanations` passes 007's every-table tests, members read
      only their organization's, and a duplicate key writes one row.
- [ ] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — A file explained, grounded and cached

**Status:** Todo
**Blocked by:** T02, T03
**Covers:** FR-001, FR-003 to FR-011, C-01 to C-05, AC-01 to AC-03, AC-05,
AC-07, AC-09, D-04 to D-08, D-11

**What to build:**

- `fileAtCommit` in `@workspace/github`;
- the file prompt, structured output and grounding in `@workspace/ai`, with
  `parseExplanation`;
- `explainSelection` and `explain`;
- the Explanation tab, with path links, the inferred role, messages, and the
  session's explanations.

**Done when:**

- [ ] Tests pass for AC-02, AC-05 and AC-07, and for a source whose hash
      doesn't match.
- [ ] Locally, a file's explanation names genuine neighbours, and choosing
      one moves the map (AC-01).
- [ ] Explained again, it's instant, and LangSmith shows a second run with
      no model call (AC-03).
- [ ] Away and back, it shows without a request (AC-09).
- [ ] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — A box explained

**Status:** Todo
**Blocked by:** T04
**Covers:** FR-002, AC-04

**What to build:** the box prompt and its cache key: the folder's files,
their roles, and the edges into it.

**Done when:**

- [ ] Locally, a box's explanation is about the folder, not one file in it
      (AC-04).
- [ ] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T06 — Stale explanations

**Status:** Todo
**Blocked by:** T04
**Covers:** FR-014, FR-015, AC-06, D-10

**What to build:** `staleness`, and the tab's notice with Re-run.

**Done when:**

- [ ] A test covers each case: the branch unmoved, moved with the file
      unchanged, and moved with the file changed.
- [ ] Locally, an analysis whose repository has moved on shows the notice
      and Re-run (AC-06).
- [ ] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T07 — Acceptance

**Status:** Todo
**Blocked by:** T04, T05, T06
**Covers:** AC-01 to AC-10

**Done when:**

- [ ] Every acceptance criterion passes, each checked the way its row says:
      locally before merge, and on production after it.
- [ ] Build status at the top of this file set to Done.
