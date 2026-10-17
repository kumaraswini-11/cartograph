# 007 — Organization dashboard: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** In progress

## T01 — `006`'s preview checks, carried over

**Status:** Todo
**Blocked by:** none
**Covers:** `006` AC-01 (GitHub, Google), AC-02, AC-03, AC-05, AC-07

**What to build:** nothing; the repository's owner checks the deployed app
(`006` tasks, T05), and `006`'s tasks file records the result.

**Done when:**

- [ ] Each check passes, or what fails is fixed, and `006`'s T05 says so.

## T02 — The database package and its schema

**Status:** In progress (its CI job runs on the first push)
**Blocked by:** none
**Covers:** FR-001 to FR-005, C-01, C-03, AC-03 to AC-06, AC-08, D-01 to
D-04, D-06

**What to build:** `@workspace/database` with Supabase's project folder; the
migrations (row-level access by default, grants revoked, `organizations`,
`analyses`, `runs`, policies); the pgTAP tests; the generated types; the
client moved from `apps/web`; the database tests and Supabase's checks in
CI.

**Done when:**

- [ ] `supabase test db` passes AC-03 to AC-06 and AC-08 locally and in CI,
      and `supabase db advisors` reports no error.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — Staging and production

**Status:** Todo
**Blocked by:** T02
**Covers:** FR-005, C-03, AC-09, D-05

**What to build:** with the repository's owner, the staging project and the
secrets; CI pushing migrations to staging for a pull request and to
production for `main`.

**Done when:**

- [ ] A pull request's migrations reach staging, and production's schema
      matches the migrations (AC-09).

## T04 — The dashboard's list

**Status:** Done
**Blocked by:** T02
**Covers:** FR-006 to FR-008, C-02, C-04, AC-01, AC-02, AC-07, D-08, D-09

**What to build:** `listAnalyses`, `getAnalyses` and the list on
`/dashboard`, each analysis with its latest run's state, or the empty
state; the local seed script.

**Done when:**

- [x] Seeded locally for two organizations, each one's dashboard lists only
      its own, and switching changes the list through the same query.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — Deleting an organization's records

**Status:** Todo
**Blocked by:** T02
**Covers:** FR-002, the spec's edge cases, D-07

**What to build:** the Clerk webhook route, its signature check and the
delete with the secret key.

**Done when:**

- [ ] A signed `organization.deleted` removes that organization's rows, a
      repeat changes nothing, and an unsigned request is refused.
- [ ] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T06 — Acceptance

**Status:** Todo
**Blocked by:** T03, T04, T05
**Covers:** AC-01 to AC-09

**Done when:**

- [ ] Every acceptance criterion passes, each checked the way its row says,
      the browser ones on the preview deployment.
- [ ] Build status at the top of this file set to Done.
