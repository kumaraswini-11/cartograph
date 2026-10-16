# 005 — Structural insights: plan

**Spec:** [spec.md](spec.md)
**Status:** Approved

## Approach

The insights are arithmetic over the map input, so they join
`@workspace/graph` as pure functions: unimported, heavily imported and
oversized files from each file's counts and role, and cycles from the runtime
edges. Each insight carries the parts of its fixed sentence, so the sentence
is written once, tested once and drawn by the pane with its files clickable.

Routes come from detection, which already recovers them (`002`). What's new
is saying why a table is empty, and that knowledge belongs to the adapters:
framework names live only in their own folders (`002` C-05). So each
package's detection records whether its routes were recovered exactly, and
the map input carries the routes and the frameworks whose routes weren't.

Two more golden repositories become samples, NestJS and Express, so the
routes table is checked on both in the browser (AC-06, AC-07).

## Modules and interfaces

| Module                                                 | What it does                                                                                                                                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/graph/src/insights.ts`                       | `insights(input)`: every insight, in the order of FR-007, each kind in path order. `cycles(edges)`: the runtime cycles (D-03). `sentenceOf(insight)`: its fixed sentence as parts, text and files (FR-006).                                                         |
| `packages/graph/src/limits.ts`                         | `HEAVY_FAN_IN` = 15 and `OVERSIZED_LINES` = 500.                                                                                                                                                                                                                    |
| `packages/graph/src/input.ts`                          | `toMapInput` carries the routes themselves (method, path, file, line), not their count, and the frameworks whose routes weren't recovered.                                                                                                                          |
| `packages/frameworks`                                  | Each adapter's description says whether its routes were recovered exactly (D-02); the detection result records it per package. Schema version 2.                                                                                                                    |
| `apps/web/scripts/sample.ts`, `src/sample/`            | Three samples: `shadcn-ui/taxonomy`, `lujakob/nestjs-realworld-example-app` and `hagopj13/node-express-boilerplate`, each at its golden commit, one generated module each. The script prints each sample's insights, which is how AC-03's cycle is checked by hand. |
| `apps/web/src/routes/sample.$name.tsx`, `lib/sample.*` | `/sample/$name`, the server function taking the sample's name (validated against the three), and `/sample` leading to the first. The home page links to all three.                                                                                                  |
| `apps/web/src/components/detail/insights.tsx`          | The insights section of the summary: collapsed at first (FR-008, C-04), with no count anywhere (C-05); one list per kind present, each insight its sentence, every file in it a button that selects it (FR-009).                                                    |
| `apps/web/src/components/detail/routes-table.tsx`      | The routes: shadcn `Table` of method, path and file (FR-010); the file selects (FR-011); with none, the reason (FR-012).                                                                                                                                            |

## Data

```ts
// @workspace/graph
type Insight =
  | { kind: "unimported"; file: string }
  | { kind: "heavily imported"; file: string; fanIn: number }
  | { kind: "cycle"; files: Array<string> } // in order, first-sorting file first
  | { kind: "oversized"; file: string; lines: number }

type SentencePart = string | { file: string }

// MapInput, changed from 004
type MapInput = {
  // …
  routes: Array<{ method: string; path: string; file: string; line: number }>
  /** Frameworks detected whose routes can't be recovered exactly (002). */
  routesNotRecovered: Array<string>
}

