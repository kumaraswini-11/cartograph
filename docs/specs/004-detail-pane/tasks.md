# 004 — Detail pane: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** In progress

## T01 — The walk, the summary's lists and the new map input

**Status:** Done
**Blocked by:** none
**Covers:** FR-002, FR-003, FR-010, FR-017, FR-018, C-02, C-03, C-05, AC-03,
AC-06, AC-10 to AC-12

**What to build:** in `@workspace/graph`, the edge index and the walk, the
summary's lists, the roles inside a box, and `toMapInput`'s frameworks,
imports and routes; the sample generated again.

**Done when:**

- [x] The walk meets AC-06, AC-10, AC-11 and AC-12 on small fixtures, and
      each sample file's fan-in and fan-out equal its lists (AC-03).
- [x] The sample carries the new fields, and its size is checked.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T02 — The summary

**Status:** Done
**Blocked by:** T01
**Covers:** FR-001 to FR-006, C-01, AC-01, AC-07, AC-13

**What to build:** the pane's resting state, rendered on the server: the
repository, its frameworks, the counts, the two lists with "Show all N", and
the unidentified count; the shared file list and the derived-data provider.

**Done when:**

- [x] `/sample` shows the summary in the server's HTML, and clearing a
      selection returns to it.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — A file or a box selected

**Status:** Done
**Blocked by:** T02
**Covers:** FR-007 to FR-010, AC-04, AC-08

**What to build:** the Structure and Explanation tabs, kept across
selections; a file's path, role, lines, counts and full lists, virtualized
when long; a box's roles with their counts.

**Done when:**

- [x] Selecting files and boxes in turn keeps the open tab, and every count
      equals its list.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — Moving between pane and map

**Status:** Done
**Blocked by:** T03
**Covers:** FR-011 to FR-013, AC-02, AC-09

**What to build:** choosing a path in the pane selects it, opens its box and
lists it past the row limit; hovering marks a file in the other column, its
box when closed.

**Done when:**

- [x] A file in a closed box, past the row limit, chosen in the pane, is
      selected and listed in its panel; hovering marks without a request.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — Blast radius and dependency chain

**Status:** Done
**Blocked by:** T03
**Covers:** FR-014 to FR-016, FR-019, C-04, AC-05

**What to build:** the choice of blast radius or dependency chain, kept
across selections; every level with its count, the nearest
`REACH_OPEN_LEVELS` open, the total in the heading.

**Done when:**

- [x] The lists appear with no loading state.
- [x] On a repository of `MAX_FILES` files, with the processor slowed 4×,
      choosing a file, its blast radius of 4,999 files and its dependency
      chain stay under 200 ms at the median. One case is just over: a file
      whose walk runs 49 steps, 216 ms at the median, 160 ms at best (plan
      D-12).
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T06 — Acceptance

**Status:** Todo
**Blocked by:** T04, T05
**Covers:** AC-01 to AC-13

**Done when:**

- [ ] Every acceptance criterion passes, each checked the way its row says,
      the browser ones on the preview deployment.
- [ ] Build status at the top of this file set to Done.
