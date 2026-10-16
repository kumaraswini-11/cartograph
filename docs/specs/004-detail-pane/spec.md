# 004 — Detail pane

**Status:** Draft
**Milestone:** M2 Explorer
**Depends on:** 003-dependency-map

## Summary

Selecting anything on the map tells someone what it is, what it depends on,
what depends on it, and what may break if it changes; with nothing selected,
the pane already says what the repository is.

The questions Cartograph exists to answer are structural: what is this file,
what depends on it, what breaks if it changes (`docs/project-doc.md`). Blast
radius and the dependency chain are arithmetic over the edges, so they appear
instantly.

## Requirements

### Nothing selected

- **FR-001** While nothing is selected, the detail pane shall show the
  repository's summary: its name, the framework detected, and the counts of
  files, imports and routes.
- **FR-002** The summary shall list the `SUMMARY_LIST_LENGTH` files with the
  most dependents, most first.
- **FR-003** The summary shall list the files with no dependents, entry points
  first, as the places to start reading.
- **FR-004** The summary shall show how many files no adapter could identify.
- **FR-005** When the selection is cleared, the detail pane shall return to the
  summary.

### A file selected

- **FR-006** When a file is selected, the detail pane shall show its path, its
  role, its line count, its fan-out and fan-in, and the full list of its
  dependencies and its dependents.
- **FR-007** The detail pane shall offer two tabs, Structure and Explanation;
  Structure holds everything in FR-006, and Explanation is empty until `009`
  fills it.
- **FR-008** When the selection changes, the detail pane shall keep the tab
  that was open.

### A box selected

- **FR-009** When a box is selected, the Structure tab shall list the roles of
  the files inside it, each with its count.

### Moving between pane and map

- **FR-010** When a file path in the detail pane is chosen, the map shall move
  the selection to that file.
- **FR-011** While a neighbour in the detail pane is hovered, the map shall mark it; while a file on the map is hovered, the pane shall mark it.

### Blast radius and dependency chain

- **FR-012** When blast radius is chosen for a file, the detail pane shall list
  its dependents followed transitively to `REACH_DEPTH` levels, grouped by
  level.
- **FR-013** When dependency chain is chosen for a file, the detail pane shall
  list its dependencies followed transitively to `REACH_DEPTH` levels, grouped
  by level.
- **FR-014** Blast radius and dependency chain shall be one walk over the edges
  that takes a direction and a depth.
- **FR-015** A walk shall list each file once, at the first level it's reached,
  and never list the file it started from.

### Speed

- **FR-016** Everything in the detail pane shall come from data already in the
  browser, with no network request.

## Constraints

- **C-01** The summary is the pane's resting state, not a placeholder. _Why:_
  it's the first thing anyone sees. _Looks fine until:_ the pane opens on
  "select something to begin".
- **C-02** Counts equal lists. _Why:_ a count that disagrees with its list
  makes every number suspect. _Looks fine until:_ duplicate edges are counted
  but not listed.
- **C-03** One walk, two directions. _Why:_ two copies of the same arithmetic
  drift apart. _Looks fine until:_ a fix lands in one direction only.
- **C-04** The walk is bounded at `REACH_DEPTH`. _Why:_ deeper, it returns most
  of the repository and stops being an answer. _Looks fine until:_ a heavily
  imported utility makes every file "affected".

## Edge cases

- A file with no dependents → its blast radius says nothing depends on it.
- A cycle within reach → each file listed once, at the first level reached.
- A box selected while a file tab is open → the Structure tab shows roles; the
  open tab is kept.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                                                | Covers                 | Verified by |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- |
| AC-01 | Given the map loaded with nothing selected, when the pane is read, then it shows the counts, the most depended-on files and where to start reading | FR-001..FR-004         | browser     |
| AC-02 | Given a selected file, when the network panel is watched, then no request was made, and hovering a neighbour marks it on the map at once           | FR-011, FR-016         | browser     |
| AC-03 | Given a selected file, when its fan-in and fan-out are compared with its lists, then each count equals its rows                                    | FR-006, C-02           | test        |
| AC-04 | Given the Explanation tab open, when another file is selected, then the Explanation tab is still open                                              | FR-008, FR-007         | browser     |
| AC-05 | Given a file, when blast radius is chosen, then the list appears without a loading state, and two entries checked by hand are right                | FR-012, FR-016, FR-013 | browser     |
| AC-06 | Given edges forming a cycle, when a walk crosses it, then each file appears once and the start file not at all                                     | FR-015                 | test        |
| AC-07 | Given a selection, when it's cleared, then the pane shows the summary                                                                              | FR-005                 | browser     |
| AC-08 | Given a selected box, when the Structure tab is read, then it lists each role inside the box with its count                                        | FR-009                 | browser     |
| AC-09 | Given a path in the detail pane, when it's chosen, then the map's selection moves to that file                                                     | FR-010                 | browser     |
| AC-10 | Given the edges reversed, when the blast radius of a file is found, then it equals the file's dependency chain on the original edges               | FR-014, C-03           | test        |

## Out of scope

- Insights and the routes table → `005`.
- What the Explanation tab holds → `009`.

## Open questions

- [NEEDS CLARIFICATION] `REACH_DEPTH` = 2 comes from the earlier phase spec;
  confirm.
- [NEEDS CLARIFICATION] `SUMMARY_LIST_LENGTH`: proposed 10.