// Detection's PackageRecord, schema version 2
type PackageRecord = {
  path: string
  framework: string | null
  /** Whether its routes were recovered exactly (none to recover counts). */
  routesRecovered: boolean
}
```

## Decisions

- **D-01** Insights are computed in `@workspace/graph`, on the server for the
  summary's first HTML and wherever else they're asked for, from the map
  input alone. _Why:_ the project doc keeps graph arithmetic pure; the chat
  (`010`) will look the same facts up. No model anywhere (C-01).
- **D-02** An adapter says whether it recovered every route exactly:
  Next.js unless an endpoint gives no route (a `pages/api` handler, an
  intercepting segment, a base path that isn't a literal, or no method
  exported by name); NestJS unless its settings, or a controller's or a
  method's path, aren't literals (`002` plan D-06), so a route is left out;
  Express never (`002` C-06); React never (a client router's routes are
  configuration); the generic adapter has no framework, so nothing to say.
  The detection result records it per package (schema version 2), and the
  map input lists the frameworks whose packages weren't recovered. Every
  route, not only the readable ones: a table missing one would otherwise
  read as complete, as taxonomy's `pages/api/auth/[...nextauth].ts` did
  (CodeRabbit review on PR 11). _Why:_ only an adapter
  knows its framework (`002` C-05); the interface then names it in one
  sentence without knowing anything about it. _Rejected:_ the interface
  recognising "Express" by name, which `002` C-05 forbids.
- **D-03** Cycles: the runtime edges' strongly connected groups, found with
  Tarjan's algorithm written iteratively (C-03); in each group, the
  shortest cycle through its first-sorting file, then through the next file
  on no cycle named yet, until every file of the group is on one (each a
  breadth-first search inside the group). Each cycle is listed from its
  first-sorting file and named once; a file that imports itself is a cycle
  of one. _Why:_ a group can hold exponentially many cycles (Johnson's
  algorithm lists them all, in exponential time), so listing them all can't
  be bounded; this names every file that's on a cycle with at most one
  search per file. One cycle per group was tried first and hid a file: in
  the NestJS golden repository, `article.entity.ts` loops with both
  `comment.entity.ts` and `user.entity.ts`, and only the first loop was
  named. _Rejected:_ every elementary cycle; one per group; a group's files
  in sorted order, which isn't a path someone can walk.
- **D-04** A sentence is data: `sentenceOf` returns its parts, and the pane
  draws text as text and files as buttons that select them. The test joins
  the parts and compares them with FR-006's four sentences, word for word
  (AC-08). Plurals use `countOf` (004).
- **D-05** The insights section is a shadcn `Collapsible`, closed until
  opened, holding one list per kind present, in FR-007's order. Each list
  shows `SUMMARY_LIST_LENGTH` sentences and "Show all" for the rest, like the
  summary's lists. No count appears in the section's heading or anywhere in
  it, so it never reads as "N issues found" (C-05); a kind with none is left
  out (edge cases).
- **D-06** The routes table: shadcn `Table` in its own section of the
  summary, ordered by path then method, the file shown as the pane's paths
  are and choosing it selects the file (FR-011). Past `SUMMARY_LIST_LENGTH`
  rows, "Show all". With no routes, one sentence instead: "No routes in the
  code." or "{framework} routes can't be recovered exactly." (FR-012). With
  some, a framework's routes left out are said under the table: "{framework}
  routes that can't be recovered exactly aren't listed." The summary's
  "Routes" count reads the same way.
- **D-07** Three samples at `/sample/$name`, generated by one script from the
  golden repositories, each its own server-only module, so a page loads only
  the sample it shows. `/sample` leads to taxonomy, and the home page lists
  all three. _Why:_ AC-06 and AC-07 need NestJS and Express analyses in the
  browser until `008` stores real ones, and the map and pane are then checked
  on three frameworks instead of one.

## Testing

- Vitest on `@workspace/graph`: unimported with and without a role or an
  entry point (AC-01, AC-02), the thresholds at one below and at the value
  (AC-09), a chain of 100,000 edges and a cycle at its end (AC-04), a
  self-import, a type-only cycle left out, two groups, the order of kinds
  (AC-10), every sentence word for word (AC-08).
- Vitest on `@workspace/frameworks`: each adapter's `routesRecovered`, and
  NestJS's when its prefix isn't a literal.
- Terminal: the sample script prints the NestJS sample's cycle; walked by
  hand in its source (AC-03).
- Browser, headless with real mouse events, then on the preview: the
  section starts closed (AC-05), three NestJS routes against the code
  (AC-06), the Express sentence (AC-07), choosing a file from an insight and
  from a route (AC-11).

## Risks

- A large repository with many unimported or oversized files makes a long
  section → each kind shows `SUMMARY_LIST_LENGTH` and "Show all".
- The detection schema changes → nothing stores detection results yet
  (`008`); the samples are generated again, and the golden script compares
  counts and routes, which don't change.
