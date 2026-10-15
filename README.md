# Cartograph | Codebase Dependency Mapper

![Cartograph: a route file's imports traced into a dependency map](docs/images/readme-banner.webp)

<!-- Badges follow the Stack section's order: app, then tooling, then planned services. -->

[![TanStack Start](https://img.shields.io/badge/TanStack_Start-39AF46?style=for-the-badge&logo=tanstack&logoColor=white)](https://tanstack.com/start)
[![React](https://img.shields.io/badge/React-23272F?style=for-the-badge&logo=react&logoColor=58C4DC)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-9135FF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)](https://ui.shadcn.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io)
[![Turborepo](https://img.shields.io/badge/Turborepo-0099F7?style=for-the-badge&logo=turborepo&logoColor=white)](https://turborepo.com)
[![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![CodeRabbit](https://img.shields.io/badge/CodeRabbit-FF570A?style=for-the-badge&logo=coderabbit&logoColor=white)](https://www.coderabbit.ai)

> The name comes from **cartography**, the craft of making maps: French _carte_ (map, ultimately from Greek _khartēs_) and _-graphie_ (from Greek _graphein_, to write or draw). A **cartographer** is the person who makes them.
>
> A cartographer surveys unknown ground and turns it into a map people can trust. Cartograph does that for a codebase you didn't write.

A dependency map of any public TypeScript or JavaScript repository, drawn from the code itself.

## About

Paste a public TypeScript or JavaScript repository and get a map of it: folders
as boxes, imports as lines between them. Every box and every line comes from
parsing the real code; nothing on the map is guessed.

The project is being built as a monorepo. This repository holds the
foundation so far: the web app and its UI package.

## Features (planned)

- **Real parsing**: imports, re-exports, dynamic imports and `require()` become edges. An import that can't be resolved is reported with a reason, never guessed.
- **Coverage report**: how much of the repository was parsed, and why the rest wasn't.
- **Interactive map**: folders fold into boxes and expand into files; select a file to highlight what flows into and out of it.
- **Blast radius and dependency chains**: arithmetic over the edge list, shown instantly with no network request.
- **Grounded explanations**: a paragraph about a file, written from the file and its real neighbours, cached, and checked never to name a file that doesn't exist.
- **Repository chat**: an agent that looks facts up and shows its lookups before it answers. Graph walks are done by the same arithmetic that draws the map, never by the model.
- **Organizations**: analyses belong to an organization; access is enforced by Postgres row-level security, not by application code.
- **Live progress** while a repository is being parsed.

## Stack

In this repository now:

- [TanStack Start](https://tanstack.com/start) and
  [TanStack Router](https://tanstack.com/router), on React 19 and Vite 8
- [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com), with
  Tailwind CSS 4
- TypeScript 6, ESLint 10 (`@tanstack/eslint-config`), Prettier
- [pnpm](https://pnpm.io) workspaces and [Turborepo](https://turborepo.com)

Planned, not yet installed:

- [React Flow](https://reactflow.dev) and [dagre](https://github.com/dagrejs/dagre) for the map and its layout
- [Clerk](https://clerk.com) for sign-in and organizations
- [Supabase](https://supabase.com) Postgres, with row-level security
- [LangSmith](https://www.langchain.com/langsmith) for tracing AI calls
- [CodeRabbit](https://www.coderabbit.ai) for pull-request review

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

## Agent skills

Claude Code skills live in `.claude/skills/`, pinned in `skills-lock.json`.
Always install with `-a claude-code --copy`:

```bash
pnpm dlx skills@latest add <source> --skill <name> -a claude-code --copy -y
pnpm dlx skills@latest update
```

Every command, the reason for each flag, and what's installed are in
[docs/bookmarks.md](docs/bookmarks.md#agent-skills).

## References

- [Project doc](docs/project-doc.md): what Cartograph is and why each decision was made
- [Bookmarks](docs/bookmarks.md): useful external references, and the installed agent skills

## License

Proprietary. All rights reserved; see [LICENSE](LICENSE).
