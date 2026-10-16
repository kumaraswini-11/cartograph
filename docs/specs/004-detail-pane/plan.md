# 004 — Detail pane: plan

**Spec:** [spec.md](spec.md)
**Status:** Approved

## Approach

The arithmetic joins `@workspace/graph` (`003` D-01), as pure functions over
files and edges: one walk for blast radius and dependency chain, the
summary's lists, and the roles inside a box. The map input grows by three
facts the summary needs (frameworks, imports, routes), read from the
parser's and detection's results unchanged, and the sample is generated
again.

The pane stays the right-hand `Sidebar` of `003`. With nothing selected it
renders the summary on the server, so the first paint already says what the
repository is (C-01). Everything a selection shows is computed in the browser
from the map input the page already holds (FR-019): no loader, no server
function, no request.

## Modules and interfaces

| Module                                      | What it does                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/graph/src/input.ts`               | `toMapInput` adds `frameworks` (each package's detected framework, once, in the order found), `imports` (seen, and resolved to a file in the repository) and `routes` (how many), all read unchanged (`003` C-02).                                                                                                                                |
| `packages/graph/src/reach.ts`               | `edgeIndex(edges)`: each file's dependencies and dependents, built once per map. `walk(index, start, direction, depth = Infinity)`: breadth first, each file once at the first level it's reached, never the start (FR-017, FR-018). Returns the levels, nearest first.                                                                           |
| `packages/graph/src/summary.ts`             | `mostDependedOn(files)`: files with dependents, most first (FR-002). `startingPoints(files)`: files with no dependents, entry points first, then the files importing the most (FR-003). `rolesIn(box, files, taxonomy)`: each role inside a box with its count, in the taxonomy's order (FR-010). Ties break by path (`@workspace/parser/paths`). |
| `packages/graph/src/boxes.ts`, `layout.ts`  | `panelOf` and `layoutMap` take the selected file: a panel lists it after its first `PANEL_ROW_LIMIT` rows when it's past them (FR-012), so the first rows never move.                                                                                                                                                                             |
| `packages/graph/src/limits.ts`              | `SUMMARY_LIST_LENGTH` = 10 and `REACH_OPEN_LEVELS` = 2, beside `003`'s limits.                                                                                                                                                                                                                                                                    |
| `apps/web/src/components/map/map-data.tsx`  | The map's derived data, built once per map input and shared by the rail, the map and the pane: boxes (`buildBoxes`) and the edge index. Today the drawing builds the boxes itself.                                                                                                                                                                |
| `apps/web/src/components/map/map-hover.ts`  | The hovered file, in a small store read with `useSyncExternalStore`: each row asks only whether it's the one hovered, so hovering re-renders two rows, not the map or the pane (FR-013).                                                                                                                                                          |
| `apps/web/src/components/detail/`           | The pane's parts: `summary.tsx` (FR-001 to FR-005), `file-detail.tsx` (FR-007), `box-detail.tsx` (FR-010), `reach.tsx` (FR-014 to FR-016), and `file-list.tsx`, the one list of file paths every part uses. `detail-pane.tsx` moves here from `components/map/` and chooses what to show from the selection.                                      |
| `apps/web/scripts/sample.ts`, `src/sample/` | The sample, generated again with the new fields.                                                                                                                                                                                                                                                                                                  |

## Data

```ts
// Added to 003's MapInput:
type MapInput = {
  // …
  frameworks: Array<string> // empty when no adapter matched
  imports: { seen: number; resolved: number } // 001's coverage counts
  routes: number // 002's routes
}

