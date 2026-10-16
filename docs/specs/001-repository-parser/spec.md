# 001 — Repository parser

**Status:** Approved
**Milestone:** M1 Engine
**Depends on:** 000-platform-requirements

## Summary

Given a directory on disk, the parser returns its files, the edges between
them, its folders and its coverage, as one typed result every later spec
reads.

This is the rule everything rests on: every box and every line comes from
really parsing the code (`docs/project-doc.md`). An edge exists only because
an import resolved to a file. An import that can't be resolved is reported
with its reason, never dropped and never guessed.

## Requirements

### Input

- **FR-001** The parser shall take a path to a directory and read only that
  directory; it shall fetch nothing over the network.
- **FR-002** The parser shall treat every JavaScript and TypeScript source file
  in the directory as a file, except those under excluded paths (installed packages,
  build output, version-control metadata), which it shall record as excluded.
- **FR-003** If a file exceeds `MAX_FILE_BYTES` = 1 MB, then the parser shall record it
  as a skipped file with the reason "too large" and not read it.
- **FR-004** If a file can't be parsed, then the parser shall record it as a
  skipped file with the parse error as its reason.
- **FR-005** If the directory holds more than `MAX_FILES` files, then the
  parser shall stop and report the repository as too large, naming the count;
  it shall not parse a subset. `MAX_FILES` depends on the platform: the most
  files a run can fetch and parse within `MAX_RUN_SECONDS` (`000`).

### Files and folders

- **FR-006** The parser shall record for each file its path relative to the
  directory, its folder, its line count and a hash of its content.
- **FR-007** The parser shall record each file's folder as the directory that
  holds it, relative to the directory given.

### Imports and resolution

- **FR-008** The parser shall read imports with a real TypeScript and
  JavaScript parser, never with text matching.
- **FR-009** The parser shall record four kinds of import: a static import, a
  re-export, a dynamic import with a literal string, and a `require()` call
  with a literal string.
- **FR-010** The parser shall mark an import that exists only at compile time
  (`import type`, `export type`) as type-only.
- **FR-011** The parser shall resolve each import to exactly one resolution:
  resolved (a file in the directory), external (a package or a built-in),
  excluded (a path deliberately not parsed) or unresolved.
- **FR-012** The parser shall resolve relative paths, index files, file
  extensions, path aliases declared in the repository's own TypeScript or
  JavaScript configuration, and packages the repository itself contains
  (workspace packages) to the files they point at. A workspace package
  resolves to its source files, even when its manifest points at build output.
- **FR-013** When an import is unresolved, the parser shall record a reason for
  it.
- **FR-014** If an import uses a non-literal argument (a dynamic import or a
  `require()` of a variable), then the parser shall count it as unresolved
  with the reason "not a literal".

### Edges

- **FR-015** The parser shall create an edge from a file to another file only
  when an import of the first resolved to the second.
- **FR-016** The parser shall keep one edge per ordered pair of files, recording
  every kind of import that produced it; an edge is type-only only if every
  import behind it is type-only.
- **FR-017** The parser shall compute each file's fan-in and fan-out from the
  edges.

### Coverage

- **FR-018** The parser shall report files found, files parsed and files
  skipped, with a reason for every skipped file.
- **FR-019** The parser shall report every import by resolution, with counts
  per reason for unresolved imports and up to `COVERAGE_EXAMPLES` = 20 examples of
  each reason (file, line and the import as written).
- **FR-020** The parser shall report a coverage figure: resolved imports as a
  share of resolved plus unresolved imports. External and excluded imports are
  outside the figure.

### The result

- **FR-021** The parser shall return one result with a declared schema version
  and shall be able to write it to a file and read it back without losing
  information.
- **FR-022** The parser shall produce byte-identical output for the same
  directory content.
- **FR-023** The parser shall run from a single command with nothing else
  started, printing the counts in FR-018 and FR-019.

## Constraints

- **C-01** The parser knows no framework, interface or storage. _Why:_ layering
  is right only if the parser runs standalone (`docs/project-doc.md`).
  _Looks fine until:_ one convenient import of a storage client makes the
  parser impossible to run from a plain script.
- **C-02** No framework-specific check inside the parser. _Why:_ framework
  knowledge belongs to adapters (`002`). _Looks fine until:_ an
  `if (framework === …)` appears in resolution code.
- **C-03** File selection is structural, never "the largest N files". _Why:_
  that keeps a file and drops the leaf it imports, leaving edges that point at
  files that aren't there. _Looks fine until:_ a small demo repository, where
  nothing gets dropped.
- **C-04** Unresolved is a result, not an error. _Why:_ a map ninety percent
  right is worse than none, because nobody can tell which ten percent is
  wrong. _Looks fine until:_ a repository built on barrel files loses most of
  its edges and still renders a clean, confident map.
- **C-05** The result's shape is a contract. _Why:_ every later spec reads it.
  _Looks fine until:_ a consumer reshapes it to suit itself and every other
  consumer has to follow.

