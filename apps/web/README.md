# web

Cartograph's one deployable application: the TanStack Start app that renders
on the server, deployed to Vercel through Nitro.

## Why a separate package

It's the only deployable part (spec 000, C-01). Everything else is a package
it depends on by name (`@workspace/ui`, `parser`, `frameworks`, `graph`,
`github`, `database` and `ai`), so they stay reusable and testable without
it.

## Use

From the repository root:

| Command                                | What it does                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm dev`                             | Starts the app at <http://localhost:3000>                                                            |
| `pnpm build`                           | Builds it: a Node.js server in `.output`, or `.vercel/output` on Vercel                              |
| `pnpm --filter web test`               | Runs its tests (Vitest)                                                                              |
| `pnpm --filter web og-image`           | Redraws the share image, `public/og.png`                                                             |
| `pnpm --filter web browser-check`      | Checks pages in a real browser: `console`, `axe` or `profile` (below)                                |
| `pnpm --filter web lighthouse-summary` | Each Lighthouse report's numbers, and the median of the runs                                         |
| `pnpm --filter web clerk:check`        | Checks the session token's claims and roles on Clerk's development instance (spec 006, AC-06, AC-08) |

Configuration is checked at start: a required value that is missing, blank
or invalid stops the app, naming each one (`src/lib/config.ts`); the values
are listed in `.env.example`. Server-only code lives in `*.server.ts` files;
server functions in `*.functions.ts`. `src/start.ts` holds every request's
middleware: the security headers, CSRF, Clerk's, and error reports. The dev
server reads it only when it starts: restart it after changing that file.

Sign-in is Clerk's (spec 006): `/sign-in` signs in and up, and every page
under `src/routes/_identity/_signed-in/` is protected, read from the session token
(`src/lib/session.ts`) without asking Clerk. Clerk loads only under
`src/routes/_identity/`: home is public and never loads it.

Storage is `@workspace/database` (spec 007): the dashboard lists the current
organization's analyses through it, with the signed-in person's token, so
the database's policies decide whose rows they are. Locally, point
`VITE_SUPABASE_URL` at the local database (`pnpm --filter @workspace/database
db:start`) and fill it with `db:seed --organization <your Clerk
organization's ID>`; see that package's README.

A member maps a repository from the dashboard (spec 008): the run starts
after the response (`src/lib/run.server.ts`, `background.server.ts`), parses
in a worker thread (`parse.worker.ts`), and its stages are pushed to
`/analyses/$analysisId` and the dashboard as storage records them
(`src/lib/progress.ts`). Every map is a stored analysis; none is checked in.
Not-found, error and loading pages are set once, in `src/router.tsx`. Search
and share tags come from `src/lib/site.ts`.

A file or box is explained (spec 009, `src/lib/explanations.server.ts`) and a
question answered as a stream (spec 010,
`src/routes/api/analyses.$analysisId.chat.ts`), both by `@workspace/ai`, from
the stored analysis and never the request. The map's layout is made in a
Web Worker (`src/components/map/layout.worker.ts`), off the page's main
thread.

Production readiness (spec 012):

- **Limits** per organization (`src/lib/limits.ts`, `limits.server.ts`): 20
  runs an hour and 100 model calls a day, refused with when they're allowed
  again.
- **Errors and events** to PostHog (`src/lib/telemetry.ts`, `.server.ts`,
  `.browser.ts`): the five product events from the server; unhandled errors
  from both sides, with the release, reported bare. Off without its key.
- **Security headers** on every response (`src/lib/headers.ts`,
  `headers.server.ts`): set by the outermost middleware, with a nonce new for
  each response that the router puts on its own scripts (`src/router.tsx`);
  `src/server.ts` adds them to an error Start answers itself.
- **Accessibility**: `src/a11y.test.tsx` renders every page through the
  router and audits it with axe-core for WCAG 2.2 AA.
- **Speed Insights** in Vercel builds, by route pattern.

<!-- ## Checking in a real browser

The tests can't see what only a laid-out page shows: what the content
security policy blocks, contrast and target size, where the main thread's
time goes. `browser-check` drives Edge or Chrome (or the one `BROWSER` names)
for that, against a production build, which is the only one that sends the
policy:

```bash
# In apps/web: build, then serve it (PORT=3100 keeps 3000 free for pnpm dev).
pnpm build && node --env-file=.env.local .output/server/index.mjs

pnpm --filter web browser-check console http://localhost:3100 / /sign-in
pnpm --filter web browser-check axe     http://localhost:3100 / /sign-in
pnpm --filter web browser-check profile http://localhost:3100 /
```

- **Signed-in pages** need a browser someone has signed in to. Start Chrome
  with a debugging port and a profile of its own (any free port, and any
  empty folder), sign in there, then add `--port`:

  ```bash
  chrome --remote-debugging-port=9341 --user-data-dir=<an empty folder> http://localhost:3100/sign-in
  pnpm --filter web browser-check axe http://localhost:3100 /dashboard --port 9341
  ```

  The check brings its tab to the front: a tab in the background doesn't lay
  itself out, so a map stays unfitted.

- **Lighthouse** runs in that same window, so it's signed in, and keeps its
  cookies with `--disable-storage-reset`. One run varies widely on a busy
  machine: run a page five times and compare the medians.

  ```bash
  npx lighthouse@13.4.1 http://localhost:3100/dashboard --port=9341 --disable-storage-reset --only-categories=performance,accessibility --output=json --output-path=run-1.json
  pnpm --filter web lighthouse-summary run-*.json
  ```

- **Build with the database you run against.** `VITE_` values are built into
  the page: a build made with the cloud project's address, served with the
  local database's, has its browser dial the cloud, and the policy rightly
  blocks it. Set the same `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` for `pnpm build` as for the server. -->

## Status

Deployed: pull requests get a preview address, and `main` goes to
production.

## Docs

[Spec 000](../../docs/specs/000-platform-requirements/spec.md) ·
[Spec 003](../../docs/specs/003-dependency-map/spec.md) ·
[Spec 006](../../docs/specs/006-sign-in-and-organizations/spec.md) ·
[Spec 007](../../docs/specs/007-organization-dashboard/spec.md) ·
[Spec 008](../../docs/specs/008-repository-analysis/spec.md) ·
[Spec 009](../../docs/specs/009-file-explanations/spec.md) ·
[Spec 010](../../docs/specs/010-repository-chat/spec.md) ·
[Spec 012](../../docs/specs/012-production-readiness/spec.md) ·
[ADR 0002: hosting on Vercel with Nitro](../../docs/adr/0002-hosting-on-vercel-with-nitro.md) ·
[ADR 0003: the AI model and tracing](../../docs/adr/0003-ai-model-and-tracing.md) ·
[AGENTS.md: Rendering](../../AGENTS.md#rendering-tanstack-start)
