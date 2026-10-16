# 000 — Platform requirements: tasks

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Build status:** In progress

## T01 — Configuration that fails loudly

**Status:** Done
**Blocked by:** none
**Covers:** FR-011, AC-04

**What to build:** a server that stops on start, naming every missing or
invalid configuration value.

**Done when:**

- [x] `parseConfig` and `ConfigError` in `apps/web/src/lib/config.ts`, with
      an empty value treated as missing.
- [x] `getServerEnv()` in `env.server.ts`, server-only, called once by
      `src/server.ts` at start.
- [x] The check is in the server bundle and absent from the client bundle.
- [x] Tests at the agreed seams pass; format, lint, typecheck and build pass.

## T02 — Tests in the checks

**Status:** Done
**Blocked by:** none
**Covers:** FR-009

**What to build:** tests that run in CI beside the other checks.

**Done when:**

- [x] Vitest, pinned in the catalog, with `apps/web/vitest.config.ts`.
- [x] A `test` task in `turbo.json`, `pnpm test` at the root, and `test` in the
      CI run.
- [x] `config.test.ts` passes (5 tests).

## T03 — A build for the host

**Status:** Done
**Blocked by:** none
**Covers:** FR-001, FR-002, AC-06 (the build side)

**What to build:** a production build that runs as one server function with
the request limit `MAX_RUN_SECONDS`.

**Done when:**

- [x] `nitro()` in `vite.config.ts`, with `maxDuration` from
      `MAX_RUN_SECONDS`; Nitro pinned exactly in the catalog.
- [x] `pnpm build` serves the app locally (`vite preview` and
      `node .output/server/index.mjs` both return 200).
- [x] A `NITRO_PRESET=vercel` build writes one function whose
      `.vc-config.json` holds `"maxDuration": 300` and
      `"runtime": "nodejs24.x"`.
- [x] Turborepo caches `.output/**` and `.vercel/output/**`; both are ignored by
      git, Prettier and ESLint.
- [x] The function runs on its own: copied to an empty folder outside the
      repository, it renders the home page (React kept external with
      `traceDeps`; the first deployment returned 500 without it).

## T04 — The Vercel project (you)

**Status:** Todo
**Blocked by:** T03, merged to `main`
**Covers:** FR-001, FR-008, FR-010, AC-01, AC-03, AC-06

**What to build:** the production and preview deployments. These steps need
your Vercel account.

**Done when:**

- [ ] At [vercel.com/new](https://vercel.com/new), the GitHub repository is
      imported on the Hobby plan, with **Root Directory** `apps/web` and the
      other build settings left as Vercel detects them.
- [ ] Under **Settings → Environment Variables**,
      `ENABLE_EXPERIMENTAL_COREPACK` = `1` for all environments, so Vercel
      installs with pnpm 11 (`packageManager`). Then redeploy.
- [ ] The build log shows pnpm 11.25.0 and Node.js 24.
- [ ] AC-01: the production address renders the home page.
- [ ] AC-03: a pull request gets its own preview address, which renders.
- [ ] AC-06: the deployment's function shows a maximum duration of 300 s
      (the deployment's **Functions** view, or `.vc-config.json` in the build
      output).

## T05 — Block a merge when a check fails (you)

**Status:** Todo
**Blocked by:** T04
**Covers:** FR-009, AC-02

**What to build:** a rule on `main` that refuses a pull request whose checks
fail. It needs your GitHub account (the `gh` CLI on this machine is a
different account).

**Done when:**

- [ ] Under **Settings → Rules → Rulesets**, a ruleset on `main` requires the
      status check **Audit, format, lint, typecheck, test, build** to pass.
- [ ] AC-02: a pull request that breaks formatting shows the check failed and
      can't merge.

A required status check also applies to pushes to `main`. A merge commit made
locally has no checks of its own, so it's refused unless you're on the
ruleset's bypass list (add yourself as the repository admin), or the branch is
merged with `git merge --ff-only`.

## T06 — Acceptance

**Status:** Todo
**Blocked by:** T04, T05
**Covers:** AC-01 to AC-07

**Done when:**

- [ ] AC-01, AC-03 and AC-06 pass (T04); AC-02 passes (T05).
- [x] AC-04: `config.test.ts` names a missing and a blank value. On a
      deployment, the check runs at start; it's seen failing the first time a
      spec adds a required value.
- [x] AC-05: `pnpm install --frozen-lockfile` installs the locked versions, in
      CI and locally.
- [x] AC-07: FR-003 to FR-007 each name the spec that accepts them.
- [ ] Build status at the top of this file set to Done.
