# 002 — Framework detection

**Status:** Approved
**Milestone:** M1 Engine
**Depends on:** 001-repository-parser

## Summary

Cartograph recognises the framework each package of a repository follows,
gives each file the role its framework names it by, marks its entry points,
and recovers its routes exactly or not at all.

Someone reading a NestJS repository wants "Controllers 4", not "Entry points
4". Framework knowledge lives in adapters, never in the parser
(`docs/project-doc.md`: framework knowledge is an adapter, not a branch). A
route that can't be recovered exactly is the same failure as an invented edge.

## Requirements

### Packages and detection

- **FR-001** The system shall divide the repository into packages: the
  repository itself, and each folder in it with its own package manifest,
  workspace packages (`001` FR-012) among them. Each file belongs to the
  innermost package that holds it.
- **FR-002** For each package, the system shall run the adapters in the fixed
  order Next.js, NestJS, Express, React, and use the first that recognises the
  package from the packages its manifest declares.
- **FR-003** If no adapter recognises a package, then the system shall use the
  generic adapter, which gives each of its files the role "Unidentified" and
  recovers no routes.
- **FR-004** The system shall record each package's path and the framework
  detected for it, or none.

### Roles and entry points

- **FR-005** The adapter shall give each file of its package one role from its
  framework's taxonomy (below), from conventions only: path, file name and
  parsed syntax. A file matching no role is Unidentified, and so is every
  test file (FR-007): a test of a model isn't a model.
- **FR-006** The adapter shall mark as an entry point every file its framework
  loads without an import (below).
- **FR-007** Whatever the framework, the system shall mark as an entry point
  every file a package manifest names (its main file, exports and command
  files) or runs from a script, every configuration file a tool finds by name
  (`*.config.*`), and every test file (`*.test.*`, `*.spec.*`, or under a
  `__tests__` folder).
- **FR-008** Each taxonomy shall list its roles in a fixed reading order, by
  tier: surface roles first, then layer roles, then plumbing, then
  Unidentified.
- **FR-009** When a repository's packages follow more than one framework, the
  system shall give the analysis one taxonomy: surface roles of every
  framework first (frameworks in the order of FR-002), then layer roles, then
  plumbing, then Unidentified once. A role name that two frameworks share
  appears once.

### Taxonomies

| Framework | Surface                                                    | Layer                                            | Plumbing                                         |
| --------- | ---------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Next.js   | Page routes, API endpoints, Server actions, Metadata files | Layouts, Loading and error UI, Components, Hooks | Proxy, Instrumentation, Configuration, Utilities |
| NestJS    | Controllers, Gateways, Resolvers                           | Services, Modules, Entities, DTOs                | Guards, Interceptors, Pipes, Filters, Middleware |
| Express   | Routes, Controllers                                        | Services, Models, Validations                    | Middleware, Configuration, Utilities             |
| React     | Pages                                                      | Components, Hooks, Contexts                      | Configuration, Utilities                         |

- **FR-010** The Next.js adapter shall read both of its routing conventions,
  at the package root or under `src`. In the `app` folder: `page` files
  are Page routes, `route` files API endpoints, `layout` and
  `template` files Layouts, `loading`, `error`, `global-error`,
  `not-found`, `forbidden` and `unauthorized` files, and `default` (a
  parallel-route slot's fallback, not an address), Loading and error UI, and
  `icon`, `apple-icon`, `opengraph-image`, `twitter-image`, `sitemap`,
  `robots` and `manifest` files Metadata files; nothing under a private
  folder (`_name`) is a routing file. In the `pages` folder: `_app` and
  `_document` are Layouts, `_error`, `404` and `500` Loading and error UI,
  files under `pages/api` API endpoints, and every other file a Page route. A
  file whose first statement is the `"use server"` directive is a Server
  action. `proxy`, and its earlier name `middleware`, is Proxy;
  `instrumentation` is Instrumentation.
- **FR-011** The NestJS adapter shall give roles from the file-name suffix
  (`.controller`, `.gateway`, `.resolver`, `.service`, `.module`,
  `.entity`, `.dto`, `.guard`, `.interceptor`, `.pipe`, `.filter`,
  `.middleware`), and from a class's decorator (`@Controller`,
  `@WebSocketGateway`, `@Resolver`, `@Module`, `@Entity`, `@Injectable`)
  when the suffix names none. The suffix comes first because guards, pipes and
  the other plumbing are `@Injectable` classes too.
