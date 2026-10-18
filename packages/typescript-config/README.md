# @workspace/typescript-config

Cartograph's TypeScript settings, one source for every package (AGENTS.md:
one source for each concern), as Turborepo recommends
([sharing `tsconfig.json`](https://turborepo.com/docs/guides/tools/typescript#sharing-tsconfigjson)).
The files are plain JSON, so their reasons are here rather than in comments.

| File         | For                                                              |
| ------------ | ---------------------------------------------------------------- |
| `base.json`  | Every package. Extended by the two below                         |
| `node.json`  | Code Node.js 24 runs directly: every TypeScript package but `ui` |
| `react.json` | The interface, `apps/web` and `packages/ui`, bundled by Vite     |

## Why these settings

- **Type checking only.** Node.js runs `.ts` files directly and Vite bundles
  the app (spec 001 plan D-05), so nothing is emitted (`noEmit`), imports
  name `.ts` files (`allowImportingTsExtensions`), and only syntax Node.js
  can strip is allowed (`erasableSyntaxOnly`, `verbatimModuleSyntax`).
- **Strict.** `strict`, plus `noUncheckedIndexedAccess` (an index may be
  missing), unused names and parameters, switch fall-through, and side-effect
  imports that resolve to nothing.
- **Node.** ES2023 and Node's own module resolution (`NodeNext`), with Node's
  types.
- **React.** ES2022 with the DOM, resolved as a bundler does, and the
  automatic JSX runtime.

A package changes only what's its own: `packages/graph` and
`packages/database` drop Node's types, since the browser loads them (the map,
and the database's `follow`); `packages/ui` allows unused names, since shadcn's
registry output is never edited by hand.

## Use

```json
{
  "extends": "@workspace/typescript-config/node.json",
  "include": ["src"]
}
```

and `"@workspace/typescript-config": "workspace:*"` in `devDependencies`.

## Status

Internal and private: never published. Nothing to build.
