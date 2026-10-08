# Stack decisions, research, and upgrade plan

> **Last reviewed:** 2026-10-08 · **Next review due:** 2026-11-01 (Node 26 LTS check)
>
> Single source of truth for *why* each toolchain version was chosen, the official sources behind it, and *when/how* to upgrade. Update this file whenever a toolchain package changes.

**Policy:** prefer the **LTS / actively-supported stable line** of every runtime and tool, never just "latest". Verify every upgrade against the project's **official** site/changelog and test it before committing. Where a project has no LTS concept, use the newest stable release that is compatible with the rest of the stack.

---

## 1. Current baseline

| Package / tool | Version | Pinned as | Why this version | Official source |
| --- | --- | --- | --- | --- |
| Node.js | 24.x (Krypton, **Active LTS**) | `engines.node: "24.x"`, `.nvmrc: 24` | Node 20 is EOL (2026-04-30). Node 26 is still "Current" until 2026-10-28. | [Node release schedule](https://github.com/nodejs/Release) |
| pnpm | 10.34.6 | `packageManager: "pnpm@10.34.6"` | Supported until 2027-04-30; the newest major **Vercel officially supports**. | [pnpm SECURITY.md](https://github.com/pnpm/pnpm/blob/main/SECURITY.md), [Vercel package managers](https://vercel.com/docs/package-managers) |
| next | 16.4.0 | exact | Latest stable (`latest` tag). | [nextjs.org/blog](https://nextjs.org/blog) |
| react / react-dom | 19.3.0 | exact | Matches Next 16.4. App Router uses Next's built-in React; this version is for tooling. | `node_modules/next/dist/docs/01-app/01-getting-started/01-installation.md` |
| typescript | 6.0.3 | `~6.0.3` (patch only) | **Not 7.x** — see §2.2. `~` because typescript-eslint supports `<6.1.0`. | [TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), [typescript-eslint versions](https://typescript-eslint.io/users/dependency-versions/) |
| eslint | 10.12.0 | `^10.12.0` | v9 reached **EOL 2026-08-06**. v10 is officially supported by `eslint-config-next` 16.4. | [ESLint version support](https://eslint.org/version-support) |
| eslint-config-next | 16.4.0 | exact | Matches `next`. | `node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md` |
| @types/node | 24.x | `^24.19.1` | Must match the Node **runtime** major (24 LTS), not npm `latest` (26). | [Node release schedule](https://github.com/nodejs/Release) |
| tailwindcss + @tailwindcss/turbopack | 4.3.3 | `^4` | Latest stable; Turbopack loader is the create-next-app 16.4 default. | [tailwindcss.com](https://tailwindcss.com) |
| babel-plugin-react-compiler | 1.0.0 | exact | Stable React Compiler. | [react.dev](https://react.dev/learn/react-compiler) |

`pnpm outdated` will keep reporting `typescript 7.x` and `@types/node 26.x` — **both are intentional**.

---

## 2. Decisions in detail

### 2.1 Node.js 24 LTS

- Release table (from [nodejs/Release](https://github.com/nodejs/Release)):

  | Line | Status | Maintenance start | End of life |
  | --- | --- | --- | --- |
  | 20.x Iron | EOL | — | 2026-04-30 |
  | 22.x Jod | Maintenance LTS | 2025-10-21 | 2027-04-30 |
  | **24.x Krypton** | **Active LTS** | 2026-10-20 | **2028-04-30** |
  | 26.x | Current → LTS on 2026-10-28 | 2027-10-20 | 2029-04-30 |

- `engines.node` is `"24.x"`, not `">=24"`: Vercel reads this field and a `>=` range floats to the newest major Vercel offers, which would silently move us off the LTS line ([Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)). Vercel currently offers 24.x (default), 22.x, 20.x.
- Constraints satisfied: Next 16.4 needs `>=20.9`; ESLint 10 needs `^20.19 || ^22.13 || >=24`.
- Local machine was on 24.13.0; latest 24.x is 24.21.0 — update local Node for security patches.

### 2.2 TypeScript 6.0 (deliberately not 7)

- **TS 7.0 (2026-07-08) has no JavaScript compiler API**; a new, different API is planned for 7.1. Tools that embed TypeScript can "only rely on 6.0 for now" — Microsoft names **typescript-eslint** explicitly ([TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)).
- typescript-eslint (pulled in by `eslint-config-next/typescript`) supports `typescript >=4.8.4 <6.1.0` ([source](https://typescript-eslint.io/users/dependency-versions/)). Hence `~6.0.3`.
- Next.js 16.4 *does* support TS 7 for `next build` via the local `tsc` CLI (`experimental.useTypeScriptCli`, default on) — but linting and the editor plugin would break.
- **Cartograph itself will likely use the TypeScript compiler API** to parse imports. That API exists only in 6.0 until 7.1 ships its replacement.
- TS 6.0 default changes checked against this project ([TS 6.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)): `types` now defaults to `[]` and `noUncheckedSideEffectImports` to `true` — both are covered because `next/types/global.d.ts` has `/// <reference types="node" />` and `declare module '*.css'`. Our tsconfig uses no deprecated options (`baseUrl`, `moduleResolution: node`, `target: es5` …). Next did not rewrite `tsconfig.json`.

### 2.3 ESLint 10

- ESLint v9 is EOL since 2026-08-06; v10 is the only supported line ([eslint.org/version-support](https://eslint.org/version-support)).
- Next.js docs: "`eslint-config-next` supports ESLint 9 and ESLint 10 … Some of the plugins included … don't list ESLint 10 in their peer dependencies yet" (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md`).
- Laggards: `eslint-plugin-import` 2.32.0, `eslint-plugin-react` 7.37.5, `eslint-plugin-jsx-a11y` 6.10.2 (peers stop at `^9`). `eslint-plugin-react-hooks` 7.1.1 and typescript-eslint 8.71.1 already allow `^10`.
- Verified working: a probe file triggered rules from **every** bundled plugin (`react-hooks`, `@typescript-eslint`, `@next/next`, `jsx-a11y`, `react`, `import`) with no crashes.
- The three peer warnings are silenced narrowly via `peerDependencyRules.allowedVersions` in `pnpm-workspace.yaml` (any *other* peer problem still shows).
- `next lint` was removed in Next 16; `next build` no longer lints → lint runs as its own script/CI step.

### 2.4 pnpm 10.34.6 (not 11/12 yet)

- pnpm has **no LTS programme**. Its only support statement is [SECURITY.md](https://github.com/pnpm/pnpm/blob/main/SECURITY.md):

  | Version | Supported |
  | --- | --- |
  | 12.x | ✅ (current line, no end date) |
  | 11.x | ✅ till 2027-04-30 |
  | 10.x | ✅ till 2027-04-30 |
  | ≤ 9.x | ❌ |

- **Skip 11 entirely**: same end date as 10, extra migration cost, no benefit.
- **Why not 12 now**: Vercel docs list pnpm support only up to v10 ([docs](https://vercel.com/docs/package-managers)); issue [vercel/vercel#17434 "pnpm 11 and 12 not supported"](https://github.com/vercel/vercel/issues/17434) and PR [#17450](https://github.com/vercel/vercel/pull/17450) are open with no staff response (checked 2026-10-08).
- A trial `pnpm@12.10.1 install` on this repo **failed** (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`): pnpm 11+ re-verifies every lockfile entry against `minimumReleaseAge` (because `trustLockfile` defaults to false). pnpm 10 does not re-check existing lockfile entries (verified by re-resolution).
- Global pnpm on the dev machine is left untouched (installed twice: via npm and in `%LOCALAPPDATA%\pnpm`). The `packageManager` pin makes any pnpm ≥ 9.7 auto-switch to 10.34.6 inside this repo (`managePackageManagerVersions`, default true on 10.x).

### 2.5 pnpm supply-chain settings (`pnpm-workspace.yaml`)

All settings below exist in pnpm 10.x **with the same syntax pnpm 11/12 use**, so the later pnpm 12 move is just a version bump. Source: [pnpm.io/supply-chain-security](https://pnpm.io/supply-chain-security), [settings](https://pnpm.io/settings).

| Setting | Value | Since | What it does |
| --- | --- | --- | --- |
| `allowBuilds` | `sharp: false`, `unrs-resolver: false` | 10.26 | Explicit allow/deny of dependency build scripts. Replaces `ignoredBuiltDependencies` (deprecated in 10, **removed in 11**). |
| `strictDepBuilds` | `true` | 10.3 | Fail install if a new dependency has an unreviewed build script (default in 11+). |
| `minimumReleaseAge` | `1440` (minutes) | 10.16 | Refuse versions published < 24 h ago — protects against freshly-compromised releases (default in 11+). Verified: `pnpm add node-releases@2.0.58` (7 h old) → `ERR_PNPM_NO_MATURE_MATCHING_VERSION`. |
| `blockExoticSubdeps` | `true` | 10.26 | Only direct deps may come from git/tarball URLs (default in 11+). |
| `trustPolicy` | `no-downgrade` | 10.21 | Fail if a package's publish trust level (e.g. provenance) drops vs earlier versions. |
| `peerDependencyRules.allowedVersions` | 3 entries | old | See §2.3. Still valid in pnpm 12 ([docs](https://pnpm.io/settings/peer-dependencies)). |

Why the two builds are denied (checked in the published tarballs):

- **sharp 0.35.5** has no install/postinstall script (0.34 had one; 0.35 dropped it). Prebuilt binaries come from optional `@img/sharp-<platform>` packages. Entry is effectively documentation.
- **unrs-resolver** `postinstall` only verifies/fetches its napi binding, which already arrives via optional `@unrs/resolver-binding-<platform>`.

**When you hit `minimumReleaseAge`** (e.g. you need a security fix released today): add a narrow, temporary exception and remove it after 24 h:

```yaml
minimumReleaseAgeExclude:
  - some-package@1.2.3
```

**When you hit `ERR_PNPM_IGNORED_BUILDS`**: inspect the package's install script, then add `name: true` (needed) or `name: false` (not needed) under `allowBuilds`. Never use `dangerouslyAllowAllBuilds`.

### 2.6 Next.js configuration (`next.config.ts`)

Reviewed against the docs bundled in `node_modules/next/dist/docs/` (exact match for 16.4.0) and [nextjs.org/blog/next-16-4](https://nextjs.org/blog).

| Option | Status | Notes |
| --- | --- | --- |
| `cacheComponents: true` | Stable | Recommended for every app as of 16.4; becomes default in Next 17. Requires Node.js runtime (Edge is deprecated). |
| `partialPrefetching: true` | Stable | Required alongside cacheComponents (warning otherwise). Option will be removed in Next 17 (always on). |
| `reactCompiler: true` | Stable, opt-in | Higher compile times; good fit for a heavy graph UI. Use `'use no memo'` to opt a component out. |
| `typedRoutes: true` | Stable | Statically typed `<Link href>`. Added. |
| `poweredByHeader: false` | — | Removes `X-Powered-By`. Added. |
| `turbopack.rules['*.css']` → `@tailwindcss/turbopack` | Scaffold default | **Docs are inconsistent**: the CSS guide and tailwindcss.com still document `@tailwindcss/postcss`. If you ever need `next build --webpack`, switch to `@tailwindcss/postcss` + `postcss.config.mjs`. |

**Security headers** (applied to all routes, values from `.../05-config/01-next-config-js/headers.md` and `.../02-guides/content-security-policy.md`):

- `Content-Security-Policy` — the docs' **"Without Nonces"** template. Nonce-based CSP forces dynamic rendering and is *incompatible with Partial Prerendering / Cache Components*. `'unsafe-eval'` is added **in dev only** (React uses `eval` for debugging; not needed in production).
- `Strict-Transport-Security: max-age=63072000; includeSubDomains` — docs' value **without `preload`** (preload is a hard-to-reverse commitment to browser preload lists; add only deliberately once the production domain is final).
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`.
- `X-Frame-Options` not set — superseded by CSP `frame-ancestors 'none'`.
- The CSP is built from a directive map in `next.config.ts` (easier to extend than a string). On **Vercel preview deployments only** (`VERCEL_ENV === "preview"`), the origins Vercel documents for the Toolbar/Comments are added (`https://vercel.live`, `https://vercel.com`, `https://assets.vercel.com`, `wss://ws-us3.pusher.com`) — otherwise the CSP would block the toolbar ([Vercel docs](https://vercel.com/docs/vercel-toolbar/managing-toolbar#using-a-content-security-policy)). Production stays strict. If the toolbar is ever enabled in production, extend the condition.
- **Extend the CSP when features need it:** Web Workers/WASM → `worker-src 'self' blob:` and `'wasm-unsafe-eval'`; client-side calls to other origins → `connect-src`; external images rendered directly (not via `next/image`) → `img-src`.

### 2.7 App scaffolding

- `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` added per the production checklist. Note the **16.4 API: error boundaries receive `retry()`** (re-fetch + re-render); `reset()` still exists for clearing state without re-fetching. `global-error` must render its own `<html>/<body>`, import global CSS, load its own fonts, and use `<title>` (no `metadata` export). The segment boundary component is named `ErrorBoundary` (not `Error`, as in the docs' example) to avoid shadowing the global `Error`.
- Fonts live in a **font definitions file** (`app/fonts.ts`, per `.../02-components/font.md` §Using a font definitions file) so the root layout and `global-error` share one font instance — `global-error` replaces the layout, so without this it would lose Geist.
- Metadata: `title.template` (`%s · Cartograph`) + description + `applicationName`. Add `metadataBase` once the production URL is known.
- Removed `font-family: Arial` from `body` in `globals.css` — it was overriding Geist (Tailwind preflight applies `--font-sans` on `html`).
- `.env*` stays gitignored; `!.env.example` is committed as the template. Non-`NEXT_PUBLIC_` vars are server-only; `NEXT_PUBLIC_*` are inlined at build time.
- `typecheck` script = `next typegen && tsc --noEmit` — route helper types (`LayoutProps`, `PageProps`) live in `.next/` and must be generated first on a fresh checkout/CI.
- Template SVGs in `public/` removed.

### 2.8 CI (`.github/workflows/ci.yml`)

- `actions/checkout` v7.0.1, `pnpm/action-setup` v6.1.0 (supports pnpm ≤ 12; reads version from `packageManager`), `actions/setup-node` v7.0.0 (Node from `.nvmrc`, `cache: pnpm` — pnpm caching is opt-in in v7). setup-node v7.1.0 was skipped because it was published the same day (same 24 h rule as `minimumReleaseAge`).
- **Actions are pinned to full commit SHAs** with a `# vX.Y.Z` comment — GitHub: pinning to a full-length SHA is "currently the only way to use an action as an immutable release" ([secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)). SHAs were resolved from the official repos' tags.
- `permissions: contents: read` (least-privilege `GITHUB_TOKEN`), `persist-credentials: false` on checkout (token not left in `.git/config`), `timeout-minutes: 15`, concurrency cancels superseded runs.
- `pnpm install --frozen-lockfile` → lint → typecheck → build.
- When moving to pnpm 12, `pnpm/setup@v3` can replace both action-setup and setup-node (pnpm 11+ only).

### 2.9 Dependabot (`.github/dependabot.yml`)

- Dependabot supports pnpm **v7–v10** via the `npm` ecosystem ([supported ecosystems](https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories)) — another reason to stay on pnpm 10 for now; **re-check before moving to pnpm 12**.
- Weekly; minor + patch grouped into one PR; **semver-major updates ignored** (majors are deliberate decisions recorded here).
- `cooldown.default-days: 3` — must stay ≥ pnpm `minimumReleaseAge` (1 day), otherwise Dependabot PRs fail to install ([options reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference)).
- `github-actions` ecosystem keeps the SHA pins and their version comments current. Note: Dependabot does not raise *vulnerability alerts* for SHA-pinned actions, only version updates.

### 2.10 Repository hygiene

- `.gitattributes` (`* text=auto eol=lf`): LF everywhere — Windows dev machines (`core.autocrlf=true`) vs Linux CI/Vercel.
- `.editorconfig`: UTF-8, LF, 2-space indent, final newline.
- Default branch is `main`; work happens on feature branches merged via PR (CI runs on every PR).

---

## 3. Verification performed (2026-10-08)

All on Windows 11, Node 24.13.0, pnpm 10.34.6:

- Upgrades trialled first in an isolated copy, then applied.
- `pnpm install --frozen-lockfile` from empty `node_modules` ✅ · full re-resolution → identical lockfile ✅
- `pnpm lint` ✅ · ESLint 10 probe hitting all plugins ✅
- `pnpm typecheck` from a clean checkout (no `.next/`) ✅
- `pnpm build` ✅ (`/` and `/_not-found` prerendered)
- `pnpm start`: all security headers present, no `X-Powered-By`, title/description correct, unknown route → 404 with custom page ✅
- `pnpm dev`: page 200, dev CSP includes `'unsafe-eval'`, Geist font classes applied ✅
- Pre-commit audit of the full diff: fixed Vercel Toolbar CSP, SHA-pinned actions, added Dependabot, shared fonts for `global-error`, renamed shadowing `Error` component, added `.gitattributes`/`.editorconfig` — then re-ran all checks above ✅

---

## 4. Upgrade plan and triggers

| When / trigger | Action | Check first |
| --- | --- | --- |
| **Now** | Update local Node 24.13.0 → latest 24.x (24.21.0+). | — |
| **2026-10-28** — Node 26 becomes LTS | **Stay on 24** (Active LTS until 2026-10-20, then Maintenance until 2028-04-30). Plan the 26 move for H1 2027 once Vercel offers `26.x`. | [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [nodejs/Release](https://github.com/nodejs/Release) |
| **Vercel officially supports pnpm 12** (watch [#17434](https://github.com/vercel/vercel/issues/17434)) — **deadline 2027-04-30** (pnpm 10 EOL) | Migrate pnpm 10 → 12 (steps in §5). If Vercel still lacks support by ~2027-03, test `ENABLE_EXPERIMENTAL_COREPACK=1` on a preview deployment. Also confirm **Dependabot** supports pnpm 12 (currently v7–v10). | [pnpm 12 changes](https://pnpm.io/blog/whats-different-in-pnpm-12), [Vercel package managers](https://vercel.com/docs/package-managers), [Dependabot ecosystems](https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories) |
| **TypeScript 7.1 ships its API *and* typescript-eslint supports TS 7** | Evaluate TS 7. Also re-evaluate the parser approach for Cartograph if it uses the TS API. | [typescript-eslint versions](https://typescript-eslint.io/users/dependency-versions/), [TS blog](https://devblogs.microsoft.com/typescript/) |
| **typescript-eslint widens to `<6.x`/7** | Relax `typescript` from `~6.0.3` accordingly. | same |
| **eslint-plugin-import / react / jsx-a11y add ESLint 10 peers** | Remove matching `peerDependencyRules` entries. | `pnpm view <pkg> peerDependencies` |
| **Next.js 17** | `cacheComponents`/`partialPrefetching` become defaults and the options are removed — delete them. Read the upgrade guide in `node_modules/next/dist/docs/01-app/02-guides/upgrading/`. | [nextjs.org/blog](https://nextjs.org/blog) |
| **Every Next.js minor** | `pnpm next upgrade`; re-read the release blog; keep `eslint-config-next` = `next`. | — |
| **Production domain is final** | Add `metadataBase`; consider HSTS `preload` deliberately. | — |
| **2027-04-30** — Node 22 & pnpm 10/11 EOL | Must be on pnpm 12 by this date. | — |
| **2028-04-30** — Node 24 EOL | Must be on Node 26 (or newer LTS) by this date. | — |
| **Every 3 months** | Re-run this review: `pnpm outdated`, check EOL tables, update this file's "Last reviewed". | — |

---

## 5. How to upgrade safely (procedure)

1. Read the package's **official** release notes / support page; note breaking changes and peer requirements.
2. Check compatibility across the stack (`pnpm view <pkg>@<ver> peerDependencies engines`).
3. Trial in an isolated copy or branch: install, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm start` + smoke test.
4. Apply, re-run the same checks, update §1 and §4 of this file, commit with the reasoning.

**pnpm 10 → 12 steps (when triggered):**

1. `package.json`: `"packageManager": "pnpm@12.x.y"` (keep this field; Vercel/Netlify/action-setup read it).
2. `pnpm-workspace.yaml`: no changes needed — already uses pnpm 12 syntax (optionally run `pnpx codemod run pnpm-v10-to-v11` to double-check).
3. `pnpm install` → the lockfile becomes a two-document YAML (adds a `packageManagerDependencies` env document). Expect a one-time diff. Re-run `pnpm install` after every future pin bump (`--frozen-lockfile` fails on a stale pin since 11.23).
4. If install fails with `MINIMUM_RELEASE_AGE_VIOLATION`, wait 24 h or add a temporary `minimumReleaseAgeExclude`.
5. CI: either keep `pnpm/action-setup@v6` + `setup-node`, or switch to `pnpm/setup@v3` (`runtime: node@24`, `cache: true`). Replace any `--frozen-lockfile false` with `--no-frozen-lockfile`; rename `npm_config_*` env vars to `pnpm_config_*`.
6. Global (optional, per machine): remove the npm copy (`npm rm -g pnpm`); `pnpm self-update` to 12 is only documented from ≥ 11.10, so from 10.x re-run the official installer.

---

## 6. Guidance for building Cartograph features

From the Next.js 16.4 docs (bundled `node_modules/next/dist/docs/01-app/…`); items marked *(judgement)* are not doc-backed.

- **Heavy parsing**: use **Route Handlers**, not Server Actions (actions are queued/sequential and meant for mutations — `02-guides/backend-for-frontend.md`). Set `maxDuration` (limit is platform-dependent). Stream progress with `ReadableStream`/SSE (`02-guides/streaming.md`). `after()` shares the same max duration — it is not a job queue. For large repos run parsing in a background job/queue or `worker_threads` *(judgement)*.
- **Native parsers**: `typescript`, `ts-morph`, `@swc/core` are auto-externalized; add native `tree-sitter` packages to `serverExternalPackages`, and grammar `.wasm` files via `outputFileTracingIncludes`. Stay on the Node.js runtime.
- **GitHub API + caching**: `fetch` is uncached by default. Resolve ref → SHA with a short `cacheLife`; cache parsed graphs keyed by `owner/repo@sha` with `'use cache'` + `cacheLife('max')` + `cacheTag`. Never share cache entries fetched with a *user's* token. In-memory cache is per-instance (50 MB default) and reset on deploy → use `'use cache: remote'` + `cacheHandlers` or a DB/blob store for durable graphs. Keep `GITHUB_TOKEN` server-only in an `import 'server-only'` module (Data Access Layer pattern, `02-guides/data-security.md`).
- **Client graph**: keep `'use client'` at the leaf; `next/dynamic(..., { ssr: false })` only inside a Client Component. With Cache Components, hidden routes stay mounted under `<Activity>` — canvas/WebGL effects must clean up and be idempotent (`02-guides/preserving-ui-state.md`). Watch the `react-hooks` `incompatible-library` lint for mutable graph libraries.
- **Security**: treat every Server Action as a public POST endpoint (authenticate + authorize inside it); rate-limit analysis endpoints; validate repo URLs.
- **Testing**: Vitest for parser logic; Playwright E2E for async Server Components (docs recommend E2E over unit tests there).
- **Observability**: `instrumentation.ts` + OpenTelemetry spans per parse phase.
- **Optional later**: Prettier (+ `eslint-config-prettier`), `experimental.sri` for hash-based CSP, branch protection on `main` (require the CI check), CodeQL code scanning.

---

## 7. Open / unverified items

- What pnpm "supported" in SECURITY.md covers (security-only vs all fixes) — not stated.
- Vercel behaviour with pnpm 12 and the two-document lockfile — untested.
- Tailwind Turbopack loader vs the `turbopack.md` statement that CSS-transforming loaders are unsupported — works in practice on 16.4.
- Per-entry size limit for `'use cache'` (matters for multi-MB graphs) — not documented.
- Concrete `maxDuration` limits per hosting plan — platform-specific.

---

## 8. Sources

**Runtime & package managers**

- Node.js release schedule — <https://github.com/nodejs/Release> · release index — <https://nodejs.org/dist/index.json>
- pnpm SECURITY.md (support table) — <https://github.com/pnpm/pnpm/blob/main/SECURITY.md>
- pnpm installation & compatibility — <https://pnpm.io/installation>
- pnpm 11.0 release notes — <https://github.com/pnpm/pnpm/releases/tag/v11.0.0> · <https://pnpm.io/blog/releases/11.0>
- What's different in pnpm 12 — <https://pnpm.io/blog/whats-different-in-pnpm-12>
- pnpm settings — <https://pnpm.io/settings> · 10.x settings — <https://pnpm.io/10.x/settings>
- pnpm supply-chain security — <https://pnpm.io/supply-chain-security>
- pnpm CI — <https://pnpm.io/continuous-integration> · lockfile — <https://pnpm.io/lockfile> · migration — <https://pnpm.io/migration>
- pnpm/action-setup — <https://github.com/pnpm/action-setup> · pnpm/setup — <https://github.com/pnpm/setup>
- actions/setup-node — <https://github.com/actions/setup-node> · actions/checkout — <https://github.com/actions/checkout>
- GitHub Actions secure use (SHA pinning, token permissions) — <https://docs.github.com/en/actions/reference/security/secure-use>
- Dependabot options — <https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference> · supported ecosystems — <https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories>

**Language & lint**

- TypeScript 7.0 announcement — <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/>
- TypeScript 6.0 announcement — <https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/>
- typescript-eslint dependency versions — <https://typescript-eslint.io/users/dependency-versions/>
- ESLint version support — <https://eslint.org/version-support>

**Next.js** (bundled docs for the installed version are authoritative: `node_modules/next/dist/docs/`)

- Installation, TypeScript (`05-config/02-typescript.md`), ESLint (`05-config/03-eslint.md`), `useTypeScriptCli`, `typedRoutes`, `headers`, `cacheComponents`, `partialPrefetching`, `reactCompiler`
- Guides: `content-security-policy.md`, `production-checklist.md`, `environment-variables.md`, `data-security.md`, `self-hosting.md`, `upgrading/version-16.md`
- File conventions: `error.md`, `not-found.md`
- Next.js blog — <https://nextjs.org/blog>

**Hosting**

- Vercel package managers — <https://vercel.com/docs/package-managers>
- Vercel Node.js versions — <https://vercel.com/docs/functions/runtimes/node-js/node-js-versions>
- Vercel Toolbar & CSP — <https://vercel.com/docs/vercel-toolbar/managing-toolbar#using-a-content-security-policy>
- Vercel pnpm 11/12 issue — <https://github.com/vercel/vercel/issues/17434> · PR — <https://github.com/vercel/vercel/pull/17450>
