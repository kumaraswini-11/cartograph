# Cartograph

Paste a public TypeScript or JavaScript repository and get a map of it: folders
as boxes, imports as lines between them. Every box and every line comes from
parsing the real code; nothing on the map is guessed.

The project is being rebuilt as a monorepo. This repository holds the
foundation so far: the web app and its UI package.

## Stack

- [TanStack Start](https://tanstack.com/start) and
  [TanStack Router](https://tanstack.com/router), on React 19 and Vite 8
- [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com), with
  Tailwind CSS 4
- TypeScript 6, ESLint 10 (`@tanstack/eslint-config`), Prettier
- [pnpm](https://pnpm.io) workspaces and [Turborepo](https://turborepo.com)

## Layout

```text
apps/
  web/          the TanStack Start app
packages/
  ui/           shared UI: shadcn components, the theme (globals.css), cn
```

Dependency versions shared between packages are defined once, in the
[catalog](https://pnpm.io/catalogs) in `pnpm-workspace.yaml`; packages refer to
them as `catalog:`.

## Getting started

Requires Node.js 22.12 or later and pnpm (the version is set by
`packageManager` in `package.json`).

```bash
pnpm install
pnpm dev
```

The app runs at <http://localhost:3000>.

## Scripts

Run from the repository root; Turborepo runs each across the workspace.

| Script           | What it does                                           |
| ---------------- | ------------------------------------------------------ |
| `pnpm dev`       | Starts the app in development mode                     |
| `pnpm build`     | Builds the app                                         |
| `pnpm lint`      | Lints every package                                    |
| `pnpm typecheck` | Type-checks every package                              |
| `pnpm format`    | Formats every package's TypeScript files with Prettier |

## Adding UI components

Add shadcn components from the root; they're written to
`packages/ui/src/components`:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Then import them from the UI package:

```tsx
import { Button } from "@workspace/ui/components/button"
```

## License

Proprietary. All rights reserved; see [LICENSE](LICENSE).
