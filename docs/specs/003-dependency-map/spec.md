# 003 — Dependency map

**Status:** Approved
**Milestone:** M2 Explorer
**Depends on:** 001-repository-parser, 002-framework-detection

## Summary

Someone sees a repository as a map: folders folded into a readable number of
boxes, edges as lines between them, boxes that open into their files, and a
rail of roles, inside the three-column shell every later spec adds to.

A large repository has to collapse into something legible, and the threshold
has to be solved for rather than guessed (`docs/project-doc.md`, where this is
likely to go wrong). The shell is built once here; later specs fill its
columns and never move them.

## Requirements

### The shell

- **FR-001** The interface shall show three columns: the rail on the left, the
  map filling the middle, the detail pane on the right.
- **FR-002** The detail pane shall be a column, never a dialog, drawer or
  overlay.

### Folding

- **FR-003** The map shall start with one box per folder, then fold deepest
  first: a folder holding fewer than the threshold of files merges into its
  parent, each depth computed fresh from the result of the depth below.
- **FR-004** The map shall start the threshold at `FOLD_MIN_FILES` = 2 and raise
  it by one until the map holds at most `FOLD_TARGET` = 24 boxes, stopping at the
  lowest threshold that does.

### Boxes and panels

- **FR-005** A box's height shall grow with its dependents; its width shall come
  from its label.
- **FR-006** A label shall be the shortest form of the folder's path that is
  unique among what's on the map.
- **FR-007** When a box is chosen, the map shall open it into a panel: a
  bordered box whose header shows the folder's name, its file count, its fan-in
  and its fan-out, and whose files appear as rows.
- **FR-008** If a panel holds more than `PANEL_ROW_LIMIT` = 12 files, then it shall
  show `PANEL_ROW_LIMIT` rows and say how many more there are.
- **FR-009** Edges shall connect to the rows of an open panel.
- **FR-010** When a panel's header is chosen, the map shall close it back into
  a box.
- **FR-011** When a panel opens, the map shall refit so the panel is visible,
  only ever zooming out.
- **FR-012** The same data shall always produce the same layout.

### Selection

- **FR-013** When a box or a row is selected, the map shall keep it, its edges
  and its neighbours at full strength and dim everything else.
- **FR-014** Selecting, opening, closing and dimming shall happen in the
  browser with no network request.
- **FR-023** Every action on the map and the rail (selecting a box or a row,
  opening and closing a panel, choosing a role) shall work from the keyboard
  alone, with the focus always visible (`012` FR-011).

### The rail

- **FR-015** The rail shall list the analysis's taxonomy in its fixed order,
  each role with a colour swatch, its name and its file count.
- **FR-016** When a role is chosen on the rail, the map shall dim every file
  outside it, removing nothing, and each open panel shall show how many of its
  files match.

### Coverage

- **FR-017** While the coverage figure (`001` FR-020) is below
  `COVERAGE_PARTIAL_BELOW` = 95%, the
  map shall show a banner naming the figure; collapsed, the banner stays one
  line that still names it.

### Appearance

- **FR-018** Colour shall carry meaning or be absent: one accent for selection
  and interactive elements, one colour for edges into a file and another for
  edges out of it, one colour per tier, and greyscale for everything else.
- **FR-019** File paths shall be set in a monospace face.
- **FR-020** Motion shall happen only in response to an action, and not at all
  when the person's system asks for reduced motion.
- **FR-021** The interface shall offer a light and a dark palette. On a first
  visit it follows the system setting; once the person chooses a palette, that
  choice wins over the system and survives a reload, with no flash of the
  other palette.

- **FR-022** Until the map is drawn, the interface shall hold the map's
  column at its final size, so nothing else on the page moves when it appears.

## Constraints

- **C-01** Folding is the rule the map rests on, solved per repository, never
  set in advance. _Why:_ the repository's own shape decides the depth. _Looks
  fine until:_ a twenty-file repository, where folding never has to work.
- **C-02** The map reads the parser's result unchanged and derives what it
  needs. _Why:_ the result is a contract (`001`). _Looks fine until:_ the map
  needs one extra field and the contract bends.
- **C-03** Refitting only zooms out. _Why:_ fitting to a new panel would zoom
  into it and lose the rest of the map. _Looks fine until:_ the refit reads the
  state before the panel opened rather than after.