- **FR-012** The Express adapter shall give roles from folder names, accepting
  both singular and plural (`route` and `routes`, `controller` and
  `controllers`, and so on).
- **FR-013** The React adapter shall give roles from folder names (`pages`,
  `components`, `hooks`, `contexts`), files named `use*` as Hooks, and files
  that create a context as Contexts.

### Entry points by framework

- **FR-014** Next.js entry points shall be every file the `app` and `pages`
  folders give a role (Page routes, API endpoints, Layouts, Loading and error
  UI, Metadata files), Proxy, Instrumentation and its configuration file. NestJS entry points shall be the file that creates the application.
  Express entry points shall be the file that starts listening. React entry
  points shall be the file that mounts the application.

### Routes

- **FR-015** The Next.js adapter shall recover a route for each method a route
  handler in the `app` folder exports by name (`GET`, `POST`, `PUT`, `PATCH`,
  `DELETE`, `HEAD`, `OPTIONS`), with its path from the folders above it,
  written in Next.js's own notation (`/posts/[postId]`). Route groups
  (`(name)`) and parallel-route slots (`@name`) are left out of the path, as
  Next.js leaves them out of the address. When the configuration sets a base
  path, it leads every path.
- **FR-016** The NestJS adapter shall recover each route's full path by joining,
  in order, the application's global prefix, the version (when URI versioning
  is on), the controller's path and the method's path, with the method from the
  method's decorator (`@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`, `@Head`,
  `@Options`), written in NestJS's own notation (`/api/articles/:slug`).
- **FR-017** If any piece of a route's method or full path isn't written as a
  literal in the code, then the adapter shall emit no route for it.
- **FR-018** The Express and React adapters, and the Next.js `pages` folder,
  shall emit no routes.

## Constraints

- **C-01** Routes are exact or absent. _Why:_ a wrong route is the same failure
  as an invented edge. _Looks fine until:_ a NestJS route is shown as
  `/articles` while the application's global prefix makes it `/api/articles`.
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
  read from the syntax. _Looks fine until:_ a route is read from the first
  `app.get()` call and the router it's mounted on adds a prefix.
- **C-07** Detection reads only the repository. _Why:_ an analysis must be the
  same whether or not the repository's packages are installed (`001` FR-022).
  _Looks fine until:_ a framework is detected from an installed package that a
  fetched archive doesn't have.

## Edge cases

- A repository holding a Next.js app and a NestJS API as two packages → each
  package's files get their own framework's roles; the repository records both.
- A package using both Next.js and React → Next.js, first in order.
- A NestJS package also declaring Express (its HTTP platform) → NestJS, first
  in order.
- A file at the repository root, outside every workspace package → the
  repository's own package.
- A Next.js dynamic segment (`[id]`, `[...slug]`, `[[...slug]]`) → kept in the
  path as written.
- A Next.js route under an intercepting segment (`(.)photo`) → no route.
- A Next.js `pages/api` file → an API endpoint, but no route: one handler
  serves every method, so its method isn't in the syntax.
- A NestJS global prefix read from configuration at runtime → no routes for
  that package.
- A NestJS route excluded from the global prefix by a literal list → its path
  without the prefix.
- A NestJS controller with a path from a constant imported from another file →
  no route.
- A NestJS controller listing several paths → one route per path.
- A NestJS `@All` method → no route: it isn't one method.
- A NestJS package that sets path prefixes per module → no routes for that
  package.

## Acceptance criteria

