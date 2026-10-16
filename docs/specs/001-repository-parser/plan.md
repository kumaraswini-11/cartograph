# 001 — Repository parser: plan

**Spec:** [spec.md](spec.md)
**Status:** Approved

## Approach

The parser is a new package, `packages/parser` (`@workspace/parser`), with no
dependency on the app, a UI library, storage or the network (`001` C-01). One
function, `parseRepository(directory)`, runs a fixed pipeline: walk the
directory, extract each file's imports with
[oxc-parser](https://oxc.rs/docs/guide/usage/parser.html), resolve each import
with [oxc-resolver](https://github.com/oxc-project/oxc-resolver), build the
edges, count the coverage, and return one result whose shape is checked by a
Zod schema. A command, `pnpm --filter @workspace/parser parse <directory>`,
prints the counts and can write the result to a file.

The package has no build step: Node.js 24 runs its TypeScript directly, and
the app's bundler reads the same source when `008` imports it.

This repository sets `MAX_FILES` = 5,000. In T07 a parse of 4,980 files (two
copies of date-fns and ten of express) took 5.6 to 6.9 s with a peak of
380 MiB on a development machine, against `MAX_RUN_SECONDS` = 300 (`000`) and
the 2 GB / 1 vCPU every Hobby function runs with
([Vercel: memory and CPU](https://vercel.com/docs/functions/configuring-functions/memory)).
The headroom is left for fetching the archive (`008`).

## Modules and interfaces

| Module                         | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/limits.ts`                | `MAX_FILES`, `MAX_FILE_BYTES`, `COVERAGE_EXAMPLES`: one source for each.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/walk.ts`                  | Lists the directory: every `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs` and `.cjs` file, in path order. Skips excluded directories (installed packages, build output, version control, tool caches) and symbolic links, recording each with its reason. `dist`, `build`, `out` and `coverage` are build output only at a package root (the directory parsed, or one holding a `package.json`), since repositories also use the words for source (`scripts/build/`). Stops at `MAX_FILES`. Paths are relative, with `/` on every OS. |
| `src/extract.ts`               | Parses one file with oxc-parser and returns its imports, found in one pass of its `Visitor`: static imports, re-exports, dynamic imports, `require()` calls and TypeScript's `import x = require()` and `import("x")` types, each with the line its statement starts on and its type-only flag. A file with parse errors is skipped with the first error as its reason.                                                                                                                                                                     |
| `src/resolve.ts`               | Resolves one import from one file to a resolution: resolved, external, excluded or unresolved, with a reason when unresolved. Wraps oxc-resolver with the repository's tsconfig files and a map of its workspace packages. When a file's tsconfig can't load, that import resolves without it (D-02).                                                                                                                                                                                                                                       |
| `src/workspace.ts`             | Finds the repository's workspace packages (from `pnpm-workspace.yaml` or the `workspaces` field of `package.json`) and maps each name to its directory, and each package's build output back to its source.                                                                                                                                                                                                                                                                                                                                 |
| `src/graph.ts`                 | Turns resolved imports into edges, one per ordered pair of files, keeping every kind behind it; computes fan-in and fan-out.                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/coverage.ts`              | Counts files found, parsed and skipped; imports by resolution and by reason, with up to `COVERAGE_EXAMPLES` examples each; and the coverage figure.                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/result.ts`                | The contract: the Zod schema of the result (`schemaVersion: 1`), the TypeScript types inferred from it, and `writeResult` / `readResult`, which checks the schema on read.                                                                                                                                                                                                                                                                                                                                                                  |
| `src/parse.ts`, `src/index.ts` | `parseRepository(directory)` runs the pipeline; `index.ts` exports it with the types.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/cli.ts`                   | `parse <directory> [--out <file>]`: prints the counts in `001` FR-018 and FR-019, and writes the result if asked.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `scripts/golden.ts`            | `pnpm --filter @workspace/parser golden`: downloads each golden repository's archive at its pinned commit into `.cache/golden/` (git-ignored; unpacked with the system `tar`), parses it, prints the counts beside the spec's golden data, held here too, and exits 1 on any drift. The network belongs to this script, never to the parser.                                                                                                                                                                                                |

## Data

```ts
type ParseResult = {
  schemaVersion: 1
  files: Array<{
    path: string // relative, "/"-separated
    folder: string // the directory that holds it; "" for the root
    lines: number
    hash: string // SHA-256 of the content, hex
    fanIn: number
    fanOut: number
  }>
  skipped: Array<{ path: string; reason: string }>
  excluded: Array<{ path: string; reason: string }> // directories and links
  imports: Array<{
    from: string
    line: number
    specifier: string // as written; "" when not a literal
    kind: "static" | "re-export" | "dynamic" | "require"
    typeOnly: boolean
    resolution: "resolved" | "external" | "excluded" | "unresolved"
    to?: string // when resolved
    reason?: UnresolvedReason // when unresolved: "not a literal" | "not found" | "points at build output" | "not exported" | "case mismatch"
  }>
  edges: Array<{
    from: string
    to: string
    kinds: Array<"static" | "re-export" | "dynamic" | "require">
    typeOnly: boolean
  }>
  coverage: {
    filesFound: number
    filesParsed: number
    filesSkipped: number
    imports: Record<"resolved" | "external" | "excluded" | "unresolved", number>
    unresolvedByReason: Array<{
      reason: UnresolvedReason
      count: number
      examples: Array<{ file: string; line: number; specifier: string }>
    }>
    figure: number | null // resolved / (resolved + unresolved); null with no imports
  }
}
```

A repository over `MAX_FILES` returns `{ schemaVersion: 1, tooLarge: { files, maxFiles } }`
instead, and nothing is parsed (`001` FR-005).

## Decisions

- **D-01** oxc-parser and oxc-resolver, pinned exactly (`0.154.0`, `11.24.2`).
  _Why:_ native speed for `MAX_FILES` within `MAX_RUN_SECONDS`; oxc reports
  imports, re-exports and their type-only flags without a separate walk;
  oxc-resolver ports enhanced-resolve and resolves tsconfig `paths`,
  `extends` and project references, choosing the right tsconfig per file; Vite
  8's bundler, Rolldown, is built on Oxc. _Rejected:_ the TypeScript compiler
  API (slower, resolution by hand) and Babel with enhanced-resolve (tsconfig
  paths need a plugin); compared on 2026-10-16.
- **D-02** The repository's workspace packages are mapped by the parser, not
  found in `node_modules`. _Why:_ a fetched archive (`008`) has no
  `node_modules`. Names come from the workspace globs; an import of a
  workspace package resolves through its `exports` or `main` to source, and
  when those point at build output, through the package's tsconfig
  `outDir` → `rootDir` to the file it's built from (`.js` to `.ts`). A
  tsconfig that `extends` a workspace package is read the same way. oxc can't
  load such a tsconfig without `node_modules` and fails the whole import, so
  that import is resolved again without the tsconfig, as TypeScript keeps a
  config's own options when its `extends` is missing (found on date-fns in
  T07). _Rejected:_ resolving through `node_modules` symlinks, which exist only
  after an install.
- **D-03** Imports classify in this order: a Node.js built-in → external; a
  path that resolves inside the directory → resolved (a parsed file),
  excluded (an excluded path, or a non-source file such as CSS or JSON), or
  outside → external; a bare package name that isn't a workspace package and
  matches no tsconfig `paths` pattern → external; anything else → unresolved,
  with the reason. _Why:_ an unresolved import must be a real gap, never a
  package the parser simply can't see (`001` C-04).
- **D-04** The result has no absolute paths, timestamps or machine details,
  and every list is sorted. _Why:_ byte-identical output for the same content
  (`001` FR-022).
- **D-05** No build step: Node.js 24 runs the TypeScript source, so the code
  uses only erasable syntax (`erasableSyntaxOnly`) and imports with `.ts`
  extensions. _Why:_ the package runs from a plain script (`001` FR-023,
  C-01), and the app's bundler reads the same files. _Rejected:_ compiling to
  `dist/`, a second artifact to keep in step.

## Stack notes

- oxc-parser's module record lists static imports and exports but not
  `require()` calls, so the parser reads every kind from one `Visitor` pass
  over the syntax tree instead of mixing the two. Its positions are UTF-16
  offsets, matching JavaScript strings.
- oxc-parser and oxc-resolver ship native binaries as optional dependencies,
  one per platform; pnpm installs the one for the machine, so Vercel's Linux
  build gets its own. They run no install scripts.
- TypeScript's ESM convention imports `./x.js` for `./x.ts`; the resolver's
  `extensionAlias` maps `.js` to `.ts`, `.tsx` and `.js` (and `.mjs`, `.cjs`
  likewise).

## Testing

- Vitest at the module seams, each test building its own small repository in
  a temporary directory: walking and exclusion (AC-02, AC-08, AC-10, AC-11),
  extraction (AC-11, AC-12, AC-15), resolution, including tsconfig paths,
  extension aliases, workspace packages and build output (AC-04), edges and
  counts (AC-13, AC-16), coverage (AC-14), and the result (AC-05, AC-06).
- AC-09: a test reads the package's dependencies and its imports, and fails on
  anything outside oxc, Zod and Node.js built-ins.
- By hand, in T07: this repository (AC-01), date-fns (AC-03) and express
  (AC-07), with five files from each checked against what the parser claims
  they import (the project doc's first ship criterion).

## Risks

- oxc is pre-1.0 and releases often → pinned exactly; an upgrade is a pull
  request that reruns the golden counts.
- A repository whose tsconfig the resolver reads differently from TypeScript
  → the golden runs and the hand checks catch it; the gap is reported as an
  unresolved reason, never as a silent edge.
- Very large files slow the walk → `MAX_FILE_BYTES` skips them before reading.
