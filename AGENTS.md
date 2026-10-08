<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules

- Before upgrading or adding any toolchain package (Node, pnpm, TypeScript, ESLint, Next.js, Tailwind), read `docs/stack-decisions.md`. Several versions are pinned below `latest` on purpose (e.g. TypeScript 6, not 7; pnpm 10 because of Vercel).
- Prefer LTS / actively-supported lines; verify against the official site and update `docs/stack-decisions.md` with every toolchain change.
- pnpm supply-chain settings live in `pnpm-workspace.yaml` (`allowBuilds`, `strictDepBuilds`, `minimumReleaseAge`, …). Do not weaken them; add narrow exceptions instead.