- **C-04** Anything derivable from the edges is instant. _Why:_ a spinner in
  front of arithmetic teaches people to distrust the fast paths. _Looks fine
  until:_ a "loading" state appears for a filter.
- **C-05** Both palettes are real palettes, not one inverted. _Why:_ the
  project doc requires it. _Looks fine until:_ dark mode's direction colours
  can't be told apart.

- **C-06** Space for the map is reserved before it's drawn. _Why:_ whenever the
  map appears later than the rest of the page, holding its space is what keeps
  the page still, and a page that moves fails the layout-shift threshold of
  `012`. _Looks fine until:_ a
  fast machine, where the map appears before anyone notices the shift.

## Edge cases

- A repository with one folder → one box; the box-count checks don't apply.
- A repository with zero files → an empty state saying no files were found.
- An edge between two files in the same box → not drawn between boxes; drawn
  between rows once the box opens.
- A box that can't fold any further and still exceeds `FOLD_TARGET` (many
  sibling folders of exactly `FOLD_MIN_FILES` files) → the threshold keeps
  rising until it does fit.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                                                              | Covers         | Verified by |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------- |
| AC-01 | Given a repository with more folders than `FOLD_TARGET`, when the map is built, then it holds at most `FOLD_TARGET` boxes, at the lowest threshold that does     | FR-003, FR-004 | test        |
| AC-02 | Given the same map, when its boxes are counted, then every box holds more than one file                                                                          | FR-003         | test        |
| AC-03 | Given the same map, when its edges are checked, then every edge ends on a box or row that exists                                                                 | FR-009         | test        |
| AC-04 | Given the same data built twice, when the layouts are compared, then they're identical                                                                           | FR-012         | test        |
| AC-05 | Given a closed box, when it's clicked, then it opens into rows with the count in its header, edges reconnect, and clicking the header closes it                  | FR-007..FR-010 | browser     |
| AC-06 | Given a map, when a panel opens, then the view only zooms out and the panel is in view                                                                           | FR-011         | browser     |
| AC-07 | Given a selected file, when the network panel is watched while selecting, opening and filtering, then no request is made                                         | FR-014         | browser     |
| AC-08 | Given a role chosen on the rail, when the panels' match counts are added up, then they equal the rail's count, and nothing has been removed                      | FR-016, FR-015 | browser     |
| AC-09 | Given dark chosen while the system is light, when the page reloads, then it renders dark from the first paint                                                    | FR-021         | browser     |
| AC-10 | Given a coverage figure below `COVERAGE_PARTIAL_BELOW`, when the map loads, then the banner names the figure, also when collapsed                                | FR-017         | browser     |
| AC-11 | Given any window width, when the interface loads, then it shows the rail, the map and the detail pane as three columns, and the pane is never an overlay         | FR-001, FR-002 | browser     |
| AC-12 | Given two boxes, when one has more dependents, then it's taller, and a box's width follows its label only                                                        | FR-005         | test        |
| AC-13 | Given folders with the same last segment, when labels are made, then each is the shortest unique form of its path                                                | FR-006         | test        |
| AC-14 | Given a selected file, when the map is read, then it, its edges and its neighbours are at full strength and everything else is dimmed                            | FR-013         | browser     |
| AC-15 | Given the map, when its colours are checked, then edges in and out differ, each tier has its own colour, everything else is greyscale, and paths are monospace   | FR-018, FR-019 | browser     |
| AC-16 | Given the system set to reduce motion, when a panel opens, then nothing animates                                                                                 | FR-020         | browser     |
| AC-17 | Given a slow network and processor profile, when the map page loads, then the rail and the detail pane don't move as the map appears                             | FR-022, C-06   | browser     |
| AC-18 | Given the keyboard alone, when a box is reached, opened, a row selected, the panel closed and a role chosen, then each works and the focus is visible throughout | FR-023         | browser     |

## Out of scope

- What the detail pane shows → `004`.
- Reading stored analyses rather than a parser result → `008`. Until then the
  map shows one fixed sample analysis, chosen in the plan.

## Open questions

None. Resolved 2026-10-16: `FOLD_MIN_FILES` = 2, `FOLD_TARGET` = 24,
`PANEL_ROW_LIMIT` = 12 and `COVERAGE_PARTIAL_BELOW` = 95%; light and dark
only, a first visit following the system (FR-021), with the project doc
changed to match; keyboard access added from `012` (FR-023).
