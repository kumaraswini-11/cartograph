# 003 — Dependency map: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** In progress

## T01 — The graph package: folding, labels and sizes

**Status:** Done
**Blocked by:** none
**Covers:** FR-003 to FR-006, FR-012, C-01, C-02, AC-01, AC-02, AC-12, AC-13

**What to build:** `packages/graph` with `toMapInput`, folding, labels, box
edges and sizes, and the limits.

**Done when:**

- [x] Folding meets AC-01 and AC-02 on a repository of more folders than
      `FOLD_TARGET`, and gives one box for a repository of one folder.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T02 — Layout, selection and role counts

**Status:** Done
**Blocked by:** T01
**Covers:** FR-009, FR-012, FR-013, FR-016, AC-03, AC-04

**What to build:** dagre positions for boxes and open panels, the same for
the same input; what a selection keeps at full strength; each box's count of
files in a chosen role.

**Done when:**

- [x] Every edge ends on a box or a row that exists, with panels open or not.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — The sample and the shell

**Status:** Done
**Blocked by:** T01
**Covers:** FR-001, FR-002, FR-015, FR-017, FR-021, FR-022, C-06, AC-09 to
AC-11, AC-17

**What to build:** `scripts/sample.ts` and the committed sample, the server
function, `/sample` with the three columns, the rail, the coverage banner
and the pane's empty state, and the map's column held at its size.

**Done when:**

- [x] `/sample` renders the rail and the pane on the server, with the map's
      column reserved before the map draws.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — The map

**Status:** Done
**Blocked by:** T02, T03
**Covers:** FR-005, FR-007 to FR-011, FR-013, FR-014, FR-016, FR-018 to
FR-020, FR-023, C-03 to C-05, AC-05 to AC-08, AC-14 to AC-16, AC-18

**What to build:** React Flow drawing the boxes, panels and edges; opening,
closing, selecting and dimming; the rail's role filter; the colours; motion
only on action; the keyboard.

**Done when:**

- [x] Every interaction works with no network request and from the keyboard.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — Acceptance

**Status:** Todo
**Blocked by:** T04
**Covers:** AC-01 to AC-18

**Done when:**

- [ ] Every acceptance criterion passes, each checked the way its row says,
      the browser ones on the preview deployment.
- [ ] Build status at the top of this file set to Done.
