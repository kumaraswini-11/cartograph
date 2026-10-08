# Cartograph

> A **cartograph** is a map or chart. The word comes from Greek _chartēs_ (paper, map) and _graphein_ (to draw or write). **Cartography** is the craft of making maps; a **cartographer** is the person who makes them.
>
> A cartographer surveys unknown ground and turns it into a map people can trust. Cartograph does that for a codebase you didn't write.

A dependency map of any public TypeScript or JavaScript repository, drawn from the code itself.

Paste a repo URL and see folders as boxes and imports as lines. Select a file to see what it imports, what imports it, and what breaks if it changes. Every edge comes from really parsing the code. The AI explains what the parser found; it never decides what's there.

## Status

Early development, built phase by phase from specs in `docs/specs/`.

## Requirements

- Node.js **24.x** (LTS), see `.nvmrc`
- pnpm **10.34.6**, pinned in `package.json` (pnpm ≥ 9.7 switches to it automatically)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in values
pnpm dev
```

Open <http://localhost:3000>.

## Scripts

| Command                             | What it does                                                     |
| ----------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                          | Dev server                                                       |
| `pnpm build`                        | Production build                                                 |
| `pnpm start`                        | Serve the production build                                       |
| `pnpm format` / `pnpm format:check` | Prettier: format (incl. import and Tailwind class order) / check |
| `pnpm lint` / `pnpm lint:fix`       | ESLint / auto-fix                                                |
| `pnpm typecheck`                    | Generate route types, then `tsc --noEmit`                        |

CI runs format check, lint, typecheck and build on every pull request.

## Docs

- [Project doc](docs/project-doc.md): what Cartograph is and why each decision was made
- [CLAUDE.md](CLAUDE.md): working rules for building it
- [Stack decisions](docs/stack-decisions.md): toolchain versions, sources and upgrade plan. Read before upgrading anything.
- [Bookmarks](docs/bookmarks.md): useful external references

## License

Proprietary. Copyright (c) 2026 Aswini Kumar. All rights reserved. See [LICENSE](LICENSE).
