# 012 — Production readiness

**Status:** Approved
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
- **FR-012** Product analytics shall store nothing on the visitor's device: no
  cookie and no local storage, so no consent notice is needed.

### Security headers

- **FR-004** Every page shall be sent with a content security policy, strict
  transport security, `X-Content-Type-Options: nosniff`, a referrer policy and
  a permissions policy.
- **FR-005** The content security policy shall allow scripts and connections
  only from the application's own origin and the services it uses, and forbid
  being framed by another site.

### Limits

- **FR-006** If an organization starts more than `RUN_LIMIT` (20) runs within
  `RUN_LIMIT_WINDOW` (an hour), then the system shall refuse the next run and
  say when it can start.
- **FR-007** If an organization's model calls exceed `MODEL_CALL_LIMIT` (100)
  within `MODEL_CALL_LIMIT_WINDOW` (a day), then the system shall refuse further
  explanations and chat answers and say when they resume.

### Ship criteria

- **FR-008** Before release, each ship criterion in `docs/project-doc.md` shall
  be checked as its row below says, and the result recorded.

### Performance and accessibility

- **FR-009** Every page shall meet, at the 75th percentile of page loads, a
  largest contentful paint within `LCP_MAX` (2.5 s), an interaction to next
  paint within `INP_MAX` (200 ms) and a cumulative layout shift of at most
  `CLS_MAX` (0.1), measured from real page loads and, before release, in a lab
  run on a mid-range mobile profile.
- **FR-010** Every page shall meet WCAG 2.2 at level AA.
- **FR-011** Every page shall be usable with the keyboard alone, with focus
  visible at every step.

## Constraints

- **C-01** No repository content leaves through telemetry. _Why:_ the content
  belongs to the repository's authors, and telemetry vendors aren't where it
  belongs. _Looks fine until:_ an error report captures a variable holding a
  file's source.
- **C-02** The security policy lists sources, never wildcards, but one: the
  sign-in provider's fraud protection, on its own hosts, which it requires.
  _Why:_ a wildcard policy passes a header check and protects nothing.
  _Looks fine until:_ a scanner reports "policy present".
- **C-03** Limits are per organization. _Why:_ fetching archives and calling
  models cost money per request. _Looks fine until:_ one organization re-runs a
  large repository in a loop.

- **C-04** Speed and accessibility are measured, never assumed. _Why:_ the
  people this is for open large repositories, often on ordinary laptops.
  _Looks fine until:_ every check runs on a fast developer machine with a small
  repository.

## Edge cases

- An error thrown inside error reporting → logged on the server only, never a
  loop.
- A run refused by the limit → the dashboard shows the refusal; no run record
  is created.

## Acceptance criteria

The first six rows are the ship criteria of `docs/project-doc.md`.

| ID    | Given / When / Then                                                                                                                                                                                      | Covers               | Verified by |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------- |
| AC-01 | Given a known repository, when five files are checked by hand, then each one's imports match what the parser claims                                                                                      | FR-008               | terminal    |
| AC-02 | Given an analysis, when its coverage is read, then it states what was skipped and why, and the figure is believable                                                                                      | FR-008               | browser     |
| AC-03 | Given a member of a second organization, when the first organization's records are queried, then none come back                                                                                          | FR-008               | test        |
| AC-04 | Given the storage schema, when every table is checked, then each enforces row-level access: all of them                                                                                                  | FR-008               | test        |
| AC-05 | Given the evaluation (`011`), when it runs, then groundedness meets `GROUNDED_REQUIRED` for explanations                                                                                                 | FR-008               | terminal    |
| AC-06 | Given a chat answer, when it's shown, then its lookups appear before it                                                                                                                                  | FR-008               | browser     |
| AC-07 | Given an error thrown on the server and one in the browser, when they occur, then both are reported with the release                                                                                     | FR-001               | browser     |
| AC-08 | Given the product events of one session, when they're inspected, then none holds source, explanation text or an email address                                                                            | FR-003               | test        |
| AC-09 | Given the production address, when its headers are checked, then each header in FR-004 is present and the policy has no wildcard source but C-02's one                                                   | FR-004, C-02, FR-005 | terminal    |
| AC-10 | Given an organization at `RUN_LIMIT`, when it starts another run, then it's refused with the time it can start                                                                                           | FR-006               | test        |
| AC-11 | Given one session that signs in, submits an analysis, explains a file and asks a question, when its events are listed, then each event in FR-002 is there                                                | FR-002               | test        |
| AC-12 | Given an organization at `MODEL_CALL_LIMIT`, when it asks for an explanation, then it's refused with the time it resumes                                                                                 | FR-007               | test        |
| AC-13 | Given the production address and the map of a repository at `MAX_FILES`, when page loads are measured on a mid-range mobile profile, then LCP, INP and CLS are within `LCP_MAX`, `INP_MAX` and `CLS_MAX` | FR-009, C-04         | terminal    |
| AC-14 | Given every page, when an automated WCAG 2.2 AA audit runs, then it reports no violation                                                                                                                 | FR-010               | test        |
| AC-15 | Given every page, when it's used with the keyboard alone, then every action can be reached and the focus is always visible                                                                               | FR-011               | browser     |

## Out of scope

- Private repositories, scores and grades (`docs/project-doc.md`, out of scope).

## Open questions

None. Resolved 2026-10-18:

- `RUN_LIMIT` = 20 runs an hour, as proposed; `MODEL_CALL_LIMIT` = 100 model
  calls a day, below the proposed 300. Every organization shares one free
  model key, so a day's free requests are the real ceiling: 100 lets an
  organization ask 15 to 20 chat questions, and keeps one busy organization
  from spending everyone's quota.
- No consent notice (FR-012): analytics keep events in memory, with no cookie
  or local storage, and no personal data (FR-003). Sign-in cookies are
  strictly necessary, which consent rules exempt. Should analytics ever store
  on the device, a notice comes with it (`docs/future-improvements.md`).
- Core Web Vitals' "good" thresholds, confirmed: 2.5 s, 200 ms, 0.1 (FR-009),
  measured from real page loads at the 75th percentile, and in a lab run on a
  mid-range mobile profile before release (AC-13).
- Amended while building (T03): the sign-in provider's fraud protection is on
  for every application and probes a host made for each session, on several
  ports, so no exact list can name it. C-02 allows its one wildcard, on the
  provider's own hosts, as the provider's guide gives it; every other source
  stays exact.
- Production stays on the sign-in provider's development instance, at $0,
  until there's a domain of our own: its extra sign-in redirects and its
  development badge are known limits of this release, recorded as such.
