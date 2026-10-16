# 000 — Platform requirements: plan

**Spec:** [spec.md](spec.md)
**Status:** Approved

## Approach

The empty application is the TanStack Start app in `apps/web`, built by
Nitro and hosted on Vercel's Hobby plan
([ADR 0002](../../adr/0002-hosting-on-vercel-with-nitro.md)). GitHub Actions
runs the checks on every pull request, and Vercel deploys every pull request to
a preview address. Configuration is validated once, when the server starts.

This repository sets `MAX_RUN_SECONDS` = 300: the most Vercel allows on every
plan, Hobby included. A Pro plan would allow 800.

FR-003 to FR-007 name capabilities whose providers are planned in
[ADR 0001](../../adr/0001-stack-and-repository-layout.md) and built with the
spec that first needs each one.

## Modules and interfaces

| Module                           | What it does                                                                                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/platform.ts`   | `MAX_RUN_SECONDS` = 300: the one source for the request limit, used by the Vite config and later by analysis runs (`008`).                                                                                             |
| `apps/web/src/lib/config.ts`     | `parseConfig(schema, source)`: validates a source (usually `process.env`) against a Zod object, treating empty values as missing. Throws `ConfigError`, whose `problems` names every missing or invalid value at once. |
| `apps/web/src/lib/env.server.ts` | The server's schema and `getServerEnv()`, parsed once and cached. Server-only through the `.server.ts` name and the `@tanstack/react-start/server-only` marker. The schema is empty until a spec needs a value.        |
| `apps/web/src/server.ts`         | The custom server entry. Calls `getServerEnv()` at module load, so a misconfigured server stops on start, then delegates to Start's built-in handler.                                                                  |
| `apps/web/vite.config.ts`        | Adds `nitro()` with `vercel.functions.maxDuration` set to `MAX_RUN_SECONDS`.                                                                                                                                           |
| `.github/workflows/ci.yml`       | Frozen install, `pnpm audit`, `pnpm format:check`, then `turbo run lint typecheck test build --affected`.                                                                                                              |

## Data

None.

## Decisions

- **D-01** Vercel with Nitro 3. _Why:_ the only free host that allows a
  300-second request and gives the parser a file system. _Rejected:_ Netlify,
  Cloudflare and Railway, compared in ADR 0002.
- **D-02** Configuration is validated with Zod, at server start, in a custom
  server entry. _Why:_ TanStack Start's environment guide recommends Zod for
  runtime validation and notes a module-level parse is right for Node.js;
  failing on start meets FR-011. `getServerEnv()` stays a function, so code
  reads it per request, as the execution-model skill requires.
  _Rejected:_ checking each value where it's first used, which fails late and
  one value at a time.
- **D-03** Vitest arrives now. _Why:_ FR-009 runs tests once they exist, and
  `parseConfig` is the first unit worth testing. It has its own minimal
  `vitest.config.ts`, so tests don't load Start, Nitro or Tailwind.
  _Rejected:_ waiting for `001`, which would leave FR-011 checked by hand.
- **D-04** AC-06 reads the deployed function's configured maximum duration
  instead of calling a request that runs 300 seconds. _Why:_ a public endpoint
  that holds a request for five minutes is an easy way to run up cost or
  exhaust capacity. A real long run is proven when `008`'s runs exist.
  _Rejected:_ a guarded diagnostic endpoint, which still ships with the app.

## Stack notes

- **Nitro 3 is published with a `beta` tag** (`3.0.260903-beta`, pinned
  exactly in the catalog). Locally it builds a Node.js server in `.output/`; on
  Vercel, or with `NITRO_PRESET=vercel`, it writes `.vercel/output/` with one
  function, `__server.func`, whose `.vc-config.json` holds
  `"maxDuration": 300` and `"runtime": "nodejs24.x"`.
- **React must stay external** (`traceDeps: ["react", "react-dom"]` in
  `nitro()`). Nitro bundles almost every dependency in production, but the
  CommonJS `use-sync-external-store` shim, which Base UI and TanStack Router
  use, still calls `require("react")` at runtime. Bundled, React wasn't in the
  function, so the first deployment answered every page with a 500
  (`Cannot find module 'react'`); a dependency listed in `traceDeps` is kept
  external and copied into the function, so the bundle and the shim share one
  React. Test the function from a folder outside the repository, or
  `node_modules` hides a missing dependency.
- **pnpm 11 on Vercel.** Vercel installs pnpm 6 to 10 on its own. It uses
  `packageManager` (`pnpm@11.25.0`) only through Corepack: set
  `ENABLE_EXPERIMENTAL_COREPACK=1` in the Vercel project's environment
  variables, for every environment, previews included. `turbo.json` lists it
  in `globalPassThroughEnv`: it changes the install, not the build output, so
  it's declared without entering the cache key, which also silences
  Turborepo's warning about Vercel variables it doesn't know.
- **Node.js 24** comes from `engines` (`24.x`) on Vercel and from
  `.node-version` in CI.
- **Monorepo on Vercel.** Root Directory `apps/web`; Vercel runs
  `turbo run build` and infers the filter from the Root Directory. Turborepo's
  build outputs include `.output/**` and `.vercel/output/**`, so a cache hit
  still leaves the files Vercel deploys.
- **ESLint** ignores `.output/` and `.vercel/` in `apps/web`; without that,
  typed linting fails on the built JavaScript.
- **Import protection** for `.server.ts` files is marked experimental in
  TanStack Start, so `env.server.ts` also imports the `server-only` marker.
- **`process` types.** `apps/web/tsconfig.json` lists `node` in `types`, so
  server code can read `process.env`.

## Testing

- `src/lib/config.test.ts` (Vitest): typed values when everything is present;
  a missing value named; an empty or blank value treated as missing; every
  problem named at once; the message lists them all.
- The build output: the server bundle holds the configuration check and the
  client bundle doesn't; `.vc-config.json` holds the maximum duration.
- By hand, after the Vercel project exists: the production and preview
  addresses render (AC-01, AC-03), and the deployed function's configuration
  (AC-06).

## Risks

- A Nitro beta release breaks the build or the deployment → it's pinned
  exactly; any upgrade goes through a pull request, whose preview deploy shows
  the result before it merges.
- Vercel's Corepack support is experimental → if an install fails on Vercel,
  set the install command to `corepack enable && pnpm install --frozen-lockfile`
  in `vercel.json`.
- A value added to the schema but not to Vercel → the server stops on its
  first start after the deploy, naming the value, rather than failing on a
  page later.
