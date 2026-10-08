# Cartograph

Turn any GitHub repo into an interactive dependency map. Cartograph parses real code to analyze structure, trace imports, calculate blast radius, and explain modules — without AI guessing edges.

## Requirements

- Node.js **24.x** (LTS) — see `.nvmrc`
- pnpm **10.34.6** — pinned via `packageManager` in `package.json`; any installed pnpm ≥ 9.7 switches to it automatically

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in values
pnpm dev
```

Open <http://localhost:3000>.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server (Turbopack) |
| `pnpm build` | Production build (includes type checking) |
| `pnpm start` | Serve the production build |
| `pnpm lint` / `pnpm lint:fix` | Run ESLint / auto-fix |
| `pnpm typecheck` | Generate route types and run `tsc --noEmit` |

CI (`.github/workflows/ci.yml`) runs install with a frozen lockfile, lint, typecheck, and build on every push to `main` and every pull request. Dependabot (`.github/dependabot.yml`) proposes weekly minor/patch and GitHub Actions updates; major upgrades are done deliberately.

## Stack

Next.js 16.4 (App Router, Cache Components, React Compiler) · React 19.3 · TypeScript 6.0 · Tailwind CSS 4.3 · ESLint 10 · pnpm 10 · Vercel.

Why each version was chosen, the official sources, supply-chain settings, and the upgrade plan are documented in [docs/stack-decisions.md](docs/stack-decisions.md). **Read it before upgrading any toolchain package.**

## Working with Next.js 16

This version differs from older Next.js. Before writing code, read the relevant guide in `node_modules/next/dist/docs/` (see `AGENTS.md`).
