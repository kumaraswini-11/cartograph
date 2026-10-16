# @workspace/vitest-config

Cartograph's Vitest settings, one source for every package's tests (AGENTS.md:
one source for each concern), as Turborepo recommends
([Vitest](https://turborepo.com/docs/guides/tools/vitest)): tests run in Node,
beside the code they test (`src/**/*.test.ts`, `src/**/*.test.tsx`).

## Use

```ts
// vitest.config.ts
import { config } from "@workspace/vitest-config"

export default config
```

A package that needs more merges it with Vitest's `mergeConfig`.

## Status

Internal and private: never published. Nothing to build.
