# 0001 — Stack and repository layout

**Status:** Accepted
**Date:** 2026-10-15

## Context

The specs in `docs/specs/` name no framework, library or vendor; they ask for
capabilities (`000-platform-requirements`). Any stack that provides those
capabilities can build Cartograph: one package or several, any UI framework,
any storage, identity and AI services. This record says what this repository
chose, and why.

Three rules from the specs shape the choice:

- **One deployable application** (`000` C-01): no queues, containers or
  workers.
- **The parser runs standalone** (`001` C-01): it knows no framework,
  interface or storage, and runs from a plain script.
- **Framework knowledge lives in adapters** (`002`), and the role taxonomy is
  readable without them (`002` C-02).

## Decision

### Repository: a modular monolith in a monorepo

One deployable application, with its code split into packages that can only
reach each other through declared dependencies.

```text
apps/
  web/        the one deployable application
packages/
  ui/         shared UI: shadcn components, the theme, cn
  …           added as specs need them: the parser (001), the adapters and
              taxonomy (002), the graph arithmetic (004, 005)
```

- **pnpm workspaces** link the packages, and the **pnpm catalog** defines every
  dependency's version once.
- **Turborepo** runs each package's tasks in dependency order and caches them.

A package boundary is what makes "the parser runs standalone" checkable: the
parser's package declares no dependency on the app, a UI library or a storage
client, and pnpm installs only declared dependencies where a package can
resolve them, so an import of one fails.

### Application: TanStack Start

TanStack Start, on React 19 and Vite, renders pages on the server and runs
server functions on request (`000` FR-001). Its routes are files with
generated, type-checked route types.

### Interface: shadcn/ui on Base UI, with Tailwind CSS

shadcn/ui components are copied into `packages/ui` as source, so the
repository owns every component and can read and change it. Base UI provides
the accessible behaviour underneath; Tailwind CSS 4 provides the styling and
the theme tokens.

### Language and checks

TypeScript in strict mode, ESLint (`@tanstack/eslint-config`) and Prettier.
CI runs a dependency audit, the format check, lint, type check and build on
every change (`000` FR-009).

### Services, chosen when their first spec is built

Each is confirmed, or replaced, in its spec's `plan.md` when that spec starts
(`000` C-02).

| Capability (`000`)                                  | Planned choice                                                                 | First spec |
| --------------------------------------------------- | ------------------------------------------------------------------------------ | ---------- |
| Sign-in, organizations, a token carrying the claim  | Clerk                                                                          | `006`      |
| Storage with row-level policies and pushed changes  | Supabase (Postgres)                                                            | `007`      |
| Drawing and laying out the map                      | React Flow and dagre                                                           | `003`      |
| Tracing model calls                                 | LangSmith                                                                      | `009`      |
| Hosting with server rendering and preview addresses | Vercel, with Nitro (decided: [ADR 0002](0002-hosting-on-vercel-with-nitro.md)) | `000`      |

## Alternatives considered

- **A single package.** Simpler to start, and it meets every capability. Here
  nothing would stop the app's code from reaching into the parser, or the
  parser from importing a storage client, so `001` C-01 would rely on
  discipline rather than structure.
- **Separate services (microservices).** Ruled out by `000` C-01: one
  deployable application.
- **Next.js.** Meets every capability in `000` too, and an earlier version of
  Cartograph was built on it. This repository uses TanStack Start instead.
- **A component library installed as a dependency** (rather than copied
  source). Faster to adopt, but its components can't be read or changed in
  place, and its upgrades arrive all at once.

## Consequences

- New code goes into the package that owns it. A package that needs another
  declares it as a dependency and imports it by its package name, never by a
  relative path into it.
- Each package has its own lint, type check and build, which Turborepo runs and
  caches.
- Swapping any service in the table above changes that spec's `plan.md` and
  this record, never a `spec.md`.
