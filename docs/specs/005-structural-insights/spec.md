# 005 — Structural insights

**Status:** Approved
**Milestone:** M2 Explorer
**Depends on:** 002-framework-detection, 004-detail-pane

## Summary

Someone sees the facts the edges reveal (import cycles, unimported files,
heavily imported files and oversized files) and the repository's routes, each
stated plainly and none of them a grade.

This product explains a repository; it does not review one. Once there's a
number, people argue with the number instead of reading the map
(`docs/project-doc.md`, out of scope). So each insight is a fixed sentence
about the edges, and no model is involved.

## Requirements

### Insights

- **FR-001** The system shall find four kinds of insight from the edges:
  unimported files, heavily imported files, cycles and oversized files.
- **FR-002** The system shall report a file as unimported when it has no
  dependents, is not an entry point, and has a role other than Unidentified.
- **FR-003** The system shall report a file as heavily imported when its fan-in
  is at least `HEAVY_FAN_IN` = 15.
- **FR-004** The system shall report an oversized file when its line count is
  at least `OVERSIZED_LINES` = 500.
- **FR-005** The system shall report each cycle of runtime edges once, as the
  files on it in order, starting from the file whose path sorts first.
- **FR-006** Each insight shall be stated in its kind's one fixed sentence,
  naming the files and the number behind it:

  | Kind             | Sentence                                               |
  | ---------------- | ------------------------------------------------------ |
  | Unimported       | No file imports `{file}`, and it isn't an entry point. |
  | Heavily imported | `{fan-in}` files import `{file}`.                      |
  | Cycle            | A cycle of `{n}` files: `{a}` → `{b}` → … → `{a}`.     |
  | Oversized        | `{file}` has `{lines}` lines.                          |

  With one file, a cycle reads "A cycle of 1 file: `{a}` → `{a}`."

- **FR-007** The insights shall be listed in the order unimported files, heavily
  imported files, cycles, oversized files.
- **FR-008** The insights shall sit in a section of the detail pane that starts
  collapsed.
- **FR-009** When a file named in an insight is chosen, the map shall move the
  selection to it.

### Routes

- **FR-010** The system shall show the analysis's routes as a table of method,
  path pattern and the file that declares it.
- **FR-011** When a route's file is chosen, the map shall move the selection to
  it.
- **FR-012** If the analysis has no routes, then the table shall say why: no
  routes in the code, or a framework whose routes can't be recovered exactly.

## Constraints

- **C-01** No model anywhere in this spec. _Why:_ an insight is a fact about the
  edges, never a judgement. _Looks fine until:_ a model is asked to "summarise
  the issues".
- **C-02** An entry point is never unimported, and neither is a file no
  convention identifies. _Why:_ pages, routes, layouts, middleware and
  configuration are reached by the framework, not by imports, and tests,
  examples and scripts are reached by tools whose configuration can name
  anything; reporting them would present the limits of the parser's view as
  a finding about the code. _Looks fine until:_ every page of a Next.js
  repository is listed as unused, or a library's tests are (measured on the
  golden repositories: 339 files in date-fns and 104 in Express, nearly all
  of them tests and examples).
- **C-03** Cycle finding is iterative, never recursive. _Why:_ a real
  repository is deep enough to overflow a call stack. _Looks fine until:_ the
  small fixture.
- **C-04** Insights are never the first thing shown. _Why:_ leading with them
  turns an explanation into a review. _Looks fine until:_ the section opens
  expanded "because it's useful".
- **C-05** No scores, grades, severities or "N issues found". _Why:_ the out of
  scope list in `docs/project-doc.md`. _Looks fine until:_ a count of insights appears as a badge on the pane's header.

## Edge cases

- A file importing itself → a cycle of one file.
- A cycle only through type-only edges → not reported (FR-005 covers runtime
  edges).
- A repository with no insights of a kind → that kind is omitted, not shown as
  zero.
- The same file oversized and heavily imported → listed under both kinds.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                                                                                                 | Covers               | Verified by |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------- |
| AC-01 | Given a file nothing imports that isn't an entry point, when insights are found, then it's listed as unimported                                                                                     | FR-002               | test        |
| AC-02 | Given a page nothing imports, and an Unidentified file nothing imports, when insights are found, then neither is listed as unimported                                                               | FR-002, C-02         | test        |
| AC-03 | Given a repository with a real cycle, when insights are found, then the cycle is listed, and walking it by hand confirms it                                                                         | FR-005               | terminal    |
| AC-04 | Given a chain of edges deeper than the call stack allows, when cycles are found, then it completes                                                                                                  | C-03                 | test        |
| AC-05 | Given the detail pane loaded, when it's first shown, then the insights section is collapsed                                                                                                         | FR-008, C-04         | browser     |
| AC-06 | Given a NestJS analysis, when its routes table is shown, then three routes checked by hand match the code exactly                                                                                   | FR-010               | browser     |
| AC-07 | Given an Express analysis, when its routes table is shown, then it says Express routes can't be recovered exactly                                                                                   | FR-012               | browser     |
| AC-08 | Given every insight sentence, when they're compared with the four fixed sentences, then each matches one exactly                                                                                    | FR-006, C-01, FR-001 | test        |
| AC-09 | Given files with `HEAVY_FAN_IN` - 1 and `HEAVY_FAN_IN` dependents, and with `OVERSIZED_LINES` - 1 and `OVERSIZED_LINES` lines, when insights are found, then only the second of each pair is listed | FR-003, FR-004       | test        |
| AC-10 | Given insights of every kind, when they're listed, then the order is unimported, heavily imported, cycles, oversized                                                                                | FR-007               | test        |
| AC-11 | Given a file named in an insight or a route, when it's chosen, then the map's selection moves to it                                                                                                 | FR-009, FR-011       | browser     |

## Out of scope

- Recovering routes → `002`.
- Explaining why a file is heavily imported → `009`.

## Open questions

None. Resolved 2026-10-17, measured on the six golden repositories:
`HEAVY_FAN_IN` = 15, a fixed number (0 to 24 files per repository; a top-2%
rule fell to a fan-in of 7 in small ones), and `OVERSIZED_LINES` = 500 (0 to
13 files); unimported files are those with a role (C-02), which leaves the
real findings and drops hundreds of tool-run files; the four sentences are
in FR-006.
