# 0002 — Hosting on Vercel with Nitro

**Status:** Accepted
**Date:** 2026-10-16

## Context

Spec `000` asks the host for one deployable application that renders on the
server (FR-001), lets one request run for `MAX_RUN_SECONDS` = 300 seconds
(FR-002), deploys every proposed change to its own preview address (FR-010),
and needs no queue or worker (C-01). The parser (`001`) reads a directory on
disk, so the server needs a file system. The project is personal, so a free
plan matters.

TanStack Start deploys to any host through its adapters or through Nitro.
Its guide lists Cloudflare, Netlify and Railway as official hosting partners;
Vercel is documented through Nitro.

## Decision

Host on **Vercel**, on the Hobby plan, building the server with **Nitro 3**
(`nitro/vite`), as both
[TanStack's hosting guide](https://tanstack.com/start/latest/docs/framework/react/guide/hosting#vercel)
and [Vercel's TanStack Start guide](https://vercel.com/docs/frameworks/full-stack/tanstack-start)
describe.

- Nitro builds the `vercel` preset on Vercel and a Node.js server elsewhere.
  The server is one Vercel Function on Fluid compute, Node.js 24.
- The function's maximum duration is set from `MAX_RUN_SECONDS`
  (`apps/web/src/lib/platform.ts`), the most Hobby allows.
- Nitro 3 is published with a `beta` tag. It's pinned to one exact version in
  the pnpm catalog, and every pull request's preview deploy checks the build.

## Alternatives considered

Checked against each provider's own documentation on 2026-10-16:

| Host                 | A 300 s request (`000` FR-002)                                     | File system for the parser | Cost               |
| -------------------- | ------------------------------------------------------------------ | -------------------------- | ------------------ |
| **Vercel** (chosen)  | Yes: 300 s default and maximum on Hobby; 800 s on Pro              | Yes                        | Free (Hobby)       |
| Netlify (partner)    | No: synchronous functions stop at 60 s, not configurable           | Yes                        | Free tier          |
| Cloudflare (partner) | No on Free: 10 ms of CPU per request; up to 5 min of CPU when paid | No ordinary file system    | Paid from $5/month |
| Railway (partner)    | Likely (a long-running container); not checked                     | Yes                        | Paid only          |

Netlify's 15-minute background functions return no response to the request,
which makes them a worker; `000` C-01 rules that out.

## Consequences

- **pnpm 11.** Vercel installs pnpm 6 to 10 by itself. It uses the version in
  `packageManager` only through Corepack, which the project turns on with the
  `ENABLE_EXPERIMENTAL_COREPACK=1` environment variable.
- **Node.js** comes from `engines` in `package.json` (`24.x`), the same
  version `.node-version` gives CI and local tools.
- **Monorepo.** The Vercel project's Root Directory is `apps/web`; Vercel
  runs `turbo run build` and infers the filter. Turborepo caches the build's
  outputs, `.output/` and `.vercel/output/`.
- **Nitro upgrades** are deliberate: a new beta is tried on a pull request,
  where its preview deploy shows whether the build still works.
- **Leaving Vercel** means changing Nitro's preset, or replacing Nitro with
  another host's adapter; the application code doesn't change.
- **800 s or more** would need the Pro plan, and a change to
  `MAX_RUN_SECONDS` and spec `000`.
