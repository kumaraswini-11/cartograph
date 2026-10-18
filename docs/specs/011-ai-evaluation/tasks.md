# 011 — AI evaluation: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** Built; the second evaluation run and the browser checks
are carried into `012` (T01)

## T01 — The checks carried from 010 and 009

**Status:** Carried into `012` (T01), the owner's
**Blocked by:** none
**Covers:** `010` AC-01, AC-06, AC-09 and T05's `interface-review`; `009`'s
carried browser rows; then every `009` and `010` row on production, with
the carried `008`, `007` and `006` checks

**What to build:** nothing, unless a check fails. `/interface-review` is a
command typed in Claude Code, not a page of the app.

**Done when:**

- [ ] Each passes, or what fails is fixed, and `010`'s and `009`'s tasks
      files say so.

## T02 — The pinned repositories and the cases

**Status:** Done
**Blocked by:** none
**Covers:** FR-001, FR-002, C-02, AC-06, D-01, D-03, D-04

**What to build:** `@workspace/evals`; the three archives; `checkout` from an
archive file; the analysis; the rules that pick subjects and derive facts;
`cases.json`, generated.

**Done when:**

- [x] A test derives every fact in `cases.json` again from the pinned
      analysis and finds them equal (AC-06).
- [x] With the network off, the analyses still build from the archives.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — The scores

**Status:** Done
**Blocked by:** none
**Covers:** FR-003 to FR-005, C-01, AC-02, AC-07, AC-08, D-05

**What to build:** `groundedness`, `factCoverage`, `lookupUse`, and zero for
an empty output.

**Done when:**

- [x] Tests pass for AC-02, AC-07, AC-08 and an empty output.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — Running the cases

**Status:** Done
**Blocked by:** T02, T03
**Covers:** C-03, D-06 to D-09

**What to build:** each case through `@workspace/ai`, with no cache, the
source from the archive, paced per model, traced to `cartograph-evals`;
`CHAT_PROMPT_VERSION`.

**Done when:**

- [x] A test runs a case of each kind with the mock model, and its outputs
      are scored.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — The report, the runs and the gate

**Status:** Done
**Blocked by:** T04
**Covers:** FR-006 to FR-009, AC-01, AC-04, AC-05, D-02, D-10

**What to build:** `pnpm eval` (run, print, store, compare, exit),
`--accept`, and comparing two stored runs.

**Done when:**

- [x] Tests pass for AC-04 and AC-05.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T06 — Acceptance

**Status:** In progress. The first accepted run is
`runs/2026-10-18T14-17-49-948Z.json`: groundedness 100%, fact coverage
92.9%, lookup use 95.0%, one refusal. The second run, for AC-03 and AC-05,
waits for 3.6 Flash's daily requests to reset (midnight Pacific time). Two
earlier runs taught two fixes, both made: a busy model (HTTP 503) is tried
again (plan D-09), and a refused answer counts as members see it (D-05); the
first run, scored by the outage, was discarded, and the second re-scored by
D-05's rule before it was accepted.
**Blocked by:** T02 to T05
**Covers:** AC-01 to AC-08

**Done when:**

- [ ] `pnpm eval` prints its scores (AC-01); run twice on one day, the
      overall scores agree within 3 points (AC-03); the two are compared
      (AC-05); the first run is accepted as the baseline.
- [ ] Every other criterion passes as its row says.
- [ ] Build status at the top of this file set to Done.
