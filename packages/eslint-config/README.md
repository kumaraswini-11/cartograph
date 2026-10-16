# @workspace/eslint-config

Cartograph's ESLint settings, one source for every package (AGENTS.md: one
source for each concern), as Turborepo recommends
([ESLint](https://turborepo.com/docs/guides/tools/eslint)): TanStack's rules
(`@tanstack/eslint-config`), with the few this repository leaves off.

## Use

```js
// eslint.config.js
import { config } from "@workspace/eslint-config"

export default [...config, { ignores: [".output/"] }]
```

and `"@workspace/eslint-config": "workspace:*"` beside `eslint` in
`devDependencies`.

## Status

Internal and private: never published. Nothing to build.
