# NNN — Title

**Status:** Draft <!-- Draft or Approved; the build status is in tasks.md -->
**Milestone:** Mn Name
**Depends on:** NNN-name, NNN-name (or "none")

<!--
What and why only. Name no framework, library, vendor or folder: someone else
must be able to build this with their own stack. Use the terms in CONTEXT.md.
-->

## Summary

One sentence: what someone can do once this exists.

Two to four lines: the problem it solves, and which rule in
`docs/project-doc.md` it serves.

## Requirements

<!--
One observable behaviour per requirement, grouped by area. EARS forms:
  The <system> shall <response>.
  When <trigger>, the <system> shall <response>.
  While <state>, the <system> shall <response>.
  If <unwanted condition>, then the <system> shall <response>.
  Where <optional feature is present>, the <system> shall <response>.
Every threshold is a named value: FOLD_TARGET = 24, not "about two dozen".
-->

### Area

- **FR-001** The <system> shall …
- **FR-002** When …, the <system> shall …

## Constraints

<!-- Rules that must stay true, each with its reason and the failure it prevents. -->

- **C-01** Rule. _Why:_ … _Looks fine until:_ the failure a casual check would miss.

## Edge cases

- Case → the required outcome.

## Acceptance criteria

<!-- Verified by: test (automated), terminal (a command and the numbers it prints), browser (a person). -->

| ID    | Given / When / Then     | Covers | Verified by |
| ----- | ----------------------- | ------ | ----------- |
| AC-01 | Given …, when …, then … | FR-001 | test        |

## Golden data

<!-- Only where the output is deterministic. Pin inputs exactly (repository and commit). Delete otherwise. -->

| Input                | Expected |
| -------------------- | -------- |
| owner/repo @ `<sha>` | …        |

## Out of scope

- Item → the spec that owns it.

## Open questions

<!-- Must be empty before Status: Approved. -->

- [NEEDS CLARIFICATION] …