type Direction = "dependents" | "dependencies"
type EdgeIndex = Record<Direction, ReadonlyMap<string, ReadonlyArray<string>>>
type Levels = Array<Array<string>> // levels[0] is one edge away
```

## Decisions

- **D-01** The pane's parts live in `apps/web/src/components/detail/`, a
  feature of their own (AGENTS.md: compositions a single feature uses), and
  the pane takes the map input as a prop from the shell, so its parts present
  data they're given. The selection and the open boxes stay in `003`'s map
  state.
- **D-02** One walk (C-03): `walk` takes the edge index, a start, a direction
  and an optional depth; blast radius is `"dependents"`, dependency chain
  `"dependencies"`. Breadth first, so each file's level is its shortest
  distance (FR-018), and a cycle ends when every file in it has been seen.
  The index is built once, so a walk costs only the files it reaches. It
  follows type-only edges like any other (C-05).
- **D-03** Every level is found; the pane opens only the nearest
  `REACH_OPEN_LEVELS` (FR-016, C-04). Each level is a shadcn `Collapsible`
  whose trigger gives the level and its count, so the counts are read before
  anything is opened and add up to the total in the heading (AC-11).
- **D-04** The tabs are shadcn `Tabs` (Base UI), controlled by the pane, which
  stays mounted while the selection changes, so the open tab is kept
  (FR-009). Blast radius and dependency chain are a shadcn `ToggleGroup` of
  two items (shadcn keeps it for 2 to 7 options, `003` D-08) inside the
  Structure tab, and the choice is kept across selections the same way.
  Keyboard behaviour follows Base UI's docs: arrow keys move between tabs and
  between toggle items.
- **D-05** One file list (`file-list.tsx`) for the summary's two lists, a
  file's dependencies and dependents, and each reach level: five uses, past
  the rule of three. The pane is a `Sidebar`, so a list is the Sidebar's own
  menu, as the rail's is: a `SidebarMenu` (a real `ul`) of
  `SidebarMenuButton` rows, a count in `SidebarMenuBadge` and a mark such as
  "entry point" in a `Badge`. A row shows the file's name, then its folder
  cut from its start, so the end that tells two `page.tsx` apart stays in
  view; below 13rem, a container query leaves the name alone, and the
  button's accessible name always carries the whole of it. Choosing a row
  selects that file (FR-011), and hovering or focusing it marks the file on
  the map (FR-013). Its props are the rows, an optional length to show
  before "Show all N" (FR-004), the heading and the empty text.
- **D-06** Long lists are virtualized with TanStack Virtual
  (`@tanstack/react-virtual`, already in the catalog): past
  `LIST_VIRTUAL_FROM` = 100 rows, a list renders only the rows in view.
  _Why:_ a file can have up to `MAX_FILES` (5,000) dependents, and rendering
  that many rows at once would miss the interaction-to-next-paint threshold
  (`012`). Every list shares the pane's one scroll container, each offset by
  its position in it (`scrollMargin`), so there's no scrolling inside
  scrolling. Rows carry `aria-setsize` and `aria-posinset`, so a screen
  reader still hears the list's full length. Shorter lists, the summary's
  among them, render in full and on the server. _Rejected:_ showing the first
  rows and a "Show all" for every list, which only moves the slow render to
  the click.
- **D-07** Choosing a file in the pane selects it and opens its box when it's
  closed (FR-011); the panel then lists it even past the row limit (FR-012),
  after the first `PANEL_ROW_LIMIT` rows, so those never move. The map
  brings it into view with `003`'s `bringIntoView`, which never zooms in.
- **D-08** Hover marks both ways (FR-013) through `map-hover.ts`: the pane's
  rows set the hovered file on pointer enter and keyboard focus, and the
  map's rows do the same. On the map a hovered file's row is marked, or its
  box when the box is closed; in the pane every row with that path is
  marked. The mark is an outline in the theme's `ring` token, apart from the
  selection's colour, so it follows both themes; an outline takes no space,
  so nothing moves.
- **D-09** The summary renders on the server, from the map input the loader
  already returned: its counts, the frameworks, and the first
  `SUMMARY_LIST_LENGTH` rows of each list. "Show all N" is a `Button` that
  reveals the rest in place. With no framework detected, the routes count
  reads "none found", not 0 (edge cases), since without an adapter no route
  can be found.
- **D-10** The Explanation tab holds an `EmptyState` saying explanations
  aren't available yet, until `009` fills it (FR-008).

## Layout values

| Name                | Value | Use                                                                                              |
| ------------------- | ----- | ------------------------------------------------------------------------------------------------ |
| `LIST_VIRTUAL_FROM` | 100   | A list longer than this renders only its rows in view                                            |
| Row height          | 32 px | A `SidebarMenuButton` (`h-8`) in a gapless `SidebarMenu`, so the virtualizer's estimate is exact |

## Stack notes

- TanStack Virtual measures nothing on the server; a virtualized list
  renders on the client only. A list grows past `LIST_VIRTUAL_FROM` only
  after a selection or a "Show all", both in the browser, so the
  server-rendered summary is never virtualized and nothing shifts.
- Vitest resolves the app's `@/` imports from `tsconfig.json`, as Vite does
  (`resolve.tsconfigPaths`), so a test can render a component that imports
  others.
- Base UI's `Tabs` and `ToggleGroup` are controlled with `value` and
  `onValueChange`; the pane holds both values, so a new selection never
  resets them.
- React context re-renders every reader on change; the hovered file lives in
  its own store, not in the map state, so a pointer moving across the pane
  doesn't re-render the map.

## Testing

- Vitest on `@workspace/graph`: the walk on a cycle (AC-06), reversed edges
  (AC-10), every level counted with the levels adding up to the total
  (AC-11), a type-only edge (AC-12), the summary's lists and their order, the
  roles in a box, a panel listing a selected file past the limit, and each
  file's fan-in and fan-out equal to its lists (AC-03).
- The summary's heading and its first `SUMMARY_LIST_LENGTH` rows (AC-13) are
  checked by rendering it with `react-dom/server`, as `003`'s banner is.
- Before review, in headless Edge over the DevTools protocol: no console
  errors; selecting, hovering and walking make no request (AC-02); a long
  list scrolls and stays under the interaction threshold on a generated
  repository of `MAX_FILES` files.
- In a browser, on the preview deployment: AC-01, AC-02, AC-04, AC-05 and
  AC-07 to AC-09, each as its row says.

## Risks

- A file at the centre of a large repository returns thousands of files →
  deeper levels start closed (D-03) and long lists are virtualized (D-06).
- The map input grows, and with it the page → the three new fields are
  numbers and a short list of names; the sample is regenerated and its size
  checked against `003`'s 55 KB.
