# @workspace/frameworks

Recognises the framework each package of a repository follows (Next.js,
NestJS, Express, React, or none), gives every file the role its framework
names it by, marks its entry points, and recovers its routes exactly or not
at all.

## Why a separate package

Framework knowledge must never leak into the parser (spec 002, C-05): it
lives here, one folder per framework under `src/adapters/`. It reads the
parser's result and the same directory, and a test (AC-06) fails if a
framework's name appears outside its own adapter, or anywhere in the parser.

## Use

```ts
import { isTooLarge, parseRepository } from "@workspace/parser"
import { detectFrameworks } from "@workspace/frameworks"

const parsed = parseRepository(directory)
if (!isTooLarge(parsed)) {
  const { packages, files, routes, taxonomy } = detectFrameworks(
    directory,
    parsed
  )
}
```

`@workspace/frameworks/taxonomy` holds only the role names and their order,
with no parser or file system, so the interface can import it alone (C-02).

| Command (from the repository root)                           | What it does                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `pnpm --filter @workspace/frameworks detect <dir> [--out f]` | Parses and detects a directory; prints packages, roles and routes         |
| `pnpm --filter @workspace/frameworks golden`                 | Detects the golden repositories and fails on drift from the pinned counts |
| `pnpm --filter @workspace/frameworks test`                   | Runs its tests                                                            |

## Adding a framework

Every framework says in its own way what a file is (Next.js: `app/shop/page.tsx`
is a page; SvelteKit: `src/routes/shop/+page.svelte`), so each needs its own
rules, written once. Adding one touches nothing else:

1. A new folder in `src/adapters/` with `taxonomy.ts` (its role names, by
   tier) and `adapter.ts` (its rules), listed in `src/adapters/index.ts`.
2. Its own spec, with a golden repository checked by hand.

Without an adapter, a repository still gets its full map from the parser;
its files take the roles of an adapter it does match (a TanStack Start app
declares React, so React's), or are Unidentified. Frameworks that keep code in
their own file types (`.vue`, `.svelte`, `.astro`) need the parser to read
those files first: see spec 002's [out of scope](../../docs/specs/002-framework-detection/spec.md#out-of-scope).

## Status

Internal and private: never published. No build step; Node.js 24 runs the
TypeScript.

## Docs

[Spec 002](../../docs/specs/002-framework-detection/spec.md) ·
[plan](../../docs/specs/002-framework-detection/plan.md) ·
[tasks](../../docs/specs/002-framework-detection/tasks.md)
