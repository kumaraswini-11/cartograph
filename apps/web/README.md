# web

Cartograph's one deployable application: the TanStack Start app that renders
on the server, deployed to Vercel through Nitro.

## Why a separate package

It's the only deployable part (spec 000, C-01). Everything else is a package
it depends on by name (`@workspace/ui`, `@workspace/graph` and the parser's
and detection's contracts), so they stay reusable and testable without it.

## Use

From the repository root:

| Command                         | What it does                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm dev`                      | Starts the app at <http://localhost:3000>                                                            |
| `pnpm build`                    | Builds it: a Node.js server in `.output`, or `.vercel/output` on Vercel                              |
| `pnpm --filter web test`        | Runs its tests (Vitest)                                                                              |
| `pnpm --filter web og-image`    | Redraws the share image, `public/og.png`                                                             |
| `pnpm --filter web sample`      | Rewrites the sample maps, `src/sample/*.gen.ts`                                                      |
| `pnpm --filter web clerk:check` | Checks the session token's claims and roles on Clerk's development instance (spec 006, AC-06, AC-08) |

Configuration is checked at start: a required value that is missing, blank
or invalid stops the app, naming each one (`src/lib/config.ts`); the values
are listed in `.env.example`. Server-only code lives in `*.server.ts` files;
server functions in `*.functions.ts`. `src/start.ts` holds every request's
middleware, and the dev server reads it only when it starts: restart it after
changing that file.

Sign-in is Clerk's (spec 006): `/sign-in` signs in and up, and every page
under `src/routes/_identity/_signed-in/` is protected, read from the session token
(`src/lib/session.ts`) without asking Clerk. Clerk loads only under
`src/routes/_identity/`: home and the samples are public and never load it.

`/sample/$name` shows the map of one of three fixed repositories
(`src/sample/samples.ts`) until spec 008 stores real analyses. Not-found,
error and loading pages are set once, in `src/router.tsx`. Search and share
tags come from `src/lib/site.ts`.

## Status

Deployed: pull requests get a preview address, and `main` goes to
production.

## Docs

[Spec 000](../../docs/specs/000-platform-requirements/spec.md) ·
[Spec 003](../../docs/specs/003-dependency-map/spec.md) ·
[Spec 006](../../docs/specs/006-sign-in-and-organizations/spec.md) ·
[ADR 0002: hosting on Vercel with Nitro](../../docs/adr/0002-hosting-on-vercel-with-nitro.md) ·
[AGENTS.md: Rendering](../../AGENTS.md#rendering-tanstack-start)
