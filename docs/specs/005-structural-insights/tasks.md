# 005 — Structural insights: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** Done

## T01 — The insights

**Status:** Done
**Blocked by:** none
**Covers:** FR-001 to FR-007, C-01 to C-03, AC-01, AC-02, AC-04, AC-08 to
AC-10

**What to build:** in `@workspace/graph`, `insights`, `cycles` and
`sentenceOf`, and the two thresholds.

**Done when:**

- [x] The four kinds are found and ordered as the spec says, cycles
      iteratively, and every sentence matches FR-006 word for word.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T02 — Routes in the map input, and three samples

**Status:** Done
**Blocked by:** none
**Covers:** FR-010, FR-012 (the data), D-02, D-07, AC-03

**What to build:** each adapter's `routesRecovered`, the detection result's
schema version 2, `toMapInput`'s routes and `routesNotRecovered`; the three
samples, `/sample/$name`, and the home page's links.

**Done when:**

- [x] The NestJS and Express samples load at their addresses, and the sample
      script prints the NestJS sample's cycle, walked by hand (AC-03).
- [x] The golden scripts show no drift.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — The pane's insights and routes

**Status:** Done
**Blocked by:** T01, T02
**Covers:** FR-008 to FR-012, C-04, C-05, AC-05 to AC-07, AC-11

**What to build:** the summary's insights section, closed at first, with no
counts; the routes table with its empty sentence; every file in either
selects it on the map.

**Done when:**

- [x] The section starts closed, every file selects, and the NestJS and
      Express samples show their routes and their sentence.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — Acceptance

**Status:** Done
**Blocked by:** T03
**Covers:** AC-01 to AC-11

**Done when:**

- [x] Every acceptance criterion passes, each checked the way its row says,
      the browser ones on the preview deployment.
- [x] Build status at the top of this file set to Done.
