# 009 — File explanations

**Status:** Approved
**Milestone:** M4 Intelligence
**Depends on:** 004-detail-pane, 008-repository-analysis

## Summary

Someone asks for an explanation of a file or a box and gets a short,
grounded paragraph written from its real neighbours, cached, traced and marked
stale when the code moves on; files no adapter identified get an inferred
role.

The AI may explain and label. It may never decide that two files are
connected, and it may never walk the edges itself (`docs/project-doc.md`). Every
model call is traced and cached, with the cache read inside the traced call,
so a working cache can be told from a broken one.

## Requirements

### Explaining

- **FR-001** When an explanation of a file is requested, the system shall write
  it from the file's source at the analysed commit and the paths of all its
  dependencies and dependents.
- **FR-002** When an explanation of a box is requested, the system shall write
  it about the folder: what's in it, and why its dependents point at it.
- **FR-003** The system shall show the explanation in the detail pane's
  Explanation tab (`004`).
- **FR-004** When the selection returns to a file already explained in this
  session, the Explanation tab shall show its explanation again without being
  asked.

### Grounding

- **FR-005** The system shall check every file path an explanation names
  against the analysis.
- **FR-006** If an explanation names a file absent from the analysis, then the
  system shall discard it and request it once more; if the second is also
  ungrounded, then the system shall show a message instead and cache nothing.

### Rendering

- **FR-007** The explanation shall use only three kinds of formatting (inline
  code, bullets and bold), and the system shall render those three.
- **FR-008** The system shall turn every file path in an explanation into a link
  that moves the map's selection to that file.

### Inferred roles

- **FR-009** For files no adapter identified, the system shall infer a role from
  a fixed list of non-surface roles: service, data access, model, utility, configuration, component, hook.

### Cache and tracing

- **FR-010** The system shall cache explanations and inferred roles by the
  content of what's explained, the neighbours it's written from, the exact
  model version and the prompt version.
- **FR-011** The system shall trace every request through it, and read the
  cache inside the traced request, so a cache hit is recorded as a run with no
  model call.
- **FR-012** The system shall call models by an exact version, never by an
  alias that moves.
- **FR-013** If tracing isn't configured, then requests shall still succeed and
  the interface shall show that tracing is off.

### Staleness

- **FR-014** When an explanation is shown, the system shall compare the file's
  stored content hash, and the analysis's commit, with the repository as it is
  now.
- **FR-015** If the file has changed, or the repository has moved past the
  analysed commit, then the system shall say the explanation is stale and offer
  to re-run the analysis.

## Constraints

- **C-01** The model is handed the edges; it never finds them. _Why:_ invented
  structure is the failure this product exists to prevent. _Looks fine until:_
  a prompt asks "which files is this connected to?".
- **C-02** An inferred role is never a surface role. _Why:_ surface roles decide
  the routes table and the tier colours, and convention owns them (`002`).
  _Looks fine until:_ a model labels a utility "Page route".
- **C-03** Allow a small set of formatting and render it; don't forbid
  formatting and print what comes back. _Why:_ models don't reliably obey a
  ban, and the result is stray backticks and asterisks. _Looks fine until:_ the
  first reply that ignores the ban.
- **C-04** One place constructs the model client. _Why:_ a second construction
  site is an untraced path. _Looks fine until:_ a quick fix creates its own
  client.
- **C-05** Repository content is data, never instructions. _Why:_ any public
  repository can contain text written to steer a model. _Looks fine until:_ a
  file that says "ignore previous instructions".

## Edge cases

- A file longer than `EXPLAIN_MAX_LINES` → explained from its first
  `EXPLAIN_MAX_LINES` lines, and the explanation says it was shortened.
- A file with no edges → explained from its own source, saying it has none.
- A model error, a timeout, or the model's request limit reached → a message
  in the tab saying to try again shortly; nothing is cached.
- A file's source at the analysed commit that doesn't match the content hash
  the analysis recorded → no explanation, and a message; nothing is sent to
  the model.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                                               | Covers                 | Verified by |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- |
| AC-01 | Given a file, when it's explained, then the paragraph names genuine neighbours, and choosing one moves the map to it                              | FR-001, FR-008, FR-003 | browser     |
| AC-02 | Given rendered explanations, when they're searched, then no stray backtick, asterisk or hash appears                                              | FR-007                 | test        |
| AC-03 | Given a file explained once, when it's explained again, then it's instant, and the traces show two runs, the second with no model call            | FR-010, FR-011         | browser     |
| AC-04 | Given a box, when it's explained, then the answer is about the folder, not one file in it                                                         | FR-002                 | browser     |
| AC-05 | Given an explanation naming a file absent from the analysis, when it's checked, then it's not shown and not cached                                | FR-005, FR-006         | test        |
| AC-06 | Given a commit pushed to the repository after analysis, when the changed file's explanation is shown, then it says it's stale and offers a re-run | FR-014, FR-015         | browser     |
| AC-07 | Given a file no adapter matched, when its role is inferred, then it's one of the allowed roles and never a surface role                           | FR-009, C-02           | test        |
| AC-08 | Given tracing unconfigured, when an explanation is requested, then it succeeds and the interface shows tracing is off                             | FR-013                 | browser     |
| AC-09 | Given a file explained in this session, when the selection moves away and back, then its explanation shows without being requested again          | FR-004                 | browser     |
| AC-10 | Given the model configuration, when it's read, then every model is named by an exact version, never an alias                                      | FR-012                 | test        |

## Out of scope

- Questions about the repository as a whole → `010`.
- Measuring whether explanations are good → `011`.

## Open questions

None. Resolved 2026-10-18:

- `EXPLAIN_MAX_LINES` = 500, the same as `OVERSIZED_LINES` (`005`): every
  file the map doesn't flag as oversized is explained whole.
- The file's source is fetched from the repository at the analysed commit,
  never stored with the analysis, and checked against the content hash the
  analysis recorded (FR-001). A commit's files never change, so the
  explanation is written from exactly what was parsed.
- The cache is kept per organization. Every stored row belongs to an
  organization (`007`), so deleting the organization deletes its cache too.
  Two organizations explaining the same file each write their own.
