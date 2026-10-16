# 011 — AI evaluation

**Status:** Draft
**Milestone:** M4 Intelligence
**Depends on:** 009-file-explanations, 010-repository-chat

## Summary

The quality of explanations and chat answers becomes a number, produced by one
command over a fixed set of cases, so a change of model or prompt can be shown
to have helped or hurt.

Reading a few outputs and judging them fine is not measurement
(`docs/project-doc.md`, where this is likely to go wrong). The project doc
leaves the method open; this spec fixes what the measurement must deliver and
the parts that can be checked exactly.

## Requirements

### Cases

- **FR-001** The evaluation shall run over a fixed set of cases, each pinned to
  a repository and a commit: files and boxes to explain, and questions to ask.
- **FR-002** Each question case shall record facts its answer must contain,
  taken from the analysis's edges (for example the files in a blast radius),
  never written by hand from memory.

### Scores

- **FR-003** The evaluation shall score groundedness: the share of outputs in
  which every file named exists in the analysis.
- **FR-004** The evaluation shall score fact coverage: the share of a case's
  recorded facts its output contains.
- **FR-005** The evaluation shall score lookup use for chat cases: the share of
  answers whose every claimed fact came from a lookup shown with it.
- **FR-006** The evaluation shall report each score per kind of case and
  overall, with the model version and prompt version that produced them.

### Running

- **FR-007** The evaluation shall run from one command and print its scores.
- **FR-008** The evaluation shall store each run's scores, so runs can be
  compared over time.
- **FR-009** If groundedness is below `GROUNDED_REQUIRED`, or any score falls by
  more than `SCORE_REGRESSION_TOLERANCE` from the last accepted run, then the
  command shall exit with a failure.

## Constraints

- **C-01** Groundedness and fact coverage are checked by arithmetic, not by a
  model. _Why:_ a model grading a model can't establish that a file exists or
  that a fact is in an edge list; arithmetic can. _Looks fine until:_ a judge
  model rates an answer that names an invented file as "helpful".
- **C-02** Cases are pinned to commits. _Why:_ a moving repository changes the
  expected facts, and a score change can no longer be blamed on the model. _Looks fine until:_ the repository behind a case gains a commit, and the score drops with no change to the model.
- **C-03** The evaluation's own model calls are traced like any other (`009`). _Why:_ an untraced evaluation call can't be told apart from production traffic, or checked for cost. _Looks fine until:_ the evaluation creates its own model client.

## Edge cases

- A case whose repository has since been deleted on GitHub → the pinned archive
  is kept with the cases, so the case still runs.
- A model returning nothing → scored as zero on every score, not skipped.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                          | Covers         | Verified by |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------- |
| AC-01 | Given the case set, when the command runs, then it prints groundedness, fact coverage and lookup use, per kind and overall   | FR-006, FR-007 | terminal    |
| AC-02 | Given an output that names a file absent from the analysis, when it's scored, then it counts against groundedness            | FR-003, C-01   | test        |
| AC-03 | Given the same cases, model and prompt, when the command runs twice, then the scores differ by no more than `RERUN_VARIANCE` | FR-001, C-02   | terminal    |
| AC-04 | Given a prompt change that lowers a score by more than `SCORE_REGRESSION_TOLERANCE`, when the command runs, then it fails    | FR-009         | test        |
| AC-05 | Given two stored runs, when they're compared, then each score's change and the model and prompt versions are shown           | FR-008         | terminal    |
| AC-06 | Given the case set, when every recorded fact is checked against its pinned analysis, then each one follows from the edges    | FR-002         | test        |
| AC-07 | Given an output holding three of a case's four facts, when it's scored, then its fact coverage is 75%                        | FR-004         | test        |
| AC-08 | Given a chat answer claiming a fact that no shown lookup returned, when it's scored, then it counts against lookup use       | FR-005         | test        |

## Out of scope

- How explanations and answers are produced → `009`, `010`.

## Open questions

- [NEEDS CLARIFICATION] `GROUNDED_REQUIRED`: proposed 100%, as the ship
  criteria in `docs/project-doc.md` require no invented file at all.
- [NEEDS CLARIFICATION] `SCORE_REGRESSION_TOLERANCE`: proposed 2 percentage
  points.
- [NEEDS CLARIFICATION] `RERUN_VARIANCE`: proposed 3 percentage points.
- [NEEDS CLARIFICATION] Is a judged score (a rubric applied by a model or a
  person) also wanted, beyond the three arithmetic scores? The project doc
  calls the method genuinely open.
- [NEEDS CLARIFICATION] The case set: which repositories and commits, and how
  many cases of each kind.
