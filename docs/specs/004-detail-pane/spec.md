# 004 — Detail pane

**Status:** Approved
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
  repository's summary: its name, the frameworks detected, and the counts of
  files, imports and routes.
- **FR-002** The summary shall list the files with the most dependents, most
  first.
- **FR-003** The summary shall list the files no other file imports, as the
  places to start reading: entry points first, then the files that import the
  most.
- **FR-004** Each summary list shall show at most `SUMMARY_LIST_LENGTH` = 10
  files, offer to show the rest, and give its full count in its heading.
- **FR-005** The summary shall show how many files no adapter could identify.
- **FR-006** When the selection is cleared, the detail pane shall return to the
  summary.

### A file selected

- **FR-007** When a file is selected, the detail pane shall show its path, its
  role, its line count, its fan-out and fan-in, and the full list of its
  dependencies and its dependents.
- **FR-008** The detail pane shall offer two tabs, Structure and Explanation;
  Structure holds everything in FR-007, and Explanation is empty until `009`
  fills it.
- **FR-009** When the selection changes, the detail pane shall keep the tab
  that was open.

### A box selected

- **FR-010** When a box is selected, the Structure tab shall list the roles of
  the files inside it, each with its count.

### Moving between pane and map

- **FR-011** When a file path in the detail pane is chosen, the map shall move
  the selection to that file, opening its box if it's closed.
- **FR-012** The panel holding the selected file shall list it, even past
  `PANEL_ROW_LIMIT` (`003`).
- **FR-013** While a neighbour in the detail pane is hovered, the map shall
  mark it; while a file on the map is hovered, the pane shall mark it.

### Blast radius and dependency chain

- **FR-014** When blast radius is chosen for a file, the detail pane shall list
  its dependents, followed transitively through every level, grouped by level,
  nearest first, with the total in its heading.
- **FR-015** When dependency chain is chosen for a file, the detail pane shall
  list its dependencies the same way.
- **FR-016** The detail pane shall list the files of the first
  `REACH_OPEN_LEVELS` = 2 levels, and give each deeper level's count until
  that level is opened.
- **FR-017** Blast radius and dependency chain shall be one walk over every
  edge, type-only edges included, that takes a direction and an optional
  depth.
- **FR-018** A walk shall list each file once, at the first level it's
  reached, and never list the file it started from.

### Speed

- **FR-019** Everything in the detail pane shall come from data already in the
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
- **C-04** Complete, nearest first. The walk follows every level; the pane
  opens only the nearest. _Why:_ a file several levels away can still break,
  so a walk cut short hides real dependents, while every level open buries the
  files most likely to be affected. _Looks fine until:_ a heavily imported
  utility's blast radius stops at two levels and a file three levels away
  breaks.
- **C-05** Type-only edges count. _Why:_ a changed type breaks compilation in
  the files that use it. _Looks fine until:_ a type is changed and its users
  aren't in the blast radius.

## Edge cases

- A file with no dependents → its blast radius says nothing depends on it.
- A cycle within reach → each file listed once, at the first level reached.
- A box selected while a file tab is open → the Structure tab shows roles; the
  open tab is kept.
- A neighbour hovered in the pane whose box is closed → its box is marked.
- No framework detected → the routes count says none were found, not 0.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                                                                          | Covers                 | Verified by |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- |
| AC-01 | Given the map loaded with nothing selected, when the pane is read, then it shows the counts, the most depended-on files and where to start reading                           | FR-001..FR-005         | browser     |
| AC-02 | Given a selected file, when the network panel is watched, then no request was made, and hovering a neighbour marks it on the map at once                                     | FR-013, FR-019         | browser     |
| AC-03 | Given a selected file, when its fan-in and fan-out are compared with its lists, then each count equals its rows                                                              | FR-007, C-02           | test        |
| AC-04 | Given the Explanation tab open, when another file is selected, then the Explanation tab is still open                                                                        | FR-009, FR-008         | browser     |
| AC-05 | Given a file, when blast radius is chosen, then the list appears without a loading state, and two entries checked by hand are right                                          | FR-014, FR-015, FR-019 | browser     |
| AC-06 | Given edges forming a cycle, when a walk crosses it, then each file appears once and the start file not at all                                                               | FR-018                 | test        |
| AC-07 | Given a selection, when it's cleared, then the pane shows the summary                                                                                                        | FR-006                 | browser     |
| AC-08 | Given a selected box, when the Structure tab is read, then it lists each role inside the box with its count                                                                  | FR-010                 | browser     |
| AC-09 | Given a path in the detail pane for a file in a closed box, past its panel's row limit, when it's chosen, then the box opens and the selected file is listed in its panel    | FR-011, FR-012         | browser     |
| AC-10 | Given the edges reversed, when the blast radius of a file is found, then it equals the file's dependency chain on the original edges                                         | FR-017, C-03           | test        |
| AC-11 | Given a file whose dependents reach deeper than `REACH_OPEN_LEVELS`, when its blast radius is found, then every level is counted, and the levels' counts add up to the total | FR-014, FR-016, C-04   | test        |
| AC-12 | Given a file used only through a type-only import, when its blast radius is found, then the importing file is in it                                                          | FR-017, C-05           | test        |
| AC-13 | Given a list longer than `SUMMARY_LIST_LENGTH`, when the summary is read, then it shows `SUMMARY_LIST_LENGTH` files and its heading gives the full count                     | FR-004, C-02           | test        |

## Out of scope

- Insights and the routes table → `005`.
- What the Explanation tab holds → `009`.

## Open questions

None. Resolved 2026-10-16: `SUMMARY_LIST_LENGTH` = 10, each list offering the
rest; "where to start reading" lists every file no other file imports; a file
chosen in the pane opens its box and is listed past the row limit. The walk
follows every level rather than stopping at `REACH_DEPTH` = 2: on the sample
repository two levels left out real dependents for 10 of the 64 files that
have any, so the pane opens the nearest `REACH_OPEN_LEVELS` = 2 instead.
