# 001 — Repository parser: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** Done

## T01 — The package and the walk

**Status:** Done
**Blocked by:** none
**Covers:** FR-001, FR-002, FR-003, FR-005, FR-006, FR-007, FR-018, FR-023,
AC-02, AC-08, AC-10

**What to build:** `packages/parser` and a `parse <directory>` command that
lists the files found, parsed, skipped and excluded, with each file's folder,
lines and hash.

**Done when:**

- [x] `@workspace/parser` exists with its own lint, typecheck and test, and
      oxc pinned in the catalog.
- [x] Excluded directories and symbolic links are recorded with their
      reasons; files over `MAX_FILE_BYTES` are skipped as "too large".
- [x] Over `MAX_FILES`, the result is `tooLarge` and nothing is parsed.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T02 — Imports

**Status:** Done
**Blocked by:** T01
**Covers:** FR-004, FR-008, FR-009, FR-010, FR-014, AC-11, AC-12, AC-15

**What to build:** every file's imports (static, re-export, dynamic, require),
each with its line and type-only flag; files with parse errors skipped.

**Done when:**

- [x] Imports in strings and comments are never recorded.
- [x] Non-literal dynamic imports and `require()` calls are unresolved with
      "not a literal".
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — Resolution

**Status:** Done
**Blocked by:** T02
**Covers:** FR-011, FR-012, FR-013, AC-04

**What to build:** each import resolved to resolved, external, excluded or
unresolved, with a reason when unresolved.

**Done when:**

- [x] Relative paths, index files, extensions, `.js` → `.ts`, tsconfig
      `paths` and `extends`, built-ins, packages and non-source files resolve
      as the plan's D-03 orders them.
- [x] Workspace packages resolve to their source, including through
      `outDir` → `rootDir`; otherwise "points at build output".
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — Edges and counts

**Status:** Done
**Blocked by:** T03
**Covers:** FR-015, FR-016, FR-017, AC-13, AC-16

**What to build:** one edge per ordered pair of files, its kinds, its
type-only flag; each file's fan-in and fan-out.

**Done when:**

- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — Coverage

**Status:** Done
**Blocked by:** T04
**Covers:** FR-019, FR-020, AC-14

**What to build:** imports by resolution and by reason, with examples, and the
coverage figure; "no imports found" for an empty directory.

**Done when:**

- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T06 — The result

**Status:** Done
**Blocked by:** T05
**Covers:** FR-021, FR-022, AC-05, AC-06

**What to build:** the result's schema and version, written to a file and read
back, byte-identical across runs.

**Done when:**

- [x] `parse <directory> --out <file>` writes it; `readResult` checks it.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T07 — Golden runs and hand checks

**Status:** Done
**Blocked by:** T06
**Covers:** AC-01, AC-03, AC-07, AC-09

**What to build:** the parser proven on real repositories.

**Done when:**

- [x] `scripts/golden.ts` fetches date-fns and express at their pinned commits
      and parses them.
- [x] AC-01 (this repository), AC-03 (date-fns) and AC-07 (express) pass, and
      five files from each are checked by hand against their real imports.
- [x] The counts are pinned in the spec's golden data.
- [x] A timed parse confirms `MAX_FILES` = 5,000 fits within
      `MAX_RUN_SECONDS`.
- [x] AC-09: the package and import check passes.

**Checked by hand (2026-10-16):** each file's imports against its source.

- This repository: `apps/web/src/routes/__root.tsx`, `apps/web/src/server.ts`,
  `apps/web/vite.config.ts`, `packages/parser/src/parse.ts`,
  `packages/parser/scripts/golden.ts`.
- date-fns: `pkgs/core/src/index.ts`, `pkgs/core/src/addDays/index.ts`,
  `pkgs/core/src/fp/addDays/index.ts`, `pkgs/core/src/format/index.ts`,
  `pkgs/tz/src/index.ts`, `pkgs/core/test/formatISO/india.ts`.
- express: `index.js`, `lib/express.js`, `lib/application.js`,
  `lib/view.js`, `examples/mvc/index.js`.

Imports in comments (JSDoc examples) were rightly left out, and multi-line
imports carry the line their statement starts on. The first golden parse found
two defects, fixed before pinning: a tsconfig that `extends` a workspace
package failed every import in its files, built-ins included (plan D-02); and
`build/` directories holding source were excluded as build output (plan,
`src/walk.ts`).

## T08 — Acceptance

**Status:** Done
**Blocked by:** T07
**Covers:** AC-01 to AC-16

**Done when:**

- [x] Every acceptance criterion passes, each checked the way its row says.
- [x] Build status at the top of this file set to Done.
