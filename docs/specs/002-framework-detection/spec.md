# 002 — Framework detection

**Status:** Draft
**Milestone:** M1 Engine
**Depends on:** 001-repository-parser

## Summary

Cartograph recognises the framework a repository follows, gives each file the
role its framework names it by, marks its entry points, and recovers its
routes exactly or not at all.

Someone reading a NestJS repository wants "Controllers 4", not "Entry points
4". Framework knowledge lives in adapters, never in the parser
(`docs/project-doc.md`: framework knowledge is an adapter, not a branch). A
route that can't be recovered exactly is the same failure as an invented edge.

## Requirements

### Detection

- **FR-001** The system shall run adapters in the fixed order Next.js, NestJS,
  Express, React, and use the first that recognises the repository.
- **FR-002** If no adapter recognises the repository, then the system shall use
  the generic adapter, which gives every file the role "Unidentified" and
  recovers no routes.
- **FR-003** The system shall record which framework was detected, or none.

### Roles and entry points

- **FR-004** The adapter shall give each file a role from its framework's
  taxonomy, from conventions only: path, file name and parsed syntax.
- **FR-005** The adapter shall mark as an entry point every file its framework
  loads without an import: pages, layouts, route handlers, middleware,
  configuration files and files a package manifest names.
- **FR-006** Each framework's taxonomy shall list its roles in a fixed reading
  order, by tier: surface roles first, then layer roles, then plumbing, then
  Unidentified.
- **FR-007** The Next.js taxonomy shall include Page routes, API endpoints and
  Server actions; the NestJS taxonomy shall include Controllers, Services,
  Modules and Entities; the Express taxonomy shall accept both singular and
  plural folder names for each role (`route` and `routes`).

### Routes

- **FR-008** The Next.js adapter shall recover routes from file paths, with the
  method from the exported handler name.
- **FR-009** The NestJS adapter shall recover routes by joining the
  controller's path and the method's path, with the method from the method's
  decorator.
- **FR-010** If either a route's method or its full path pattern needs
  inference, then the adapter shall emit no route for it.
- **FR-011** The Express and React adapters shall emit no routes.

## Constraints

- **C-01** Routes are exact or absent. _Why:_ a wrong route is the same failure
  as an invented edge. _Looks fine until:_ a route built from a variable path
  segment is "probably" `/users/:id`.
- **C-02** The taxonomy is readable without the adapters. _Why:_ the interface
  needs the list of role names without pulling a parser or a file system into
  the browser. _Looks fine until:_ the interface bundle doubles in size.
- **C-03** Role names are concrete. _Why:_ the reader thinks in the
  framework's own words. _Looks fine until:_ every repository shows the same
  abstract "Entry points" and "Modules".
- **C-04** Reading order is fixed. _Why:_ the same repository must always place
  its roles in the same positions on the rail. _Looks fine until:_ roles are
  sorted by count and move between analyses.
- **C-05** Framework names appear only in their adapter. _Why:_ the adapter
  interface exists to keep them out of the parser. _Looks fine until:_ a
  search for "nextjs" finds the parser.
- **C-06** Express routes are not recovered. _Why:_ they're assembled at
  runtime from routers, variables and middleware, so no exact route can be
  read from the syntax. _Looks fine until:_ a route is read from the first `app.get()` call and the router it's mounted on adds a prefix.

## Edge cases

- A repository using both Next.js and React → Next.js, first in order.
- A file matching no role in a detected framework → Unidentified.
- A Next.js dynamic segment (`[id]`) → recovered as a path parameter, exactly.
- A NestJS controller with a path from a constant imported from another file →
  no route.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                                                 | Covers                 | Verified by |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- |
| AC-01 | Given a Next.js repository, when it's detected, then its taxonomy shows Page routes, API endpoints and Server actions with correct counts           | FR-001, FR-004, FR-007 | terminal    |
| AC-02 | Given a NestJS repository, when it's detected, then its taxonomy shows Controllers, Services and Modules, and routes carry method and full path     | FR-007, FR-009         | terminal    |
| AC-03 | Given the NestJS routes recovered, when three are compared with the code by hand, then method and path match exactly                                | FR-009, C-01           | terminal    |
| AC-04 | Given a repository matching no adapter, when it's detected, then every file is Unidentified and there are no routes                                 | FR-002, FR-003         | test        |
| AC-05 | Given an Express repository with singular and plural folder names, when it's detected, then both get the same roles and no routes                   | FR-007, FR-011         | test        |
| AC-06 | Given the parser's source, when it's searched for any framework name, then each name appears only in its adapter                                    | C-05                   | test        |
| AC-07 | Given a route whose path is built from a variable, when its adapter runs, then no route is emitted for it                                           | FR-010                 | test        |
| AC-08 | Given a Next.js repository, when it's detected, then its pages, layouts, middleware and configuration files are entry points                        | FR-005                 | test        |
| AC-09 | Given any taxonomy, when its roles are listed, then surface roles come first, then layer, plumbing and Unidentified, in the same order on every run | FR-006, C-04           | test        |
| AC-10 | Given a Next.js route handler exporting `GET` and `POST`, when its adapter runs, then two routes are recovered with the exact path pattern          | FR-008                 | test        |

## Golden data

| Input                               | Expected                                    |
| ----------------------------------- | ------------------------------------------- |
| [NEEDS CLARIFICATION] Next.js @ sha | Role counts per taxonomy entry, route list  |
| [NEEDS CLARIFICATION] NestJS @ sha  | Role counts per taxonomy entry, route list  |
| [NEEDS CLARIFICATION] Express @ sha | Role counts per taxonomy entry, zero routes |

## Out of scope

- Roles for files no adapter identifies → `009` (inferred roles).
- Showing routes → `005`.

## Open questions

- [NEEDS CLARIFICATION] Repositories holding several apps (a Next.js app and a
  NestJS API side by side): one adapter per repository (proposed for now), or
  one per package the repository contains?
- [NEEDS CLARIFICATION] Next.js: are both the `app` and `pages` routing
  conventions in scope?
- [NEEDS CLARIFICATION] Golden repositories and commits for the three rows.
