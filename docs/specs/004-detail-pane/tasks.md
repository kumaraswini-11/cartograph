# 004 — Detail pane: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** In progress

## T01 — The walk, the summary's lists and the new map input

**Status:** Todo
**Blocked by:** none
**Covers:** FR-002, FR-003, FR-010, FR-017, FR-018, C-02, C-03, C-05, AC-03,
AC-06, AC-10 to AC-12

**What to build:** in `@workspace/graph`, the edge index and the walk, the
summary's lists, the roles inside a box, and `toMapInput`'s frameworks,
imports and routes; the sample generated again.

**Done when:**

- [ ] The walk meets AC-06, AC-10, AC-11 and AC-12 on small fixtures, and
      each sample file's fan-in and fan-out equal its lists (AC-03).
- [ ] The sample carries the new fields, and its size is checked.
- [ ] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T02 — The summary

**Status:** Todo
**Blocked by:** T01
**Covers:** FR-001 to FR-006, C-01, AC-01, AC-07, AC-13

**What to build:** the pane's resting state, rendered on the server: the
repository, its frameworks, the counts, the two lists with "Show all N", and
the unidentified count; the shared file list and the derived-data provider.

**Done when:**

- [ ] `/sample` shows the summary in the server's HTML, and clearing a
      selection returns to it.
- [ ] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — A file or a box selected

**Status:** Todo
**Blocked by:** T02
**Covers:** FR-007 to FR-010, AC-04, AC-08

**What to build:** the Structure and Explanation tabs, kept across
selections; a file's path, role, lines, counts and full lists, virtualized
when long; a box's roles with their counts.

**Done when:**

- [ ] Selecting files and boxes in turn keeps the open tab, and every count
      equals its list.
- [ ] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — Moving between pane and map

**Status:** Todo
**Blocked by:** T03
**Covers:** FR-011 to FR-013, AC-02, AC-09

**What to build:** choosing a path in the pane selects it, opens its box and
lists it past the row limit; hovering marks a file in the other column, its
box when closed.

**Done when:**

- [ ] A file in a closed box, past the row limit, chosen in the pane, is
      selected and listed in its panel; hovering marks without a request.
- [ ] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — Blast radius and dependency chain

**Status:** Todo
**Blocked by:** T03
**Covers:** FR-014 to FR-016, FR-019, C-04, AC-05

**What to build:** the choice of blast radius or dependency chain, kept
across selections; every level with its count, the nearest
`REACH_OPEN_LEVELS` open, the total in the heading.

**Done when:**

- [ ] The lists appear with no loading state, and a long one stays under the
      interaction threshold on a repository of `MAX_FILES` files.
- [ ] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T06 — Acceptance

**Status:** Todo
**Blocked by:** T04, T05
**Covers:** AC-01 to AC-13

**Done when:**

- [ ] Every acceptance criterion passes, each checked the way its row says,
      the browser ones on the preview deployment.
- [ ] Build status at the top of this file set to Done.
