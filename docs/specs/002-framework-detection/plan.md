# 002 — Framework detection: plan

**Spec:** [spec.md](spec.md)
**Status:** Approved

## Approach

Detection is a new package, `packages/frameworks` (`@workspace/frameworks`).
It reads the parser's result (`001`) and the same directory on disk, and
returns each package's framework, each file's role and entry-point flag, the
routes, and the analysis's taxonomy, as one result checked by a Zod schema.
The parser stays as it is: it knows no framework (`002` C-05).

`detectFrameworks(directory, parsed)` runs a fixed pipeline: find the
packages, pick an adapter for each from its manifest, let the adapter give
roles, entry points and routes to its package's files, add the entry points
every package has (`002` FR-007), and merge the taxonomies. A command,
`pnpm --filter @workspace/frameworks detect <directory>`, parses and detects
in one go and prints the counts.

Like the parser, the package has no build step: Node.js 24 runs its
TypeScript directly (`001` plan D-05).

## Modules and interfaces

| Module                                  | What it does                                                                                                                                                                                                                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/taxonomy.ts`                       | The taxonomy entry point, `@workspace/frameworks/taxonomy`: tiers, the Unidentified role, every framework's taxonomy and `mergeTaxonomies`. It imports only taxonomy data, so the interface reads it without a parser or a file system (`002` C-02).                                |
| `src/adapter.ts`                        | The `Adapter` interface: a `taxonomy`, `recognises(manifest)`, and `describe(pkg)`, which returns each file's role, its framework's entry points and the routes.                                                                                                                    |
| `src/adapters/<framework>/`             | One folder per framework (`nextjs`, `nestjs`, `express`, `react`): `taxonomy.ts` (its roles by tier, data only) and `adapter.ts`. Framework names appear nowhere else (`002` C-05).                                                                                                 |
| `src/adapters/index.ts`                 | The adapters in the order of `002` FR-002, and the generic adapter; `taxonomies.ts` lists their taxonomies in the same order.                                                                                                                                                       |
| `src/packages.ts`                       | Finds the packages: the repository root, and each folder above a parsed file that holds a `package.json` (`002` FR-001); gives each file its innermost package; reads each manifest.                                                                                                |
| `src/manifest.ts`                       | A manifest's declared packages (`dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`) and the files it names: `main`, `module`, `browser`, `types`, every `exports` and `bin` target, and file paths in `scripts`.                                         |
| `src/conventions.ts`                    | The entry points every package has (`002` FR-007): manifest-named files, configuration files (`*.config.*`, `.*rc.*`) and test files (`*.test.*`, `*.spec.*`, `*-spec.*`, under `__tests__`).                                                                                       |
| `src/syntax.ts`                         | Parses a file with oxc-parser once, on first use, and caches it; helpers for literal strings, decorators, named exports, directives and calls.                                                                                                                                      |
| `src/detect.ts`, `src/index.ts`         | `detectFrameworks(directory, parsed)` runs the pipeline; `index.ts` exports it with the types.                                                                                                                                                                                      |
| `src/result.ts`                         | The contract: the Zod schema of the result (`schemaVersion: 1`), the types inferred from it, and `writeDetection` / `readDetection`.                                                                                                                                                |
| `src/cli.ts`                            | `detect <directory> [--out <file>]`: each package and its framework, role counts in taxonomy order, entry points, and the routes.                                                                                                                                                   |
| `scripts/golden.ts`                     | Detects the four golden repositories and prints their counts and routes beside the spec's golden data, held here too; exits 1 on any drift.                                                                                                                                         |
| `packages/golden` (`@workspace/golden`) | Shared by the parser's and this package's golden scripts: `checkout(repository, commit)` downloads an archive once into its git-ignored `.cache/`, and `compareCounts` prints counts beside the pinned ones. Moved out of the parser's script, since a second package now needs it. |

## Data

```ts
type Tier = "surface" | "layer" | "plumbing" | "unidentified"

