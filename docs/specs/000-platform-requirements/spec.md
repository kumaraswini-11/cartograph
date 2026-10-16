# 000 — Platform requirements

**Status:** Draft
**Milestone:** M0 Foundation
**Depends on:** none

## Summary

An empty Cartograph application runs in production behind automated checks,
on a platform able to provide everything the later specs need.

Every later spec assumes a host, storage, identity and an AI service exist.
Choosing them here, as capabilities rather than products, and deploying an
empty application on day one makes deployment problems surface first rather
than last ("a walking skeleton", `docs/specs/README.md`). It also holds the
project doc's rule: one deployable application, no queues, containers or
workers.

## Requirements

### Capabilities the platform must provide

- **FR-001** The platform shall run the application as one deployable unit
  that renders pages on the server and runs server-side code on request.
- **FR-002** The platform shall allow one server request to run for at least
  `MAX_RUN_SECONDS`, the time a repository analysis may take (`008`).
- **FR-003** The platform shall provide relational storage whose access rules
  are policies in the storage itself, evaluated against a claim carried in the
  signed-in person's token (`007`).
- **FR-004** The platform shall let storage push a change to a subscribed page,
  with the subscription itself governed by an access policy (`008`).
- **FR-005** The platform shall provide sign-in with GitHub, Google and email,
  organizations with invitations, and a token that carries the current
  organization (`006`).
- **FR-006** The platform shall provide model calls pinned to an exact model
  version, and a tracing service that records every call (`009`).
- **FR-007** The platform shall provide error reporting and product analytics
  (`012`).

### The empty application

- **FR-008** The application shall be served at a public production address
  and render a page there.
- **FR-009** When a change is proposed, the repository shall run the automated
  checks (format, lint, type check, build, dependency audit and, once they
  exist, tests) and block the merge if any fails.
- **FR-010** When a change is proposed, the platform shall deploy it to its own
  preview address, so it can be checked in a browser before it merges.
- **FR-011** If a required configuration value is missing at startup, then the
  application shall stop and name the missing value.
- **FR-012** The application shall install from a lockfile, so the same commit
  always installs the same dependency versions.

## Constraints

- **C-01** One deployable application. _Why:_ the project doc rules out queues,
  containers and workers; a repository too large to parse in a request is a
  limit to state, not an architecture to build. _Looks fine until:_ a
  capability is chosen that only works with a background worker, and `008`
  can't be built without one.
- **C-02** Capabilities are chosen here; each is built when its first user
  arrives. _Why:_ infrastructure built ahead of its user sits idle while the
  product is still uncertain. _Looks fine until:_ storage tables exist months
  before anything writes to them, and no one can say which rules they need.
- **C-03** Third-party steps in the automated checks are pinned to an
  immutable version. _Why:_ a moved or compromised version tag would change
  what runs on every change. _Looks fine until:_ a tag is re-pointed upstream.
- **C-04** A dependency advisory fails the checks unless it's recorded as
  accepted with its reason. _Why:_ an advisory nobody decided on is an
  advisory nobody saw. _Looks fine until:_ the audit runs but its result is
  ignored.

## Edge cases

- A required configuration value is present but empty → treated as missing
  (FR-011).
- A check fails only on the platform, not locally → the merge is still blocked.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                      | Covers         | Verified by |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------------- | ----------- |
| AC-01 | Given the main branch, when its production address is opened, then a page renders                                        | FR-008         | browser     |
| AC-02 | Given a proposed change that breaks formatting, when the checks run, then the merge is blocked                           | FR-009         | terminal    |
| AC-03 | Given a proposed change, when it's pushed, then it gets its own preview address that renders                             | FR-010         | browser     |
| AC-04 | Given a required configuration value removed, when the application starts, then it stops and the message names the value | FR-011         | terminal    |
| AC-05 | Given a clean checkout of one commit, when it's installed twice, then both installs resolve identical versions           | FR-012         | terminal    |
| AC-06 | Given a server request that runs for `MAX_RUN_SECONDS`, when it's called in production, then it completes                | FR-001, FR-002 | terminal    |
| AC-07 | Given the specs named beside FR-003 to FR-007, when each is accepted, then the capability it names is accepted with it   | FR-003..FR-007 | test        |

## Out of scope

- Which products provide each capability → this spec's `plan.md` and
  `docs/adr/`.
- Sign-in, storage, model calls themselves → `006`, `007`, `009`. FR-003 to
  FR-007 are accepted by the spec named beside each.

## Open questions

- [NEEDS CLARIFICATION] `MAX_RUN_SECONDS`: proposed 300. It must cover fetching
  and parsing a repository at `MAX_FILES` (`001`).
