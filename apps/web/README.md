# web

Cartograph's one deployable application: the TanStack Start app that renders
on the server, deployed to Vercel through Nitro.

## Why a separate package

It's the only deployable part (spec 000, C-01). Everything else is a package
it depends on by name (`@workspace/ui` today), so the parser, detection and
the interface stay reusable and testable without it.

## Use

From the repository root:

| Command                  | What it does                              |
| ------------------------ | ----------------------------------------- |
| `pnpm dev`               | Starts the app at <http://localhost:3000> |
| `pnpm build`             | Builds it for Vercel (`.vercel/output`)   |
| `pnpm --filter web test` | Runs its tests (Vitest)                   |

Configuration is checked at start: a required value that is missing, blank
or invalid stops the app, naming each one (`src/lib/config.ts`). Server-only code lives in
`*.server.ts` files.

## Status

Deployed: pull requests get a preview address, and `main` goes to
production.

## Docs

[Spec 000](../../docs/specs/000-platform-requirements/spec.md) ·
[ADR 0002: hosting on Vercel with Nitro](../../docs/adr/0002-hosting-on-vercel-with-nitro.md) ·
[AGENTS.md: Rendering](../../AGENTS.md#rendering-tanstack-start)
