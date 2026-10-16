# 002 — Framework detection: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** Done

## T01 — Packages, taxonomy and the generic adapter

**Status:** Done
**Blocked by:** none
**Covers:** FR-001 to FR-009, C-02, C-07, AC-04, AC-09, AC-11 (merge), AC-14

**What to build:** `packages/frameworks` with its result schema, the
taxonomy entry point, package finding, the entry points every package has,
the generic adapter, and `detect <directory>`.

**Done when:**

- [x] Every file gets its innermost package, a role and an entry-point flag.
- [x] Taxonomies merge tier by tier, a shared role name once, Unidentified
      last.
- [x] The taxonomy entry point imports only taxonomy data.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T02 — Next.js

**Status:** Done
**Blocked by:** T01
**Covers:** FR-010, FR-014, FR-015, FR-017, FR-018, AC-07, AC-08, AC-10,
AC-12

**What to build:** roles and entry points from the `app` and `pages`
folders, Server actions, Proxy; routes from route handlers, with the base
path.

**Done when:**

- [x] Route groups and slots leave the path; intercepting segments, a
      non-literal base path and `pages/api` give no route.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T03 — NestJS

**Status:** Done
**Blocked by:** T01
**Covers:** FR-011, FR-014, FR-016, FR-017, AC-07, AC-13

**What to build:** roles from suffixes and decorators, the application's
entry file, and routes joined from the global prefix, version, controller
and method.

**Done when:**

- [x] Any non-literal piece, `@All`, a wildcard `exclude` or a
      `RouterModule` path gives no route, as the plan's D-06 says.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T04 — Express and React

**Status:** Done
**Blocked by:** T01
**Covers:** FR-012, FR-013, FR-014, FR-018, AC-05

**What to build:** roles from folder names (singular and plural for
Express), Hooks and Contexts for React, the listening and mounting files as
entry points; no routes.

**Done when:**

- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T05 — Boundaries and golden runs

**Status:** Done
**Blocked by:** T02, T03, T04
**Covers:** C-05, AC-01, AC-02, AC-03, AC-06

**What to build:** the AC-06 test, `@workspace/golden` shared with the
parser, and `scripts/golden.ts` over the four golden repositories.

**Done when:**

- [x] AC-06 passes: no framework name in the parser, each name only in its
      adapter folder.
- [x] The four golden repositories are detected; their role counts are
      checked against their trees and three NestJS routes against the code.
- [x] The counts and routes are pinned in the spec's golden data.

**Checked by hand (2026-10-16):**

- vercel/commerce: the 5 pages, 5 metadata files, 3 layouts, the route
  handler (`POST` at line 4) and `components/cart/actions.ts` as the one
  Server actions file; the one Unidentified file is a colocated component.
- shadcn-ui/taxonomy: route groups left out of every path; `pages/api` an
  API endpoint with no route; `middleware.ts` as Proxy; `_route.ts` not a
  route handler.
- nestjs-realworld: all 21 route decorators against the code, three of them
  line by line: `GET /api/articles/:slug/comments` (article controller,
  line 43), `POST /api/users/login` (user controller, line 43),
  `POST /api/profiles/:username/follow` (profile controller, line 23).
- node-express-boilerplate: each folder's role, singular and plural; no
  routes.

The first run found two gaps, fixed before pinning: tests took their
folder's role (plan D-09), and Next.js `config` folders were Unidentified.

## T06 — Acceptance

**Status:** Done
**Blocked by:** T05
**Covers:** AC-01 to AC-14

**Done when:**

- [x] Every acceptance criterion passes, each checked the way its row says.
- [x] Build status at the top of this file set to Done.
