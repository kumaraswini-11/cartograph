# 006 — Sign-in and organizations

**Status:** Draft
**Milestone:** M3 Platform
**Depends on:** 000-platform-requirements

## Summary

Someone signs in, already belongs to an organization, can invite others into
it and switch between organizations, and only signed-in members reach the
application.

An analysis belongs to an organization, not to whoever ran it
(`docs/project-doc.md`). Identity is a token, and the token carries the
organization; everything after sign-in decides what someone may see by reading
that claim, never by asking the identity provider.

## Requirements

### Signing in

- **FR-001** The system shall offer sign-in with GitHub, Google and email, used
  for identity only.
- **FR-002** When someone signs in with any method, the system shall land them
  in the same place.
- **FR-003** The system shall enable or disable a sign-in method through
  configuration, with no change to the code.
- **FR-004** The system shall request no access to anyone's repositories and
  store no repository token.

### Organizations

- **FR-005** When someone signs in for the first time, the system shall put
  them in an organization without asking them to create one.
- **FR-006** The system shall let a member switch the current organization
  among those they belong to.
- **FR-007** The system shall let a member invite someone by email into the
  current organization.
- **FR-008** When an invitation is accepted, the system shall bring the person
  to this application's sign-in page, and after sign-in, into that
  organization.
- **FR-009** The system shall use the identity provider's default roles only.

### Protecting pages

- **FR-010** If a signed-out visitor requests a protected page, then the system
  shall send them to sign-in before any of the page is sent.
- **FR-011** The system shall make the current organization readable while a
  page renders on the server, so it's present in the first paint.

### Tokens

- **FR-012** The signed-in person's token shall carry the current
  organization.
- **FR-013** The system shall attach the signed-in person's token to every
  storage request, so storage policies can read its claims.

## Constraints

- **C-01** Authorization reads the token, never the identity provider at
  runtime. _Why:_ the organization claim is the single source every policy
  reads (`docs/project-doc.md`). _Looks fine until:_ a page calls the provider
  to "double-check" membership and the two disagree.
- **C-02** Use the identity provider's own sign-in screens. _Why:_ a
  hand-written login form is a security surface nobody needs to own. _Looks
  fine until:_ a custom form skips a provider check.
- **C-03** One session system. _Why:_ two systems owning the same cookie
  produce random sign-outs. _Looks fine until:_ a storage library's setup
  snippet installs its own session refresh beside the provider's.
- **C-04** Storage requests carry the token from the start. _Why:_ a client
  built anonymously works until the first policy exists, then returns nothing.
  _Looks fine until:_ `007` writes its first policy.
- **C-05** No storage table in this spec. _Why:_ storage arrives with its
  first user (`007`). _Looks fine until:_ a table is added "for later" and has no rules when `007` arrives.

## Edge cases

- An invitation to an email that already has an account → after sign-in, the
  person joins the organization and it becomes current.
- An expired or revoked invitation → the person signs in and sees a message
  that it no longer applies; they're not added.
- A member removed from the current organization → on their next request, the
  current organization becomes another one they belong to, or their own.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                                           | Covers                 | Verified by |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- |
| AC-01 | Given a new account on each enabled method, when it signs in, then each lands in the same place, already in an organization                   | FR-002, FR-005, FR-001 | browser     |
| AC-02 | Given an invitation to a second account, when it's accepted, then it reaches the sign-in page and lands in that organization after sign-in    | FR-007, FR-008         | browser     |
| AC-03 | Given a signed-in member, when a page renders on the server, then the current organization is in the first paint                              | FR-011                 | browser     |
| AC-04 | Given a signed-out visitor, when a protected page is requested, then they're sent to sign-in and the network panel shows no page HTML sent    | FR-010                 | browser     |
| AC-05 | Given a sign-in method disabled in configuration, when the sign-in page loads, then it's gone, and no code changed                            | FR-003                 | browser     |
| AC-06 | Given the signed-in token, when it's decoded, then it carries the current organization; switching organization changes the claim              | FR-006, FR-012         | test        |
| AC-07 | Given the GitHub sign-in consent screen, when it's shown, then it asks for no repository access, and no repository token is stored afterwards | FR-004                 | browser     |
| AC-08 | Given a new organization, when its roles are listed, then they're the identity provider's defaults only                                       | FR-009                 | test        |
| AC-09 | Given a signed-in member, when a storage request is made, then it carries their token                                                         | FR-013, C-04           | test        |

## Out of scope

- Roles beyond the provider's defaults.
- Storage and its policies → `007`.
- Styling the sign-in screens beyond matching the rest of the application.

## Open questions

- [NEEDS CLARIFICATION] The organization a first sign-in lands in: a personal
  one named after the person (proposed), or one shared organization?
