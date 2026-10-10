# Stack decisions, research, and upgrade plan

> **Last reviewed:** 2026-10-09 · **Next review due:** 2026-11-01 (Node 26 LTS check)
>
> Single source of truth for _why_ each toolchain version was chosen, the official sources behind it, and _when/how_ to upgrade. Update this file whenever a toolchain package changes.

**Policy:** prefer the **LTS / actively-supported stable line** of every runtime and tool, never just "latest". Verify every upgrade against the project's **official** site/changelog and test it before committing. Where a project has no LTS concept, use the newest stable release that is compatible with the rest of the stack.

---

## 1. Current baseline

| Package / tool                       | Version                        | Pinned as                            | Why this version                                                                                                                                                        | Official source                                                                                                                                                                    |
| ------------------------------------ | ------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js                              | 24.x (Krypton, **Active LTS**) | `engines.node: "24.x"`, `.nvmrc: 24` | Node 20 is EOL (2026-04-30). Node 26 is still "Current" until 2026-10-28.                                                                                               | [Node release schedule](https://github.com/nodejs/Release)                                                                                                                         |
| pnpm                                 | 10.34.6                        | `packageManager: "pnpm@10.34.6"`     | Supported until 2027-04-30; the newest major **Vercel officially supports**.                                                                                            | [pnpm SECURITY.md](https://github.com/pnpm/pnpm/blob/main/SECURITY.md), [Vercel package managers](https://vercel.com/docs/package-managers)                                        |
| next                                 | 16.4.0                         | exact                                | Latest stable (`latest` tag).                                                                                                                                           | [nextjs.org/blog](https://nextjs.org/blog)                                                                                                                                         |
| react / react-dom                    | 19.3.0                         | exact                                | Matches Next 16.4. App Router uses Next's built-in React; this version is for tooling.                                                                                  | `node_modules/next/dist/docs/01-app/01-getting-started/01-installation.md`                                                                                                         |
| typescript                           | 6.0.3                          | `~6.0.3` (patch only)                | **Not 7.x** — see §2.2. `~` because typescript-eslint supports `<6.1.0`.                                                                                                | [TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), [typescript-eslint versions](https://typescript-eslint.io/users/dependency-versions/) |
| eslint                               | 10.12.0                        | `^10.12.0`                           | v9 reached **EOL 2026-08-06**. v10 is officially supported by `eslint-config-next` 16.4.                                                                                | [ESLint version support](https://eslint.org/version-support)                                                                                                                       |
| eslint-config-next                   | 16.4.0                         | exact                                | Matches `next`.                                                                                                                                                         | `node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md`                                                                                                       |
| @types/node                          | 24.x                           | `^24.19.1`                           | Must match the Node **runtime** major (24 LTS), not npm `latest` (26).                                                                                                  | [Node release schedule](https://github.com/nodejs/Release)                                                                                                                         |
| tailwindcss + @tailwindcss/turbopack | 4.3.3                          | `^4`                                 | Latest stable; Turbopack loader is the create-next-app 16.4 default.                                                                                                    | [tailwindcss.com](https://tailwindcss.com)                                                                                                                                         |
| babel-plugin-react-compiler          | 1.0.0                          | exact                                | Stable React Compiler.                                                                                                                                                  | [react.dev](https://react.dev/learn/react-compiler)                                                                                                                                |
| prettier                             | 3.9.9                          | exact                                | Only **stable** formatter of the candidates; what create-next-app itself formats with. See §2.11.                                                                       | [Prettier changelog](https://github.com/prettier/prettier/blob/3.9.9/CHANGELOG.md)                                                                                                 |
| @clerk/nextjs                        | 7.9.13                         | exact                                | Auth (Clerk Core 3, Next 16 `proxy.ts`). 7.9.14 was <24 h old at install, so `minimumReleaseAge` held it back.                                                          | [Clerk Next.js quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart)                                                                                               |
| @t3-oss/env-nextjs + zod             | 0.13.11 + 4.6.5                | exact                                | Typed, validated env (`env.ts`), imported by `next.config.ts` so every build validates. env-nextjs is 0.x, hence exact. ~3.2 M weekly downloads; used by create-t3-app. | [T3 Env](https://env.t3.gg/docs/nextjs)                                                                                                                                            |
| prettier-plugin-tailwindcss          | 0.8.1                          | exact                                | Tailwind's official class sorter (v4 needs `tailwindStylesheet`).                                                                                                       | [Tailwind editor setup](https://tailwindcss.com/docs/editor-setup#class-sorting-with-prettier)                                                                                     |
| @ianvs/prettier-plugin-sort-imports  | 4.7.1                          | exact                                | Import sorting owned by the formatter; side-effect imports are never moved.                                                                                             | [GitHub](https://github.com/IanVS/prettier-plugin-sort-imports)                                                                                                                    |

`pnpm outdated` will keep reporting `typescript 7.x` and `@types/node 26.x` — **both are intentional**.

---

## 2. Decisions in detail

### 2.1 Node.js 24 LTS

- Release table (from [nodejs/Release](https://github.com/nodejs/Release)):

  | Line             | Status                      | Maintenance start | End of life    |
  | ---------------- | --------------------------- | ----------------- | -------------- |
  | 20.x Iron        | EOL                         | —                 | 2026-04-30     |
  | 22.x Jod         | Maintenance LTS             | 2025-10-21        | 2027-04-30     |
  | **24.x Krypton** | **Active LTS**              | 2026-10-20        | **2028-04-30** |
  | 26.x             | Current → LTS on 2026-10-28 | 2027-10-20        | 2029-04-30     |

- `engines.node` is `"24.x"`, not `">=24"`: Vercel reads this field and a `>=` range floats to the newest major Vercel offers, which would silently move us off the LTS line ([Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)). Vercel currently offers 24.x (default), 22.x, 20.x.
- Constraints satisfied: Next 16.4 needs `>=20.9`; ESLint 10 needs `^20.19 || ^22.13 || >=24`.
- Local machine was on 24.13.0; latest 24.x is 24.21.0 — update local Node for security patches.

### 2.2 TypeScript 6.0 (deliberately not 7)

- **TS 7.0 (2026-07-08) has no JavaScript compiler API**; a new, different API is planned for 7.1. Tools that embed TypeScript can "only rely on 6.0 for now" — Microsoft names **typescript-eslint** explicitly ([TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)).
- typescript-eslint (pulled in by `eslint-config-next/typescript`) supports `typescript >=4.8.4 <6.1.0` ([source](https://typescript-eslint.io/users/dependency-versions/)). Hence `~6.0.3`.
- Next.js 16.4 _does_ support TS 7 for `next build` via the local `tsc` CLI (`experimental.useTypeScriptCli`, default on) — but linting and the editor plugin would break.
- **The parser is ts-morph** (`CLAUDE.md`), which wraps the TypeScript compiler API. ts-morph 28 bundles **TypeScript 6.0.2** (`@ts-morph/common` 0.29) — the same generation as our `~6.0.3`. Revisit TS 7 only when ts-morph moves to the TS 7 API.
- TS 6.0 default changes checked against this project ([TS 6.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)): `types` now defaults to `[]` and `noUncheckedSideEffectImports` to `true` — both are covered because `next/types/global.d.ts` has `/// <reference types="node" />` and `declare module '*.css'`. Our tsconfig uses no deprecated options (`baseUrl`, `moduleResolution: node`, `target: es5` …). Next did not rewrite `tsconfig.json`.

### 2.3 ESLint 10

- ESLint v9 is EOL since 2026-08-06; v10 is the only supported line ([eslint.org/version-support](https://eslint.org/version-support)).
- Next.js docs: "`eslint-config-next` supports ESLint 9 and ESLint 10 … Some of the plugins included … don't list ESLint 10 in their peer dependencies yet" (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md`).
- Laggards: `eslint-plugin-import` 2.32.0, `eslint-plugin-react` 7.37.5, `eslint-plugin-jsx-a11y` 6.10.2 (peers stop at `^9`). `eslint-plugin-react-hooks` 7.1.1 and typescript-eslint 8.71.1 already allow `^10`.
- Verified working: a probe file triggered rules from **every** bundled plugin (`react-hooks`, `@typescript-eslint`, `@next/next`, `jsx-a11y`, `react`, `import`) with no crashes.
- The three peer warnings are silenced narrowly via `peerDependencyRules.allowedVersions` in `pnpm-workspace.yaml` (any _other_ peer problem still shows).
- `next lint` was removed in Next 16; `next build` no longer lints → lint runs as its own script/CI step.

### 2.4 pnpm 10.34.6 (not 11/12 yet)

- pnpm has **no LTS programme**. Its only support statement is [SECURITY.md](https://github.com/pnpm/pnpm/blob/main/SECURITY.md):

  | Version | Supported                      |
  | ------- | ------------------------------ |
  | 12.x    | ✅ (current line, no end date) |
  | 11.x    | ✅ till 2027-04-30             |
  | 10.x    | ✅ till 2027-04-30             |
  | ≤ 9.x   | ❌                             |

- **Skip 11 entirely**: same end date as 10, extra migration cost, no benefit.
- **Why not 12 now**: Vercel docs list pnpm support only up to v10 ([docs](https://vercel.com/docs/package-managers)); issue [vercel/vercel#17434 "pnpm 11 and 12 not supported"](https://github.com/vercel/vercel/issues/17434) and PR [#17450](https://github.com/vercel/vercel/pull/17450) are open with no staff response (checked 2026-10-08).
- A trial `pnpm@12.10.1 install` on this repo **failed** (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`): pnpm 11+ re-verifies every lockfile entry against `minimumReleaseAge` (because `trustLockfile` defaults to false). pnpm 10 does not re-check existing lockfile entries (verified by re-resolution).
- Global pnpm on the dev machine is left untouched (installed twice: via npm and in `%LOCALAPPDATA%\pnpm`). The `packageManager` pin makes any pnpm ≥ 10 auto-switch to 10.34.6 inside this repo (`managePackageManagerVersions`, on by default since pnpm 10.0). **Verify on the first Vercel deploy** that the build log shows pnpm 10.34.6 — Vercel picks pnpm 9 or 10 from `lockfileVersion: 9.0` — so `allowBuilds`, `minimumReleaseAge` and `trustPolicy` really apply; otherwise set `ENABLE_EXPERIMENTAL_COREPACK=1`. Record the result here.

### 2.5 pnpm supply-chain settings (`pnpm-workspace.yaml`)

All settings below exist in pnpm 10.x **with the same syntax pnpm 11/12 use**, so the later pnpm 12 move is just a version bump. Source: [pnpm.io/supply-chain-security](https://pnpm.io/supply-chain-security), [settings](https://pnpm.io/settings).

| Setting                               | Value                                  | Since | What it does                                                                                                                                                                                        |
| ------------------------------------- | -------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowBuilds`                         | `sharp: false`, `unrs-resolver: false` | 10.26 | Explicit allow/deny of dependency build scripts. Replaces `ignoredBuiltDependencies` (deprecated in 10, **removed in 11**).                                                                         |
| `strictDepBuilds`                     | `true`                                 | 10.3  | Fail install if a new dependency has an unreviewed build script (default in 11+).                                                                                                                   |
| `minimumReleaseAge`                   | `1440` (minutes)                       | 10.16 | Refuse versions published < 24 h ago — protects against freshly-compromised releases (default in 11+). Verified: `pnpm add node-releases@2.0.58` (7 h old) → `ERR_PNPM_NO_MATURE_MATCHING_VERSION`. |
| `blockExoticSubdeps`                  | `true`                                 | 10.26 | Only direct deps may come from git/tarball URLs (default in 11+).                                                                                                                                   |
| `trustPolicy`                         | `no-downgrade`                         | 10.21 | Fail if a package's publish trust level (e.g. provenance) drops vs earlier versions.                                                                                                                |
| `trustPolicyExclude`                  | `semver@6.3.1`                         | 10.22 | One exact version exempted — see below.                                                                                                                                                             |
| `peerDependencyRules.allowedVersions` | 3 entries                              | old   | See §2.3. Still valid in pnpm 12 ([docs](https://pnpm.io/settings/peer-dependencies)).                                                                                                              |

Why the two builds are denied (checked in the published tarballs):

- **sharp 0.35.5** has no install/postinstall script (0.34 had one; 0.35 dropped it). Prebuilt binaries come from optional `@img/sharp-<platform>` packages. Entry is effectively documentation.
- **unrs-resolver** `postinstall` only verifies/fetches its napi binding, which already arrives via optional `@unrs/resolver-binding-<platform>`.

**When you hit `minimumReleaseAge`** (e.g. you need a security fix released today): add a narrow, temporary exception and remove it after 24 h:

```yaml
minimumReleaseAgeExclude:
  - some-package@1.2.3
```

**Known advisory — `braces` ≤ 3.0.3, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)** (high, stack-exhaustion DoS from deeply nested brace patterns; published 2026-09-18; **no patched version**). Path: `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`. Accepted: lint-time only, patterns come from our own config, nothing ships in the app. **Becomes real** if runtime/parser code ever passes repo-derived glob patterns into `micromatch`/`braces` — don't, or cap pattern length and nesting. `pnpm audit` will keep reporting it until a fix exists.

**When you hit `ERR_PNPM_IGNORED_BUILDS`**: inspect the package's install script, then add `name: true` (needed) or `name: false` (not needed) under `allowBuilds`. Never use `dangerouslyAllowAllBuilds`.

**When you hit `ERR_PNPM_TRUST_DOWNGRADE`**: treat it as a possible takeover until proven otherwise. Inspect the registry (`curl -s https://registry.npmjs.org/<pkg>` → `time`, `_npmUser`, `dist.attestations` per version). Only if it is a legitimate release, exempt that **exact version** in `trustPolicyExclude` with a comment explaining why. Never switch the policy off or use `trustPolicyIgnoreAfter` (that exempts every old package).

**Exemption on record — `semver@6.3.1`** (approved by the owner, 2026-10-09). Hit when adding Prettier: pnpm re-checked the tree and rejected it. Registry evidence: 7.5.1–7.5.4 (May–Jul 2023) were published by `npm-cli-ops` from CI **with** provenance; 6.3.1 (2023-07-10) is the official backport of the CVE-2022-25883 ReDoS fix to the 6.x line, published by npm CLI maintainer `lukekarrys` locally **without** provenance. The check is date-based, so it misfires on backports. Required by Babel 7 (`@babel/core`, `@babel/helper-compilation-targets`), `eslint-plugin-import`, `eslint-plugin-react` and `node-exports-info` — all via `eslint-config-next`; forcing semver 7 onto them risks breaking them. **Remove the exemption** once `pnpm why semver@6` returns nothing.

### 2.6 Next.js configuration (`next.config.ts`)

Reviewed against the docs bundled in `node_modules/next/dist/docs/` (exact match for 16.4.0) and [nextjs.org/blog/next-16-4](https://nextjs.org/blog).

| Option                                                | Status           | Notes                                                                                                                                                                                                 |
| ----------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cacheComponents: true`                               | Stable           | Recommended for every app as of 16.4; becomes default in Next 17. Requires Node.js runtime (Edge is deprecated).                                                                                      |
| `partialPrefetching: true`                            | Stable           | Required alongside cacheComponents (warning otherwise). Option will be removed in Next 17 (always on).                                                                                                |
| `reactCompiler: true`                                 | Stable, opt-in   | Higher compile times; good fit for a heavy graph UI. Use `'use no memo'` to opt a component out.                                                                                                      |
| `typedRoutes: true`                                   | Stable           | Statically typed `<Link href>`. Added.                                                                                                                                                                |
| `poweredByHeader: false`                              | —                | Removes `X-Powered-By`. Added.                                                                                                                                                                        |
| `turbopack.rules['*.css']` → `@tailwindcss/turbopack` | Scaffold default | **Docs are inconsistent**: the CSS guide and tailwindcss.com still document `@tailwindcss/postcss`. If you ever need `next build --webpack`, switch to `@tailwindcss/postcss` + `postcss.config.mjs`. |

**Security headers** (applied to all routes, values from `.../05-config/01-next-config-js/headers.md` and `.../02-guides/content-security-policy.md`):

- `Content-Security-Policy` — the docs' **"Without Nonces"** template. Nonce-based CSP forces dynamic rendering and is _incompatible with Partial Prerendering / Cache Components_. `'unsafe-eval'` is added **in dev only** (React uses `eval` for debugging; not needed in production).
- `Strict-Transport-Security: max-age=63072000; includeSubDomains` — docs' value **without `preload`** (preload is a hard-to-reverse commitment to browser preload lists; add only deliberately once the production domain is final).
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (stricter than the docs' example `origin-when-cross-origin`, which still sends the origin on HTTPS→HTTP; matches the browser default), `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`.
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
- `permissions: contents: read` (least-privilege `GITHUB_TOKEN`), `persist-credentials: false` on checkout (token not left in `.git/config`), `timeout-minutes: 15`, `NEXT_TELEMETRY_DISABLED=1`; concurrency cancels superseded **PR** runs only (runs on `main` always finish). No `.next/cache` caching — builds take ~10 s, so it isn't worth the extra step yet.
- `pnpm install --frozen-lockfile` → `format:check` → lint → typecheck → build.
- When moving to pnpm 12, `pnpm/setup@v3` can replace both action-setup and setup-node (pnpm 11+ only).

### 2.9 Dependabot (`.github/dependabot.yml`)

- Dependabot supports pnpm **v7–v10** via the `npm` ecosystem ([supported ecosystems](https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories)) — another reason to stay on pnpm 10 for now; **re-check before moving to pnpm 12**.
- Weekly; minor + patch grouped into one PR; **majors are never proposed as version updates** (majors are deliberate decisions recorded here). This uses `allow` + `update-types`, which limits version updates only — an `ignore` rule would also suppress **security** updates ([controlling updates](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/controlling-dependencies-updated)). Keep "Dependabot security updates" enabled in the repo settings.
- Commit prefixes `build(deps)` (npm) and `ci(deps)` (actions) keep Conventional Commits.
- `cooldown.default-days: 3` — must stay ≥ pnpm `minimumReleaseAge` (1 day), otherwise Dependabot PRs fail to install ([options reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference)). Cooldown does **not** apply to security updates: a security PR for a release < 24 h old will fail `minimumReleaseAge` — use the `minimumReleaseAgeExclude` procedure in §2.5.
- `github-actions` ecosystem keeps the SHA pins and their version comments current. Note: Dependabot does not raise _vulnerability alerts_ for SHA-pinned actions, only version updates.

### 2.10 Repository hygiene

- `.gitattributes` (`* text=auto eol=lf`): LF everywhere — Windows dev machines (`core.autocrlf=true`) vs Linux CI/Vercel.
- `.editorconfig`: UTF-8, LF, 2-space indent, final newline.
- Default branch is `main`; work happens on feature branches merged via PR (CI runs on every PR).
- **Merge PRs with "Create a merge commit"**, not squash or rebase: both rewrite hashes, which silently breaks `.git-blame-ignore-revs`. Consider disabling squash/rebase merging in the repo settings.
- **Agent skills** (`.claude/skills/`) are vendored **unmodified** under their upstream licences — MIT, except `frontend-design` (Apache-2.0) — (notice in `.claude/skills/LICENSE`; versions/hashes in `skills-lock.json`):
  - [jsmastery-pro/skills](https://github.com/jsmastery-pro/skills): architect, audit, check, debug, develop, document, scope, sync, test.
  - [clerk/skills](https://github.com/clerk/skills): clerk, clerk-setup, clerk-nextjs-patterns, clerk-orgs, clerk-custom-ui, clerk-webhooks, clerk-backend-api, clerk-cli. **Not kept** (owner decision, 2026-10-09): android, astro, chrome-extension, expo, nuxt, react, react-router, swift, tanstack, vue (other frameworks), billing (out of scope), testing (CLAUDE.md: no unrequested test runner).
  - [jakubkrehel/skills](https://github.com/jakubkrehel/skills) (added 2026-10-09, revision `d574cc8a576dc24256ad38268b8d03d86724a1b3`): better-accessibility, better-colors, better-interface, better-layout, better-typography, better-ui, better-writing, break, build-design, explain-interface, interface-review, state-machine, variant. Interface craft: WCAG 2.2 review, type scale, palettes and contrast, copy, component state/variant pages. **CLAUDE.md's interface rules win over these skills**: dense developer tool, colour only for direction and kind, greyscale otherwise, nothing moves unless clicked. So `better-ui`'s motion/animation guidance and `better-colors`' palette generation apply only within those rules (the palette starts from the four decisions in `docs/project-doc.md`). `break`, `state-machine` and `variant` render throwaway pages; they must not leave files behind or add packages.
  - [mattpocock/skills](https://github.com/mattpocock/skills) (added 2026-10-09, revision `b0618bc436ad893b3c5e84e55fba86586d34a404`): the 27 engineering + productivity skills — ask-matt, code-review, codebase-design, diagnosing-bugs, domain-modeling, grill-me, grill-with-docs, grilling, handoff, implement, implement-spec, improve-codebase-architecture, pr, prototype, research, retro, setup-matt-pocock-skills, tdd, teach, to-questionnaire, to-spec, to-tickets, triage, wait-what, wayfinder, wizard, writing-for-agents. **Not kept**: `in-progress/*` (seven unfinished skills) and `misc/*` (scaffold-exercises, migrate-to-shoehorn, setup-pre-commit and git-guardrails-claude-code — pre-commit/git hooks were decided against in §2.11). **Vendored instead of the `mattpocock-skills` Claude Code plugin** (owner's choice, 2026-10-09): the upstream README says to pick one, "because installing both gives you every skill twice"; vendoring is pinned, hashed, reviewable in PRs, loads in cloud sessions and works for any Agent Skills client, while the plugin installs per machine and tracks the marketplace. To stop a user-scope install of the plugin from double-loading in this repo, `.claude/settings.json` sets `"mattpocock-skills@mattpocock": false` (project settings override user settings). Installed with `npx skills@latest add mattpocock/skills -a claude-code -s '*' --copy -y`, then the 11 dropped skills removed from `.claude/skills/` and `skills-lock.json`. Overrides: `/tdd` must ask before adding a test runner; `/setup-matt-pocock-skills` must not edit `CLAUDE.md` without asking; `/code-review` reviews _our_ PRs, not the product's users' code.
  - [anthropics/skills](https://github.com/anthropics/skills) (added 2026-10-09, revision `683bc88e56f3e09ba94f7055977f3d3aa499f202`): **frontend-design** only — Anthropic's example skill for distinctive visual design (aesthetic direction, typography, composition). **Apache-2.0**, not MIT: the skill ships its own `LICENSE.txt`, kept unmodified, which satisfies Apache's redistribution terms. This is the "frontend design skill that activates on its own for UI work" that `CLAUDE.md` already names: use it, but `CLAUDE.md`'s interface paragraph overrules it — it reaches for motion (it allows "non-user-triggered motion sparingly"), depth and big type, and Cartograph is a dense tool someone stares at for an hour. Installed with `npx skills@latest add https://github.com/anthropics/skills --skill frontend-design -a claude-code --copy -y`.
  - [supabase/agent-skills](https://github.com/supabase/agent-skills) (added 2026-10-10, revision `c9be0e931b7930f7d02126d04774d904c381e7d7`, MIT): **supabase**, **supabase-postgres-best-practices**. Installed by the CLI as junctions into `.agents/`; replaced with real copies (always pass `--copy`).
  - Committed as **real files** in `.claude/skills/` (where Claude Code reads them). The skills CLI's working copy `.agents/` is gitignored: its links use absolute machine paths and Windows git can't store links. Vendored revisions: jsmastery-pro/skills @ `43b69e44c9ca905fe3a3418ccdf4102255e20d40`, clerk/skills @ `a02dbd2a933b8929525129a6cb9dcf6ed66d0adf`, jakubkrehel/skills @ `d574cc8a576dc24256ad38268b8d03d86724a1b3`, mattpocock/skills @ `b0618bc436ad893b3c5e84e55fba86586d34a404`, anthropics/skills @ `683bc88e56f3e09ba94f7055977f3d3aa499f202` (all upstream HEAD on 2026-10-09; `skills-lock.json` stores only content hashes). **To update skills:** `pnpm skills:update` (runs the pinned skills CLI, `skills@1.7.1`, over `skills-lock.json`; `pnpm skills:list` shows what is vendored). It updates only the skills in the lock, so dropped skills stay out, and it writes real files (verified 2026-10-09). After it changes anything: diff the changed skills against a fresh clone of upstream, update the revision SHAs here and in `.claude/skills/LICENSE`, check for new scripts or install commands, run the gate, commit. To add a skill from a new source, use the recorded `npx skills@latest add … -a claude-code --copy -y` form and add a licence entry. **Never run the update in CI**: it fetches unpinned upstream content, and the CLI can crash on exit on Windows (libuv assertion) with a non-zero exit code.
  - Excluded from Prettier, ESLint and `tsconfig.json` — the Clerk skills ship example apps (`.ts/.tsx/.astro`) that would otherwise fail typecheck and lint.
  - **`CLAUDE.md` and `docs/project-doc.md` override a skill wherever they disagree** — e.g. browser acceptance checks are the owner's, so `/check verify` must not replace them; `/test` and `/debug` must ask before adding any test runner or package (the `test` skill is kept for writing tests once the owner asks for one, nothing more); decline `/audit`'s offer to move `CLAUDE.md` into `AGENTS.md` — `CLAUDE.md` is the owner's file.
- **CodeRabbit** (AI review of _our_ PRs, a GitHub App) is the owner's choice and is shown in the README badges; not installed yet, no `.coderabbit.yaml`. Unrelated to the product rule "don't grade the code", which is about what Cartograph shows its users.
- **Version pin policy**: exact pins for the framework and anything that changes output (`next`, `react`, `eslint-config-next`, `babel-plugin-react-compiler`, Prettier + plugins); `~` for TypeScript (patch only, §2.2); `^` for tools whose minors are safe (`eslint`, `tailwindcss`, `@types/*`). The lockfile fixes the installed versions either way.

### 2.11 Formatting, import sorting, and linting (researched 2026-10-09)

**Decision:** Prettier 3.9.9 + `prettier-plugin-tailwindcss` 0.8.1 + `@ianvs/prettier-plugin-sort-imports` 4.7.1, all exact pins. **ESLint stays exactly as it is.** No `eslint-config-prettier`, no Oxlint, no ESLint import-order rule.

| Candidate                | Version (2026-10-09)            | Status                                    | Fit here                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Prettier**             | 3.9.9 (`next` = 4.0.0-alpha.13) | **Stable**                                | ✅ Chosen. Formats TS/TSX, CSS (Tailwind v4 `@theme`), JSON, YAML, Markdown. create-next-app formats its own templates with Prettier.                                                                                    |
| Oxfmt (`oxfmt`)          | 0.72.0                          | **Beta** since 2026-02-24, ~weekly minors | Strong runner-up: one package, built-in import + Tailwind sorting, passes 100% of Prettier's JS/TS conformance tests. Trial output was **byte-identical** to Prettier 3.9.9 on this repo. Rejected only for beta status. |
| Biome (`@biomejs/biome`) | 2.5.15                          | Stable                                    | ❌ No YAML/Markdown formatting yet; Tailwind sorting is a nursery lint rule that can't read a v4 stylesheet; its unsigned `biome.exe` is **blocked by Windows Smart App Control** on the dev machine.                    |

**Import sorting** — owned by the formatter so there is one fix command (`pnpm format`) and the formatter and linter never fight:

- Order: Node built-ins → packages → `@/` aliases → relative, blank line between groups (`.prettierrc.json` `importOrder`). `import type` is merged into the same statement (`importOrderTypeScriptVersion: "6.0.0"`).
- **Side-effect imports (`import "./globals.css"`) are barriers** — nothing is moved across them, so CSS cascade order can't change.
- Rejected alternatives: `import/order` (bundled in `eslint-config-next`, not enabled, and **crashes on ESLint 10.12** — `sourceCode.getTokenOrCommentAfter is not a function`); `@trivago/prettier-plugin-sort-imports` (sorts side-effect imports by default — unsafe); `prettier-plugin-organize-imports` (deletes unused imports, no grouping); `eslint-plugin-simple-import-sort` / `perfectionist` (work, but would split ownership with the formatter).
- Known quirk: the plugin detaches a trailing comment after `"use client";`, so directive comments go on the line **above** the directive.

**Tailwind class sorting:** `prettier-plugin-tailwindcss` with `tailwindStylesheet: "./app/globals.css"` (required for v4). It must be the **last** entry in `plugins`.

**ESLint:**

- `eslint-config-prettier` is **not needed**: `eslint-config-next` 16.4 enables no stylistic rules (86 active rules, all correctness); its own checker reported "No rules that are unnecessary or conflict with Prettier". Add `eslint-config-prettier/flat` (≥ 10.1.8 — 10.1.6/10.1.7 were malicious, CVE-2025-54313) only if stylistic rules are ever added.
- **Oxlint not now**: covers ~82 of our 86 rules but lacks `react-hooks/config`, `react-hooks/gating`, `react/no-deprecated` and one `@next/next` rule; its React Compiler rules are experimental; its type-aware rules need `oxlint-tsgolint`, built on **TypeScript 7** (we're on 6). Running both linters now is two tools for no gain.

**Setup:**

- `.prettierrc.json` (plugins, `importOrder`, `tailwindStylesheet`); `printWidth` stays at the default 80.
- `.prettierignore`: `pnpm-lock.yaml` (Prettier already honours `.gitignore`).
- Scripts: `format` (write), `format:check` (CI step, before lint).
- **No editor-specific config is committed** (no `.vscode/`, `.idea/`, …) — owner decision, to avoid editor lock-in. Style lives only in tool-neutral files (`.prettierrc.json`, `.editorconfig`); CI's `format:check` is the enforcement. Each developer enables Prettier/ESLint/EditorConfig in their own editor (and, for the Next.js TS plugin, selects the workspace TypeScript version).
- No `allowBuilds` entries needed — none of the three packages has install scripts.
- The one-time reformat is a single `style:` commit listed in `.git-blame-ignore-revs` (`git config blame.ignoreRevsFile .git-blame-ignore-revs`; GitHub's blame view applies it automatically).

**Git hooks (Husky) — not adopted (decided 2026-10-09):**

- CI already enforces format, lint, typecheck and build on every PR — the authoritative gate. A local hook can be skipped with `git commit --no-verify`; CI cannot.
- Hooks would add two dev dependencies (husky 9.1.7 + lint-staged 17.6.0) and a `prepare` install script — against "minimal tooling" for a single contributor.
- **When a second contributor joins**, adopt Prettier's documented path: husky + lint-staged running `prettier --write` and `eslint --fix` on staged files only ([Prettier pre-commit docs](https://prettier.io/docs/precommit), [husky get started](https://typicode.github.io/husky/get-started.html)). Husky can be disabled in CI/deploys with `HUSKY=0`.

---

### 2.12 Environment validation (T3 Env, 2026-10-10)

- `env.ts` declares every variable with a zod schema: `CLERK_SECRET_KEY` must start `sk_test_`/`sk_live_`; the publishable key must decode to a bare hostname (it feeds the CSP header, so anything else could inject directives); the four sign-in/up URLs must be in-app paths (`/` but not `//`).
- `next.config.ts` imports it, so validation runs on every build and dev start, and the CSP reads the Clerk host from the validated value.
- **CI skips validation** (`SKIP_ENV_VALIDATION="1"` in `ci.yml`): CI holds no keys, real or fake. Fake key-shaped values in a public repo trip secret scanners and look like leaks; the real values are validated on every Vercel and local build instead. Only an explicit `"1"` skips. (T3 Env discourages skipping in general; this is the accepted trade-off, decided 2026-10-10.)
- **Where real keys live:** locally in `.env.local` (gitignored); on Vercel as per-environment variables (Production, Preview, Development), with `CLERK_SECRET_KEY` as a write-only Secret; in GitHub Actions encrypted secrets only if CI ever needs a real service. Never in the repo.
- `CLERK_SECRET_KEY` stays out of the browser because Next.js only inlines `NEXT_PUBLIC_*`; verified by scanning a real build's client bundles for `sk_` values (none).
- New variables go in `env.ts` and `.env.example` in the phase that first reads them.

### 2.13 Supabase MCP server (`.mcp.json`, 2026-10-10)

- **Read-only, no account tools**: `read_only=true&features=docs,database,debugging,development`. Supabase's own setup page generated a URL with `account,functions,branching` as well (it confirms the feature names); those were removed.
- **Why** ([Supabase MCP security guidance](https://supabase.com/docs/guides/getting-started/mcp)): scope to one project and prefer read-only; the main risk is prompt injection from data the agent reads. This file is committed to a public repo, and Claude Code loads project MCP servers without asking in non-interactive runs (`claude -p`, Agent SDK).
- **Schema changes don't go through MCP**: they are versioned migration files applied with the Supabase CLI, so every table and RLS policy is reviewed in a PR. For a one-off write session, add a write-capable server in _local_ scope, never in this file.
- **Pending**: add `project_ref=<ref>` to scope it to the one Cartograph project (it also disables account tools). The ref is the subdomain of `NEXT_PUBLIC_SUPABASE_URL`; it isn't secret.

## 3. Verification performed (2026-10-08 – 2026-10-09)

All on Windows 11, Node 24.13.0, pnpm 10.34.6:

- Upgrades trialled first in an isolated copy, then applied.
- `pnpm install --frozen-lockfile` from empty `node_modules` ✅ · full re-resolution → identical lockfile ✅
- `pnpm lint` ✅ · ESLint 10 probe hitting all plugins ✅
- `pnpm typecheck` from a clean checkout (no `.next/`) ✅
- `pnpm build` ✅ (`/` and `/_not-found` prerendered)
- `pnpm start`: all security headers present, no `X-Powered-By`, title/description correct, unknown route → 404 with custom page ✅
- `pnpm dev`: page 200, dev CSP includes `'unsafe-eval'`, Geist font classes applied ✅
- Pre-commit audit of the full diff: fixed Vercel Toolbar CSP, SHA-pinned actions, added Dependabot, shared fonts for `global-error`, renamed shadowing `Error` component, added `.gitattributes`/`.editorconfig` — then re-ran all checks above ✅
- 2026-10-09 formatter trial (isolated copy, all three candidates installed under our exact pnpm settings): no parse errors on TSX, `next.config.ts`, Tailwind v4 CSS, YAML or Markdown; Prettier and Oxfmt outputs byte-identical; Biome blocked by Smart App Control. In the repo: `pnpm format` → `format:check` clean on a second run (idempotent), then lint, typecheck and build ✅

---

## 4. Upgrade plan and triggers

| When / trigger                                                                                                                                 | Action                                                                                                                                                                                                                                                                | Check first                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Now**                                                                                                                                        | Update local Node 24.13.0 → latest 24.x (24.21.0+).                                                                                                                                                                                                                   | —                                                                                                                                                                                                                                                                                              |
| **2026-10-28** — Node 26 becomes LTS                                                                                                           | **Stay on 24** (Active LTS until 2026-10-20, then Maintenance until 2028-04-30). Plan the 26 move for H1 2027 once Vercel offers `26.x`.                                                                                                                              | [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [nodejs/Release](https://github.com/nodejs/Release)                                                                                                                                               |
| **Vercel officially supports pnpm 12** (watch [#17434](https://github.com/vercel/vercel/issues/17434)) — **deadline 2027-04-30** (pnpm 10 EOL) | Migrate pnpm 10 → 12 (steps in §5). If Vercel still lacks support by ~2027-03, test `ENABLE_EXPERIMENTAL_COREPACK=1` on a preview deployment. Also confirm **Dependabot** supports pnpm 12 (currently v7–v10).                                                        | [pnpm 12 changes](https://pnpm.io/blog/whats-different-in-pnpm-12), [Vercel package managers](https://vercel.com/docs/package-managers), [Dependabot ecosystems](https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories) |
| **TypeScript 7.1 ships its API _and_ typescript-eslint _and_ ts-morph support TS 7**                                                           | Evaluate TS 7 (ts-morph bundles its own TS, so the parser moves when ts-morph does).                                                                                                                                                                                  | [typescript-eslint versions](https://typescript-eslint.io/users/dependency-versions/), [TS blog](https://devblogs.microsoft.com/typescript/)                                                                                                                                                   |
| **typescript-eslint widens to `<6.x`/7**                                                                                                       | Relax `typescript` from `~6.0.3` accordingly.                                                                                                                                                                                                                         | same                                                                                                                                                                                                                                                                                           |
| **eslint-plugin-import / react / jsx-a11y add ESLint 10 peers**                                                                                | Remove matching `peerDependencyRules` entries.                                                                                                                                                                                                                        | `pnpm view <pkg> peerDependencies`                                                                                                                                                                                                                                                             |
| **Next.js 17**                                                                                                                                 | `cacheComponents`/`partialPrefetching` become defaults and the options are removed — delete them. Read the upgrade guide in `node_modules/next/dist/docs/01-app/02-guides/upgrading/`.                                                                                | [nextjs.org/blog](https://nextjs.org/blog)                                                                                                                                                                                                                                                     |
| **Every Next.js minor**                                                                                                                        | `pnpm next upgrade`; re-read the release blog; keep `eslint-config-next` = `next`.                                                                                                                                                                                    | —                                                                                                                                                                                                                                                                                              |
| **Production domain is final**                                                                                                                 | Add `metadataBase`; consider HSTS `preload` deliberately.                                                                                                                                                                                                             | —                                                                                                                                                                                                                                                                                              |
| **2027-04-30** — Node 22 & pnpm 10/11 EOL                                                                                                      | Must be on pnpm 12 by this date.                                                                                                                                                                                                                                      | —                                                                                                                                                                                                                                                                                              |
| **2028-04-30** — Node 24 EOL                                                                                                                   | Must be on Node 26 (or newer LTS) by this date.                                                                                                                                                                                                                       | —                                                                                                                                                                                                                                                                                              |
| **Oxfmt reaches 1.0 (stable)**                                                                                                                 | Re-evaluate replacing Prettier + 2 plugins with Oxfmt (one package). Migration: `oxfmt --migrate prettier`; trial output was byte-identical.                                                                                                                          | [Oxfmt docs](https://oxc.rs/docs/guide/usage/formatter.html)                                                                                                                                                                                                                                   |
| **Prettier 4 becomes `latest`**                                                                                                                | Upgrade deliberately (Dependabot ignores majors); check both plugins' peer ranges and re-run `format:check`.                                                                                                                                                          | [Prettier blog](https://prettier.io/blog)                                                                                                                                                                                                                                                      |
| **Oxlint gains `react-hooks/config` + `gating`, _or_ we move to TS 7, _or_ ESLint gets slow**                                                  | Re-evaluate Oxlint alongside ESLint (`oxlint && eslint` + `eslint-plugin-oxlint`).                                                                                                                                                                                    | [Oxlint migrate from ESLint](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html)                                                                                                                                                                                                  |
| **A patched `braces` (> 3.0.3) is released**                                                                                                   | Update via `pnpm update braces` (or wait for Dependabot); confirm `pnpm audit` is clean.                                                                                                                                                                              | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)                                                                                                                                                                                                                       |
| **`pnpm why semver@6` returns nothing**                                                                                                        | Remove the `semver@6.3.1` `trustPolicyExclude` entry.                                                                                                                                                                                                                 | `pnpm why semver`                                                                                                                                                                                                                                                                              |
| **A second contributor joins**                                                                                                                 | Add pre-commit hooks: husky + lint-staged (`prettier --write`, `eslint --fix` on staged files). Ask before installing.                                                                                                                                                | [Prettier pre-commit](https://prettier.io/docs/precommit)                                                                                                                                                                                                                                      |
| **skills CLI (`skills` npm package) has a new release**                                                                                        | Bump the pin in both `skills:*` scripts (`pnpm view skills version`), run `pnpm skills:list`, commit. Pinned on purpose: `pnpm dlx` runs it unverified and `minimumReleaseAge` doesn't cover dlx, so `@latest` would execute a fresh release the hour it's published. | [skills on npm](https://www.npmjs.com/package/skills)                                                                                                                                                                                                                                          |
| **`@clerk/nextjs` 7.9.14+ clears `minimumReleaseAge`** (7.9.14 published 2026-10-09T21:55Z)                                                    | Bump the exact pin deliberately; Clerk releases its packages in lockstep, so re-run the gate and a sign-in check.                                                                                                                                                     | [Clerk changelog](https://clerk.com/changelog)                                                                                                                                                                                                                                                 |
| **Every 3 months**                                                                                                                             | Re-run this review: `pnpm outdated`, check EOL tables, update this file's "Last reviewed".                                                                                                                                                                            | —                                                                                                                                                                                                                                                                                              |

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

Product rules and scope live in `docs/project-doc.md` and `CLAUDE.md` and **override anything here**. This section only records Next.js 16.4 facts (bundled docs, `node_modules/next/dist/docs/01-app/…`) that the phases will run into. Nothing here is built ahead of its phase.

- **Parsing in a request** (open question for the phase spec): one deployable app, no queues/workers (project doc). Docs facts to weigh: Server Actions are queued/sequential and meant for mutations; Route Handlers are not (`02-guides/backend-for-frontend.md`). `maxDuration` is platform-dependent; `after()` shares it. Live progress could stream from a Route Handler (`02-guides/streaming.md`) or come through Supabase realtime (CLAUDE.md stack) — decide in the spec. A repo too large for one request is a stated limit, not an architecture.
- **ts-morph**: auto-externalized by Next (`serverExternalPackages` default list). ts-morph 28 bundles **TypeScript 6.0.2** internally — aligned with this project's TS 6 pin. Stay on the Node.js runtime.
- **Fetching public repos**: no user tokens are stored (project doc). `fetch` is uncached by default under Cache Components. If cached, key by `owner/repo@sha`. The in-memory `use cache` store is per-instance (50 MB default) and reset on deploy — durable results belong in Supabase. Unauthenticated GitHub requests are rate-limited; decide the fetch method in the relevant phase spec.
- **CSP will need extending when each service lands.** Clerk is done (2026-10-10, matches Clerk's CSP guide exactly: Frontend API host decoded from the validated publishable key, Cloudflare Turnstile, `*.protect.clerk.com`, `img.clerk.com`, `worker-src blob:`; telemetry origins for dev keys only). Supabase will need `https://<ref>.supabase.co` and `wss://<ref>.supabase.co` in `connect-src`. Check each vendor's CSP docs then; prefer the static "Without Nonces" approach — nonce CSP conflicts with Cache Components. Clerk runs from `proxy.ts` in Next 16 (`middleware` was renamed).
- **Client map** (React Flow): keep `'use client'` at the leaf; `next/dynamic(..., { ssr: false })` only inside a Client Component. With Cache Components, hidden routes stay mounted under `<Activity>` — effects must clean up and be idempotent (`02-guides/preserving-ui-state.md`). Watch the `react-hooks` `incompatible-library` lint (React Compiler) for mutable graph libraries.
- **Security**: treat every Server Action as a public POST endpoint; authorization itself is Supabase RLS policy (project doc), not application code.
- **Checks**: phase acceptance checks are manual (CLAUDE.md). Automated checks are types, lint, build — what CI runs.
- **Optional later (ask first)**: branch protection on `main` requiring the CI check, CodeQL code scanning.

---

## 7. Open / unverified items

- What pnpm "supported" in SECURITY.md covers (security-only vs all fixes) — not stated.
- Vercel behaviour with pnpm 12 and the two-document lockfile — untested.
- Tailwind Turbopack loader vs the `turbopack.md` statement that CSS-transforming loaders are unsupported — works in practice on 16.4.
- Per-entry size limit for `'use cache'` (matters for multi-MB graphs) — not documented.
- Concrete `maxDuration` limits per hosting plan — platform-specific.

---

## 8. Sources

### Runtime & package managers

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

### Formatting & linting tools

- Prettier 3.9.9 changelog — <https://github.com/prettier/prettier/blob/3.9.9/CHANGELOG.md> · editors — <https://prettier.io/docs/editors>
- prettier-plugin-tailwindcss — <https://github.com/tailwindlabs/prettier-plugin-tailwindcss> · Tailwind class sorting — <https://tailwindcss.com/docs/editor-setup#class-sorting-with-prettier>
- @ianvs/prettier-plugin-sort-imports — <https://github.com/IanVS/prettier-plugin-sort-imports>
- Oxfmt beta announcement — <https://oxc.rs/blog/2026-02-24-oxfmt-beta.html> · sorting — <https://oxc.rs/docs/guide/usage/formatter/sorting.html> · migrate from Prettier — <https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html>
- Oxlint versioning — <https://oxc.rs/docs/guide/usage/linter/versioning.html> · React Compiler support — <https://oxc.rs/blog/2026-08-18-react-compiler-support.html> · type-aware linting — <https://oxc.rs/blog/2026-07-22-type-aware-linting-stable.html>
- Biome language support — <https://biomejs.dev/internals/language-support/> · organize imports — <https://biomejs.dev/assist/actions/organize-imports/> · useSortedClasses — <https://biomejs.dev/linter/rules/use-sorted-classes/>
- eslint-config-prettier malicious versions advisory — <https://github.com/advisories/GHSA-f29h-pxvx-f335>
- pnpm trust policy settings — <https://pnpm.io/10.x/settings#trustpolicy>

### Language & lint

- TypeScript 7.0 announcement — <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/>
- TypeScript 6.0 announcement — <https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/>
- typescript-eslint dependency versions — <https://typescript-eslint.io/users/dependency-versions/>
- ESLint version support — <https://eslint.org/version-support>

### Next.js

Bundled docs for the installed version are authoritative: `node_modules/next/dist/docs/`.

- Installation, TypeScript (`05-config/02-typescript.md`), ESLint (`05-config/03-eslint.md`), `useTypeScriptCli`, `typedRoutes`, `headers`, `cacheComponents`, `partialPrefetching`, `reactCompiler`
- Guides: `content-security-policy.md`, `production-checklist.md`, `environment-variables.md`, `data-security.md`, `self-hosting.md`, `upgrading/version-16.md`
- File conventions: `error.md`, `not-found.md`
- Next.js blog — <https://nextjs.org/blog>

### Hosting

- Vercel package managers — <https://vercel.com/docs/package-managers>
- Vercel Node.js versions — <https://vercel.com/docs/functions/runtimes/node-js/node-js-versions>
- Vercel Toolbar & CSP — <https://vercel.com/docs/vercel-toolbar/managing-toolbar#using-a-content-security-policy>
- Vercel pnpm 11/12 issue — <https://github.com/vercel/vercel/issues/17434> · PR — <https://github.com/vercel/vercel/pull/17450>
