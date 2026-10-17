# 007 — Organization dashboard

**Status:** Approved
**Milestone:** M3 Platform
**Depends on:** 006-sign-in-and-organizations

## Summary

An organization's analyses are stored so that only its members can read
them, and its dashboard lists them with the state of each one's latest run.

Access is a policy, not a check the application remembers to perform
(`docs/project-doc.md`). Signed in from a different organization, the first
organization's records aren't hidden by the interface; they're absent from
the query.

## Requirements

### Storage

- **FR-001** Every stored record shall belong to an organization.
- **FR-002** When an organization is deleted, the system shall delete every
  record that belongs to it.
- **FR-003** Every storage table shall enforce row-level access, with policies
  that read the organization claim from the signed-in token.
- **FR-004** If a table has row-level access enforced and no policy, then it
  shall return nothing.
- **FR-005** The system shall define every change to storage as a versioned
  migration file kept in the repository.

### The dashboard

- **FR-006** The dashboard shall list the current organization's analyses, each
  with its repository and the state of its latest run.
- **FR-007** If the organization has no analyses, then the dashboard shall show
  an empty state that says so.
- **FR-008** When the current organization changes, the dashboard shall show
  that organization's analyses through the same query.

## Constraints

- **C-01** Row-level access is on by default, not per table. _Why:_ the two
  failures aren't symmetrical. A table with access on and no policy returns
  nothing, which is visible; a table where someone forgot to turn it on
  returns everything, silently. The second must be impossible, not unlikely.
  _Looks fine until:_ the one table added in a hurry.
- **C-02** The application never filters by organization. _Why:_ if a query
  returns another organization's record, the bug is the policy, and a filter
  in code hides it. _Looks fine until:_ the policy is wrong and the filter
  covers for it.
- **C-03** Migrations are files, never edits made by hand in a console. _Why:_
  storage must be rebuildable from the repository. _Looks fine until:_ a
  policy added by hand is missing from the next environment.
- **C-04** Sample analyses exist in development only, never in a deployed
  environment. _Why:_ a deployed dashboard lists only what analyses really
  created (`008`). _Looks fine until:_ a seed meant for development lands in
  production and an organization sees analyses nobody ran.

## Edge cases

- A member of two organizations → each one's dashboard shows only its own
  analyses.
- A table created by a migration with no policy yet → returns nothing to
  everyone.
- The notice that an organization was deleted arrives twice, or late → its
  records are deleted once, and a repeat deletes nothing.
- Between an organization's deletion and its notice → its records remain but
  can't be read: no token carries a deleted organization.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                           | Covers       | Verified by |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| AC-01 | Given analyses stored for two organizations, when the dashboard loads for the first, then only its analyses are listed        | FR-006       | browser     |
| AC-02 | Given the same member, when they switch organization, then the list changes and no other query ran                            | FR-008, C-02 | test        |
| AC-03 | Given a token for one organization, when every table is queried directly, then no record of another organization comes back   | FR-003       | test        |
| AC-04 | Given the storage schema, when every table is listed, then every one has row-level access enforced: all of them, not a sample | FR-003, C-01 | test        |
| AC-05 | Given a new table created with no policy, when it's queried with any token, then it returns nothing                           | FR-004       | test        |
| AC-06 | Given an organization with analyses, when it's deleted, then none of its records remain                                       | FR-002       | test        |
| AC-07 | Given an organization with no analyses, when the dashboard loads, then it shows the empty state                               | FR-007       | browser     |
| AC-08 | Given the storage schema, when every table is checked, then each has a required reference to an organization                  | FR-001       | test        |
| AC-09 | Given an empty database, when the migrations in the repository are applied, then the resulting schema matches production's    | FR-005, C-03 | terminal    |

## Out of scope

- Creating analyses from a repository address → `008`.
- What the tables hold beyond organization ownership → each spec's `plan.md`.

## Open questions

None. Resolved 2026-10-17: until `008` creates analyses, sample analyses
fill the development database only (C-04), so the list, its states and
switching can be built and checked there; a deployed dashboard shows the
empty state (FR-007). Deleting an organization's records happens when the
identity provider says it was deleted, a notice that can repeat or arrive
late (edge cases).
