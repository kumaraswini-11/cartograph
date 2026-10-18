# 010 — Repository chat

**Status:** Approved
**Milestone:** M4 Intelligence
**Depends on:** 004-detail-pane, 009-file-explanations

## Summary

Someone asks a question about the repository and watches the answer get looked
up: every lookup is shown before the answer, and every file the answer names
exists.

An answer arriving with no lookups behind it is the exact failure this product
exists to prevent (`docs/project-doc.md`). The model picks where to start and
which direction to go; the same arithmetic that draws the map does the walk.

## Requirements

### Lookups

- **FR-001** The chat shall answer only from lookups it made in the current
  analysis, never from what the model recalls.
- **FR-002** The chat shall offer these lookups: find files by name or path;
  a file's details (role, line count, fan-in, fan-out); a file's dependencies
  and dependents; a blast radius or dependency chain (`004`); the routes
  (`005`); the insights (`005`); a file's explanation (`009`); and a file's
  source at the analysed commit.
- **FR-003** The chat shall run blast radius and dependency chain lookups with
  the same walk as the detail pane, to every level.
- **FR-004** The chat shall show each lookup, with what it returned, before the
  answer.
- **FR-005** If a question needs more than `MAX_LOOKUPS` (12) lookups, then the
  chat shall answer from what it found and say it stopped at the limit.

### Answers

- **FR-006** If an answer names a file absent from the analysis, then the chat
  shall not show it as given; it shall retry once, then say it couldn't give a
  grounded answer.
- **FR-007** If no lookup was made, then the chat shall not answer.
- **FR-008** The chat shall render answers with the formatting and the path links
  of `009`.
- **FR-009** When a file path in an answer or a lookup is chosen, the map shall
  move the selection to it.
- **FR-010** The chat shall trace every model call and every lookup.

### Place and lifetime

- **FR-011** The chat shall sit beside the details in the right pane, as two
  tabs, Details and Chat, so it stays open while the selection changes.
- **FR-012** A conversation shall last for the page's life and shall not be
  stored.

## Constraints

- **C-01** The model never walks the edges. _Why:_ if it does the walking,
  invented structure comes straight back in (`docs/project-doc.md`). _Looks fine
  until:_ a lookup returns a file's neighbours and the model "continues" the
  walk from memory.
- **C-02** Lookups come before the answer, on screen. _Why:_ an answer with no
  visible lookups can't be told from a recalled one. _Looks fine until:_ the
  lookups are collapsed by default and nobody opens them.
- **C-03** Repository content returned by a lookup is data, never instructions.
  _Why:_ the same reason as `009` C-05. _Looks fine until:_ a file's comment asks the chat to answer differently, and it does.
- **C-04** The chat answers questions about this analysis only. _Why:_ it's not
  a general assistant; anything else has no lookups behind it. _Looks fine until:_ the chat answers a general coding question from memory, with no lookup behind it.

## Edge cases

- A question about a file that doesn't exist → the find lookup returns nothing,
  and the answer says no such file is in the analysis.
- A question unrelated to the repository → no lookups apply; the chat says it
  only answers questions about this analysis.
- A lookup that fails → shown as failed, and the answer says what it couldn't
  check.
- The model's request limit is reached → the chat says so; lookups already
  shown stay, and nothing is answered without them.
- A walk too long to hand over whole → its levels are handed over with the
  longest counted, not listed; the lookup on screen shows it all.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                               | Covers         | Verified by |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------- |
| AC-01 | Given "what breaks if X changes?", when it's asked, then a blast radius lookup is shown first and the answer's files match it     | FR-003, FR-004 | browser     |
| AC-02 | Given answers to a set of questions, when every file named is checked, then all exist in the analysis                             | FR-006         | test        |
| AC-03 | Given a question, when the traces are read, then every lookup the answer relied on is recorded                                    | FR-010, FR-001 | test        |
| AC-04 | Given a blast radius from chat and one from the detail pane for the same file, when compared, then they're identical              | FR-003, C-01   | test        |
| AC-05 | Given a question needing more than `MAX_LOOKUPS` lookups, when it's asked, then the answer says it stopped at the limit           | FR-005         | test        |
| AC-06 | Given a question unrelated to the repository, when it's asked, then the chat declines and shows no lookups                        | C-04           | browser     |
| AC-07 | Given an analysis, when each lookup in FR-002 is made, then each returns its data from that analysis                              | FR-002         | test        |
| AC-08 | Given a question for which no lookup was made, when it's answered, then no answer is given                                        | FR-007         | test        |
| AC-09 | Given an answer naming files, when it's shown, then it uses only the formatting of `009`, and choosing a path moves the map to it | FR-008, FR-009 | browser     |

## Out of scope

- Scoring answer quality → `011`.
- Keeping conversations after the page closes, or sharing them (FR-012).

## Open questions

None. Resolved 2026-10-18:

- `MAX_LOOKUPS` = 12, as proposed. The model may ask for several lookups at
  once, so a question takes fewer model calls than lookups.
- Blast radius and dependency chain lookups walk every level, as the detail
  pane does (`004`), so AC-04 compares like with like. What the model is
  handed may count a long level rather than list it; the lookup shown on
  screen holds the whole walk.
- The chat is a tab of the right pane, Details and Chat (FR-011), not a tab
  beside Explanation: those exist only while something is selected, and a
  question about the repository isn't about the selection.
- Conversations aren't kept after the page closes (FR-012), as `009`'s
  session explanations aren't: no stored text, and no question of who may
  read whose.
