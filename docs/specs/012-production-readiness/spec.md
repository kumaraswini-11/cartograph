# 012 — Production readiness

**Status:** Draft
**Milestone:** M5 Ship
**Depends on:** all

## Summary

Cartograph reports its errors, measures how it's used, sends the security
headers a public application needs, limits costly work, and passes every ship
criterion in the project doc, each checked rather than asserted.

"What has to be true before this ships" is a list of specifics, not "it looks
right" (`docs/project-doc.md`). This spec turns each one into a check, and adds
what a public application needs before anyone else uses it.

## Requirements

### Errors and usage

- **FR-001** The system shall report every unhandled error on the server and in
  the browser, tagged with the release that produced it.
- **FR-002** The system shall record product events for sign-in, analysis
  submitted, run done or failed, explanation requested and chat question asked.
- **FR-003** Product events and error reports shall contain no repository
  source, no explanation or chat text, and no email address.

### Security headers

- **FR-004** Every page shall be sent with a content security policy, strict
  transport security, `X-Content-Type-Options: nosniff`, a referrer policy and
  a permissions policy.
- **FR-005** The content security policy shall allow scripts and connections
  only from the application's own origin and the services it uses, and forbid
  being framed by another site.

### Limits

- **FR-006** If an organization starts more than `RUN_LIMIT` runs within
  `RUN_LIMIT_WINDOW`, then the system shall refuse the next run and say when it
  can start.
- **FR-007** If an organization's model calls exceed `MODEL_CALL_LIMIT` within
  `MODEL_CALL_LIMIT_WINDOW`, then the system shall refuse further explanations
  and chat answers and say when they resume.

### Ship criteria

- **FR-008** Before release, each ship criterion in `docs/project-doc.md` shall
  be checked as its row below says, and the result recorded.

## Constraints

- **C-01** No repository content leaves through telemetry. _Why:_ the content
  belongs to the repository's authors, and telemetry vendors aren't where it
  belongs. _Looks fine until:_ an error report captures a variable holding a
  file's source.
- **C-02** The security policy lists sources, never wildcards. _Why:_ a wildcard
  policy passes a header check and protects nothing. _Looks fine until:_ a
  scanner reports "policy present".
- **C-03** Limits are per organization. _Why:_ fetching archives and calling
  models cost money per request. _Looks fine until:_ one organization re-runs a
  large repository in a loop.

## Edge cases

- An error thrown inside error reporting → logged on the server only, never a
  loop.
- A run refused by the limit → the dashboard shows the refusal; no run record
  is created.

## Acceptance criteria

The first six rows are the ship criteria of `docs/project-doc.md`.

| ID    | Given / When / Then                                                                                                                                       | Covers               | Verified by |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------- |
| AC-01 | Given a known repository, when five files are checked by hand, then each one's imports match what the parser claims                                       | FR-008               | terminal    |
| AC-02 | Given an analysis, when its coverage is read, then it states what was skipped and why, and the figure is believable                                       | FR-008               | browser     |
| AC-03 | Given a member of a second organization, when the first organization's records are queried, then none come back                                           | FR-008               | test        |
| AC-04 | Given the storage schema, when every table is checked, then each enforces row-level access: all of them                                                   | FR-008               | test        |
| AC-05 | Given the evaluation (`011`), when it runs, then groundedness meets `GROUNDED_REQUIRED` for explanations                                                  | FR-008               | terminal    |
| AC-06 | Given a chat answer, when it's shown, then its lookups appear before it                                                                                   | FR-008               | browser     |
| AC-07 | Given an error thrown on the server and one in the browser, when they occur, then both are reported with the release                                      | FR-001               | browser     |
| AC-08 | Given the product events of one session, when they're inspected, then none holds source, explanation text or an email address                             | FR-003               | test        |
| AC-09 | Given the production address, when its headers are checked, then each header in FR-004 is present and the policy has no wildcard sources                  | FR-004, C-02, FR-005 | terminal    |
| AC-10 | Given an organization at `RUN_LIMIT`, when it starts another run, then it's refused with the time it can start                                            | FR-006               | test        |
| AC-11 | Given one session that signs in, submits an analysis, explains a file and asks a question, when its events are listed, then each event in FR-002 is there | FR-002               | test        |
| AC-12 | Given an organization at `MODEL_CALL_LIMIT`, when it asks for an explanation, then it's refused with the time it resumes                                  | FR-007               | test        |

## Out of scope

- Private repositories, scores and grades (`docs/project-doc.md`, out of scope).

## Open questions

- [NEEDS CLARIFICATION] `RUN_LIMIT` and `RUN_LIMIT_WINDOW`: proposed 20 runs per
  hour.
- [NEEDS CLARIFICATION] `MODEL_CALL_LIMIT` and `MODEL_CALL_LIMIT_WINDOW`:
  proposed 300 calls per day.
- [NEEDS CLARIFICATION] Is a cookie or consent notice needed for product
  analytics in the regions served?