## Edge cases

- An empty directory → a result with zero files and a coverage figure of 100%
  of zero imports, reported as "no imports found", not as complete.
- A file that mixes `import` and `require()` → both are recorded, without a
  duplicate edge.
- A file imported both as a type and as a value → one edge, not type-only.
- A symbolic link → recorded as excluded with the reason "symbolic link"; it is
  never followed.
- An import of a file that exists but sits under an excluded path → excluded,
  not unresolved.
- A workspace package whose manifest points at build output that isn't in the
  directory → resolved to the source file that output is built from, when the
  package's own configuration maps one to the other; otherwise unresolved,
  with the reason "points at build output".

## Acceptance criteria

| ID    | Given / When / Then                                                                                                                                                                  | Covers             | Verified by |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ----------- |
| AC-01 | Given this repository, when the parser runs, then files parsed plus skipped equals files found, and every skipped file has a reason                                                  | FR-018, FR-023     | terminal    |
| AC-02 | Given files at `a.ts`, `a/b.ts` and `a/b/c/d.ts`, when the parser runs, then their folders are the root, `a` and `a/b/c`: the directory that holds each, never a coarser one         | FR-006, FR-007     | test        |
| AC-03 | Given a repository built on barrel files, when the parser runs, then re-exports found equal re-exports resolved, or every gap has a named reason                                     | FR-012, FR-013     | terminal    |
| AC-04 | Given a parsed repository, when a file an import points at is renamed and the parser re-runs, then there is exactly one more unresolved import and its reason names the missing file | FR-013             | test        |
| AC-05 | Given a result written to a file, when it's read back, then it equals the original and its types hold                                                                                | FR-021             | test        |
| AC-06 | Given the same directory, when the parser runs twice, then the two outputs are byte-identical                                                                                        | FR-022             | test        |
| AC-07 | Given a CommonJS repository, when the parser runs, then it draws edges from `require()` calls and the coverage figure has a non-zero denominator                                     | FR-009, FR-020     | terminal    |
| AC-08 | Given a directory with more than `MAX_FILES` files, when the parser runs, then it reports the repository as too large and parses nothing                                             | FR-005             | test        |
| AC-09 | Given the parser's source, when it is searched for framework, interface, storage or network code, then none is found                                                                 | C-01, C-02, FR-001 | test        |
| AC-10 | Given a directory holding installed packages and build output, when the parser runs, then their files are recorded as excluded, not parsed                                           | FR-002             | test        |
| AC-11 | Given a file over `MAX_FILE_BYTES` and a file with a syntax error, when the parser runs, then both are skipped, with "too large" and the parse error as reasons                      | FR-003, FR-004     | test        |
| AC-12 | Given an import written inside a string and inside a comment, when the parser runs, then neither is recorded as an import                                                            | FR-008             | test        |
| AC-13 | Given a type-only import, and a file imported both as a type and as a value, when the parser runs, then the first edge is type-only and the second isn't                             | FR-010, FR-016     | test        |
| AC-14 | Given a parsed repository, when imports by resolution are added up, then they equal all imports found, and each unresolved reason lists at most `COVERAGE_EXAMPLES` examples         | FR-011, FR-019     | test        |
| AC-15 | Given a dynamic import and a `require()` of a variable, when the parser runs, then both are unresolved with the reason "not a literal"                                               | FR-014             | test        |
| AC-16 | Given a file that imports the same file twice, when the parser runs, then there is one edge between them, and fan-in and fan-out each count it once                                  | FR-015..FR-017     | test        |

## Golden data

The counts are recorded by the first run that passes the hand checks in
`tasks.md`, then pinned here.

| Input                                                            | Why                                                                  | Expected                                                                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `date-fns/date-fns` @ `717ce0a807ea4c6b540d015b5c408723175b2838` | Barrel files: 1,785 JS/TS files, 1,241 of them `index` files (AC-03) | 1,785 files, all parsed; 5,333 edges; 757 re-exports, all resolved; coverage 99.6% (5,344 of 5,367)                               |
| `expressjs/express` @ `a419aa7350389a275ab45fde2e849ed1f02449ef` | CommonJS `require()` (AC-07)                                         | 141 files, all parsed; 153 edges; 403 `require()` calls: 159 resolved, 241 external, 3 not a literal; coverage 98.1% (159 of 162) |

Pinned on 2026-10-16. Every unresolved import is a named gap:

- date-fns, 23: 17 "points at build output" (examples importing the published
  package, whose `exports` name its built layout), 4 "not found" (tests of a
  `dist/` that exists only after a build), 2 "not a literal".
- express, 3: "not a literal" (`require(mod)` and similar).

## Out of scope

- Roles, entry points and routes → `002`.
- Fetching a repository onto disk → `008`.

## Open questions

None. Resolved 2026-10-16: `MAX_FILE_BYTES` = 1 MB and `COVERAGE_EXAMPLES` = 20;
`MAX_FILES` is set in the plan; the golden repositories above; workspace
packages resolve to their source files.
