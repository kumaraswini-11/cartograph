# 008 — Repository analysis

**Status:** Approved
**Milestone:** M3 Platform
**Depends on:** 001-repository-parser, 002-framework-detection,
007-organization-dashboard

## Summary

A member pastes a public GitHub repository address and watches it become a
stored map, stage by stage, owned by their organization.

A repository is mapped once and everyone after that starts from the map
(`docs/project-doc.md`). Parsing a real repository is not instant, so its
progress is shown live; and a run that dies quietly must still be visible.

## Requirements

### Submitting

- **FR-001** The system shall accept the address of a public GitHub repository
  and reject any other address, saying why.
- **FR-002** When a repository already has an analysis in the current
  organization, the system shall take the member to that analysis and start
  no run.
- **FR-003** The system shall start a new run of an existing analysis only when
  a member chooses to re-run it from that analysis.
- **FR-004** While a run of an analysis is unfinished, the system shall start no
  second run of it.

### The run

- **FR-005** The system shall fetch the repository as an archive of its default
  branch, without any token, and record the commit the archive came from.
- **FR-006** The system shall move a run through the stages fetching, parsing
  and storing, and end it as done or failed.
- **FR-007** If any stage fails, then the system shall record the run as failed,
  with the stage it failed in and why.
- **FR-008** If the repository doesn't exist or isn't public, then the run shall
  fail at fetching with a message saying so.
- **FR-009** If the archive exceeds `MAX_ARCHIVE_BYTES`, or the parser reports
  the repository as too large (`001`), then the run shall fail with a message
  naming the limit.

### Progress

- **FR-010** While a run is unfinished, its progress page shall show the current
  stage and its message, updated as the stage changes.
- **FR-011** Storage shall push each stage change to subscribed pages; pages
  shall not poll.
- **FR-012** The system shall let only members of the analysis's organization
  subscribe to its progress.
- **FR-013** The dashboard shall mark as stale any run that has been unfinished
  for longer than `STALE_RUN_AFTER`.

### The stored map

- **FR-014** When a run is done, the system shall show the analysis's map, read
  from storage, with the coverage banner of `003` where it applies.
- **FR-015** The system shall store the parser's result and the framework
  detection for the analysis, keyed to the commit it came from.

## Constraints

- **C-01** One analysis per repository per organization. _Why:_ a repository is
  mapped once and everyone starts from that map. _Looks fine until:_ two
  members paste the same address and the organization has two maps that
  disagree.
- **C-02** Progress is pushed from storage, not polled. _Why:_ storage is the
  single source of a run's state. _Looks fine until:_ a second tab polls on a
  different interval and shows another stage.
- **C-03** A push carries the stage and its message, not the whole record.
  _Why:_ the page then has nothing to filter or interpret. _Looks fine until:_ the record gains a field, and every page that filtered the whole record breaks.
- **C-04** Who may subscribe is a policy, the same as who may read. _Why:_
  another organization's progress is that organization's data. _Looks fine
  until:_ anyone who guesses an analysis's channel can watch it.
- **C-05** A run that dies without failing is visible. _Why:_ there's no queue
  and no timeout, so a run that stops mid-parse says "parsing" forever. _Looks
  fine until:_ the first deploy that restarts the server mid-run.
- **C-06** Nothing here needs a repository token. _Why:_ public repositories
  only, and a token would have to be stored (`docs/project-doc.md`). _Looks fine until:_ a token is added to raise a rate limit, and now one has to be stored and protected.
- **C-07** The checked-in parser result `003` was built against is removed
  here. _Why:_ it was scaffolding; analyses are stored now. _Looks fine until:_ the map silently keeps reading the checked-in file and stored analyses are never shown.

## Edge cases

- An address with a trailing `.git`, a branch or a path inside the repository →
  normalised to the repository.
- A repository renamed on GitHub → the archive follows the redirect; the
  analysis keeps the address the member submitted.
- A second tab open on the dashboard during a run → the stage updates there
  too.
- A repository with no JavaScript or TypeScript files → the run is done and the
  map shows the empty state of `003`.
- A run that's stale (FR-013) → it doesn't count as unfinished: the analysis
  can be re-run, and the stale run is ended as failed, stopped without
  finishing.
- A progress page opened after a run's first stages → it shows the current
  stage at once, read from storage, then follows the stage changes pushed
  after it (C-02).

## Acceptance criteria

| ID    | Given / When / Then                                                                                                                                     | Covers         | Verified by |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------- |
| AC-01 | Given a public repository address, when it's submitted, then the stages pass by name, not a spinner, and land on its map                                | FR-006, FR-010 | browser     |
| AC-02 | Given an address already analysed, when it's submitted again, then the member lands on the existing analysis and it's still one record                  | FR-002         | browser     |
| AC-03 | Given an address for a repository that doesn't exist, when it's submitted, then the run fails with a message, and the dashboard reads failed            | FR-007, FR-008 | browser     |
| AC-04 | Given a run under way, when the dashboard is open in a second tab, then its stage updates without a reload                                              | FR-010, FR-011 | browser     |
| AC-05 | Given a run left unfinished past `STALE_RUN_AFTER`, when the dashboard loads, then the run is marked stale                                              | FR-013         | test        |
| AC-06 | Given a member of another organization, when they subscribe to an analysis's progress, then the subscription is refused                                 | FR-012, C-04   | test        |
| AC-07 | Given a repository with path aliases or a nested app, when it's analysed, then the coverage banner shows and names a figure                             | FR-014         | browser     |
| AC-08 | Given a finished analysis, when its record is read, then it names the commit the archive came from                                                      | FR-005, FR-015 | test        |
| AC-09 | Given a GitLab address, a malformed address and a GitHub address that isn't a repository, when each is submitted, then each is rejected with its reason | FR-001         | test        |
| AC-10 | Given an existing analysis, when re-run is chosen from it, then a new run starts for the same analysis and no second analysis is created                | FR-003         | browser     |
| AC-11 | Given a run under way, when the same repository is submitted or re-run, then no second run starts                                                       | FR-004         | test        |
| AC-12 | Given an archive over `MAX_ARCHIVE_BYTES`, when it's fetched, then the run fails with a message naming the limit                                        | FR-009         | test        |

## Out of scope

- Private repositories (`docs/project-doc.md`).
- Explanations and their staleness → `009`.

## Open questions

None. Resolved 2026-10-17, measured: `STALE_RUN_AFTER` = 10 minutes, twice
the longest run (`MAX_RUN_SECONDS` = 300 s, `000`), so a run still going is
never stale; facebook/react's whole run takes about 15 s (download 4 s,
parse 11 s for 3,536 files). `MAX_ARCHIVE_BYTES` = 100 MB, twice the largest
archive measured (vercel/next.js, 49.9 MB; react 9.8 MB, express 0.1 MB);
larger repositories meet the parser's own limit first (`001`). The default
branch only: one analysis per repository (C-01) can't hold one map per
branch.