type Detection = {
  schemaVersion: 1
  packages: Array<{
    path: string // relative, "/"-separated; "" for the repository root
    framework: string | null // the taxonomy's name, such as "NestJS"; null for none
  }>
  files: Array<{
    path: string // every parsed file, in the parser's order
    package: string // the path of its package
    role: string // a role of its package's taxonomy, or "Unidentified"
    entryPoint: boolean
  }>
  routes: Array<{
    method: string // "GET", "POST", …
    path: string // the full path, in the framework's own notation
    file: string
    line: number
  }>
  taxonomy: Array<{ role: string; tier: Tier; files: number }> // merged, fixed order
}
```

Every list is sorted (files by path, routes by path, then method, then
file), so the same repository gives byte-identical output (`001` FR-022).

## Decisions

- **D-01** A package of its own, beside the parser, reading the parser's
  result. _Why:_ framework knowledge stays out of the parser (`002` C-05);
  `008` runs the two in turn on the same directory. _Rejected:_ adding syntax
  facts (decorators, exports, directives) to the parser's result, which
  would grow its contract for one reader and re-parse nothing less.
- **D-02** Adapters re-parse the files they read, once each, with the
  parser's oxc-parser version from the catalog. _Why:_ the parser's result
  holds no syntax tree, and parsing is fast (`001`: 4,980 files in about 6 s
  with resolution). _Rejected:_ text searches, which match comments and
  strings (`001` FR-008).
  A parsed tree takes about 17 times its source on the heap (measured on
  three golden repositories, 2026-10-17), so the cache holds at most
  16 million characters of source, about 280 MB: a typical repository fits
  whole; past that, the files used longest ago are parsed again if asked.
  Each file's calls are indexed in one walk, on the first lookup, so an
  adapter asking for several call names walks the file once.
- **D-03** A package is any folder above a parsed file that holds a
  `package.json`, plus the root. _Why:_ it covers workspace packages and the
  repositories that keep `client/` and `server/` apps without declaring a
  workspace; files under excluded paths (`001` FR-002) are never parsed, so
  installed packages never become packages.
- **D-04** Each adapter recognises its package by a declared package:
  `next`, `@nestjs/core`, `express`, `react`. _Why:_ a manifest is in every
  archive, installed or not (`002` C-07). The order of `002` FR-002 makes the
  overlaps right: a Next.js app also declares `react`, and a NestJS app often
  declares `express` as its HTTP platform.
- **D-05** Syntax is matched by what it imports, not by name alone: a
  `@Controller` decorator counts only when imported from `@nestjs/common`,
  `NestFactory` only from `@nestjs/core`. _Why:_ a repository's own `@Get`
  decorator must not become a route (`002` C-01).
- **D-06** Route gaps fail closed. A Next.js `basePath`, and a NestJS global
  prefix, its `exclude` list, `enableVersioning` options and controller and
  method paths, are read only when every value is a literal; any other value,
  a `RouterModule` path, or an `exclude` pattern with wildcards or parameters
  means no route for the controller, or the package, it touches. The prefix
  and versioning are read only on the variable `NestFactory.create` returned;
  a call on anything else might be the same application, so it also means no
  routes, never routes that could miss a prefix (CodeRabbit review on PR 8).
  _Why:_ exact or absent (`002` C-01, FR-017).
- **D-07** Shared test and script helpers, by package name: the parser
  exports its syntax helpers (one language rule, line numbers, literals) at
  `@workspace/parser/syntax` and `makeRepository` at
  `@workspace/parser/testing`, and the golden
  download moves to `@workspace/golden`. _Why:_ one source for each concern
  (AGENTS.md), and a package never reaches into another by a relative path.
- **D-08** AC-06 is a test that searches each source file's strings and
  comments, leaving out module paths, for every framework's names (its
  display name and its packages): the parser must hold none, and each name
  only its own adapter folder. _Why:_ those are where framework knowledge
  would show; `./nextjs/adapter.ts` only points at an adapter.
- **D-09** A test file takes no role, whatever its folder or name, in one
  place for every adapter. _Why:_ the first golden run gave Express tests
  under `tests/unit/models/` the role Models (`002` FR-005).

## Stack notes

- oxc-parser's ESTree output keeps TypeScript decorators on classes and
  methods (`decorators`, each a call with literal `arguments`) and marks a
  directive with `directive: "use server"` on the program's first statement.
- Next.js 16 renamed `middleware` to `proxy` and deprecated the old name
  ([Next.js: proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy));
  both are read. The file conventions follow
  [Next.js: project structure](https://nextjs.org/docs/app/getting-started/project-structure).
- NestJS builds a route's address from the
  [global prefix](https://docs.nestjs.com/faq/global-prefix),
  [URI versioning](https://docs.nestjs.com/techniques/versioning) (prefix `v`
  unless set) and the
  [controller and method paths](https://docs.nestjs.com/controllers).

## Testing

- Vitest at the seams, each test building a small repository with the
  parser's `makeRepository`: packages and the generic adapter (AC-04, AC-11,
  AC-14), the taxonomy and its order (AC-09, and C-02 by its imports), each
  adapter's roles, entry points and routes (AC-05, AC-07, AC-08, AC-10,
  AC-12, AC-13), and the boundaries (AC-06).
- By hand, in the golden task: the role counts of the four golden
  repositories against their trees, and three NestJS routes against the code
  (AC-01, AC-02, AC-03).

## Risks

- Conventions are wider than the ones read → a file gets Unidentified, never
  a wrong role; `009` infers roles for those later.
- A framework's next release renames a file convention (as `middleware`
  became `proxy`) → the adapter reads both, and the golden runs catch a
  repository that moves.