| ID    | Given / When / Then                                                                                                                                                          | Covers                 | Verified by |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- |
| AC-01 | Given a Next.js repository, when it's detected, then its taxonomy shows Page routes, API endpoints and Server actions with correct counts                                    | FR-002, FR-005, FR-010 | terminal    |
| AC-02 | Given a NestJS repository, when it's detected, then its taxonomy shows Controllers, Services and Modules, and routes carry method and full path, global prefix included      | FR-011, FR-016         | terminal    |
| AC-03 | Given the NestJS routes recovered, when three are compared with the code by hand, then method and path match exactly                                                         | FR-016, C-01           | terminal    |
| AC-04 | Given a repository matching no adapter, when it's detected, then every file is Unidentified, there are no routes and the framework recorded is none                          | FR-003, FR-004         | test        |
| AC-05 | Given an Express repository with singular and plural folder names, when it's detected, then both get the same roles and no routes                                            | FR-012, FR-018         | test        |
| AC-06 | Given the parser's source, when it's searched for any framework name, then each name appears only in its adapter                                                             | C-05                   | test        |
| AC-07 | Given a route whose path is built from a variable, when its adapter runs, then no route is emitted for it                                                                    | FR-017                 | test        |
| AC-08 | Given a Next.js repository, when it's detected, then its pages, layouts, Proxy and configuration file are entry points                                                       | FR-014                 | test        |
| AC-09 | Given any taxonomy, when its roles are listed, then surface roles come first, then layer, plumbing and Unidentified, in the same order on every run                          | FR-008, C-04           | test        |
| AC-10 | Given a Next.js route handler exporting `GET` and `POST`, when its adapter runs, then two routes are recovered with the exact path pattern                                   | FR-015                 | test        |
| AC-11 | Given a repository with a Next.js package and a NestJS package, when it's detected, then each package's files carry their own framework's roles and the taxonomy is merged   | FR-001, FR-004, FR-009 | test        |
| AC-12 | Given a Next.js package using the `pages` folder, when it's detected, then its pages are Page routes and entry points, and `pages/api` files are API endpoints with no route | FR-010, FR-018         | test        |
| AC-13 | Given a NestJS package whose global prefix is read from configuration, when its adapter runs, then it has no routes; with a literal prefix and version, both lead each path  | FR-016, FR-017         | test        |
| AC-14 | Given a package of any framework, or none, when it's detected, then its test files, configuration files and files its manifest names are entry points                        | FR-007                 | test        |

## Golden data

The counts are recorded by the first run that passes the hand checks in
`tasks.md`, then pinned here.

| Input                                                                               | Why                                                                         | Expected                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vercel/commerce` @ `3761e52e60df9c6a316e067dbfd7032e494d3634`                      | Next.js `app` folder with pages, a route handler and Server actions (AC-01) | Next.js; 66 files: Page routes 5, API endpoints 1, Server actions 1, Metadata files 5, Layouts 3, Loading and error UI 2, Components 31, Configuration 2, Utilities 15, Unidentified 1; 18 entry points; 1 route, `POST /api/revalidate`                    |
| `shadcn-ui/taxonomy` @ `298a8857c7128a0d121e7f699dfd729f23b3966d`                   | Next.js `app` and `pages` folders side by side (AC-12)                      | Next.js; 131 files: Page routes 14, API endpoints 7 (one under `pages/api`, with no route), Metadata files 1, Layouts 8, Loading and error UI 5, Components 66, Hooks 3, Proxy 1, Configuration 10, Utilities 12, Unidentified 4; 41 entry points; 8 routes |
| `lujakob/nestjs-realworld-example-app` @ `c1c2cc4e448b279ff083272df1ac50d20c3304fa` | NestJS with a literal global prefix (AC-02, AC-03)                          | NestJS; 36 files: Controllers 6, Services 4, Modules 5, Entities 5, DTOs 4, Pipes 1, Middleware 1, Unidentified 10; 3 entry points; 21 routes, each under `/api`                                                                                            |
| `hagopj13/node-express-boilerplate` @ `179ae84efec61b14206d0305d941daed6c6d07f9`    | Express folders by role (AC-05)                                             | Express; 50 files: Routes 4, Controllers 3, Services 5, Models 6, Validations 4, Middleware 4, Configuration 6, Utilities 4, Unidentified 14; 10 entry points; no routes                                                                                    |

Pinned on 2026-10-16, with every route listed in the golden script.

## Out of scope

- Roles for files no adapter identifies → `009` (inferred roles).
- Showing roles on the rail → `003`; showing routes → `005`.
- Frameworks beyond the four above (TanStack Start, Remix, Astro, SvelteKit,
  Nuxt and others): each is a new adapter, added by its own spec with its
  own golden repository; no other part changes. Until then, a repository on
  one of them still gets its full map from the parser (`001`); only its
  files' roles, entry points and routes wait: they come from an adapter it
  does match (a TanStack Start app declares React, so React's), or are
  Unidentified. Vue,
  Svelte and Astro keep code in their own file types, which the parser must
  first learn to read (`001`, out of scope).

## Open questions

None. Resolved 2026-10-16: detection per package (FR-001); both Next.js
routing conventions (FR-010); NestJS paths include the global prefix and
version (FR-016); the golden repositories above.
