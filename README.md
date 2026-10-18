# Cartograph | Codebase Dependency Mapper

![Cartograph: a route file's imports traced into a dependency map](docs/images/readme-banner.webp)

<!-- Badges follow the Stack section's order: the app, the tooling, then the services. Each takes its brand's colour (Simple Icons, from each brand's guidelines; React's from react.dev); where shields' white text on it would read under 3:1, the badge is black and the logo carries the colour. -->

[![TanStack Start](https://img.shields.io/badge/TanStack_Start-ECE8D1?style=for-the-badge&logo=tanstack&logoColor=black)](https://tanstack.com/start)
[![React](https://img.shields.io/badge/React-23272F?style=for-the-badge&logo=react&logoColor=58C4DC)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-9135FF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)](https://ui.shadcn.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-000000?style=for-the-badge&logo=tailwindcss&logoColor=06B6D4)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![pnpm](https://img.shields.io/badge/pnpm-000000?style=for-the-badge&logo=pnpm&logoColor=F69220)](https://pnpm.io)
[![Turborepo](https://img.shields.io/badge/Turborepo-FF1E56?style=for-the-badge&logo=turborepo&logoColor=white)](https://turborepo.com)
[![Vitest](https://img.shields.io/badge/Vitest-000000?style=for-the-badge&logo=vitest&logoColor=00FF74)](https://vitest.dev)
[![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com)
[![Supabase](https://img.shields.io/badge/Supabase-000000?style=for-the-badge&logo=supabase&logoColor=3FCF8E)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev)
[![AI SDK](https://img.shields.io/badge/AI_SDK-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://ai-sdk.dev)
[![LangSmith](https://img.shields.io/badge/LangSmith-7FC8FF?style=for-the-badge&logo=langchain&logoColor=black)](https://www.langchain.com/langsmith)
[![PostHog](https://img.shields.io/badge/PostHog-000000?style=for-the-badge&logo=posthog&logoColor=F1A82C)](https://posthog.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![CodeRabbit](https://img.shields.io/badge/CodeRabbit-FF570A?style=for-the-badge&logo=coderabbit&logoColor=white)](https://www.coderabbit.ai)

> The name comes from **cartography**, the craft of making maps: French _carte_ (map, ultimately from Greek _khartēs_) and _-graphie_ (from Greek _graphein_, to write or draw). A **cartographer** is the person who makes them.
>
> A cartographer surveys unknown ground and turns it into a map people can trust. Cartograph does that for a codebase you didn't write.

A dependency map of any public TypeScript or JavaScript repository, drawn from the code itself.

## About

Paste a public TypeScript or JavaScript repository and get a map of it: folders
as boxes, imports as lines between them. Every box and every line comes from
parsing the real code; nothing on the map is guessed. When a model explains a
file or answers a question, it works from those same facts, and what it says
is checked against them.

Cartograph is a monorepo: one web app and the packages it's built from: the
parser, framework detection, the map's arithmetic, storage, GitHub access,
the model and its tracing, and the evaluation of what the model writes.

## How it works

```text
GitHub address
  → the default branch's commit, and its archive, streamed (no token)
  → the parser: files, imports and edges, and why anything wasn't read
  → framework detection: each file's role, entry points and routes
  → the map's arithmetic: folders folded into boxes, laid out, measured
  → stored for the organization, under row-level security
  → the map, the detail pane, explanations and chat, all from those facts
```

A run happens after the response, and its stages reach the page as they
happen. Anything a model writes is held to the parsed facts: an answer that
names a file the repository doesn't have is never shown.

## Features

### The map

- **Real parsing**: imports, re-exports, dynamic imports and `require()` become edges, across TypeScript path aliases and workspaces. An import that can't be resolved is reported with a reason, never guessed.
- **Coverage report**: how much of the repository was parsed, and why the rest wasn't.
- **Interactive map**: folders fold into boxes and open into files; select a file to highlight what flows into and out of it.
- **Framework roles**: Next.js, NestJS, Express and React files named for what they are (page routes, controllers, services and so on), with their routes.
- **Blast radius and dependency chains**: arithmetic over the edge list, shown instantly with no network request.
- **Structural insights**: heavily imported files, oversized files, and files with a role that nothing imports.
- **Live progress** while a repository is being fetched, parsed and stored.

### AI that shows its work

- **Grounded explanations**: a paragraph about a file or a box, written from the file and its real neighbours, cached per organization, and checked never to name a file that isn't there.
- **Repository chat**: an agent that looks facts up and shows its lookups before it answers. Graph walks are done by the same arithmetic that draws the map, never by the model.
- **Measured quality**: `pnpm eval` scores explanations and chat answers on fixed cases pinned to commits, by arithmetic, and fails on a regression.

### For teams

- **Organizations**: analyses belong to an organization, and its members are invited by its admins. Access is enforced by Postgres row-level security, not by application code.
- **Fair limits**: each organization may start 20 runs an hour and make 100 model calls a day; past that, it's told when it can go on.

## Held to account

Each of these is a check that runs, not a promise.

- **Nothing on the map is guessed.** The parser's results are compared with golden repositories at pinned commits; an import it can't resolve is listed with its reason.
- **AI quality is a number.** The evaluation requires every explanation to be grounded (100%), and fails when a score drops more than 2 points from the accepted run. Its cases are archived, so it runs with no network.
- **Isolation is the database's job.** Every table has row-level security, and pgTAP tests prove that a member of one organization can read nothing of another's.
- **Security headers on every response**: a content security policy that names each source it allows, with a nonce new for every response and no `unsafe-inline` or `unsafe-eval` for scripts; strict transport security, `nosniff`, a referrer policy, a permissions policy and no framing. Every write is checked against CSRF.
- **Privacy by default.** Error reports and product events never carry source, explanation or chat text, or an email. Analytics keep nothing on the device, so there's no cookie banner to click through.
- **Accessible.** Every page is rendered and audited with axe-core against WCAG 2.2 AA in the tests; contrast and target size are checked in a real browser, in light and dark.
- **Fast where it's heavy.** The map's layout runs in a Web Worker, off the page's main thread; the targets are Core Web Vitals' "good" thresholds, measured from real page loads.
- **Specified before it's built.** Thirteen specs, each with requirements, constraints and acceptance criteria, and decision records for the choices that are hard to reverse.

## What's next

[Spec 012, production readiness](docs/specs/012-production-readiness/spec.md),
is built; its acceptance checks on the production address come last.

After that, the ideas worth weighing are kept in
[docs/future-improvements.md](docs/future-improvements.md): how Cartograph
compares with other repository tools, and what could come next (opening a
repository from its GitHub address, giving AI assistants the map's facts,
exporting the map, plans and pricing), each checked against the rule that
nothing on the map is guessed. For the interface itself: a Storybook of its
components, with Chromatic reviewing every pull request's visual changes.

## Stack

The specs name no stack; any stack that provides the capabilities they ask
for can build Cartograph. This is what this repository uses. The reasons, and
the alternatives considered, are in
[ADR 0001](docs/adr/0001-stack-and-repository-layout.md).

- **The app**: [TanStack Start](https://tanstack.com/start) and
  [TanStack Router](https://tanstack.com/router), on React 19 and Vite 8,
  rendered on the server; [shadcn/ui](https://ui.shadcn.com) on
  [Base UI](https://base-ui.com), with Tailwind CSS 4;
  [React Flow](https://reactflow.dev) and
  [dagre](https://github.com/dagrejs/dagre) for the map and its layout
- **Parsing**: [oxc](https://oxc.rs)'s parser and resolver
- **Tooling**: TypeScript 6, ESLint 10 (`@tanstack/eslint-config`), Prettier,
  [Vitest](https://vitest.dev), [pnpm](https://pnpm.io) workspaces and
  [Turborepo](https://turborepo.com)
- **Sign-in and organizations**: [Clerk](https://clerk.com)
- **Storage and live progress**: [Supabase](https://supabase.com) Postgres,
  with row-level security tested by pgTAP, and Realtime
- **AI**: [Gemini](https://ai.google.dev) through the
  [AI SDK](https://ai-sdk.dev), traced in
  [LangSmith](https://www.langchain.com/langsmith)
- **Errors and events**: [PostHog](https://posthog.com) (EU)
- **Hosting**: [Vercel](https://vercel.com), built by
  [Nitro](https://nitro.build), with Speed Insights
- **Review**: [CodeRabbit](https://www.coderabbit.ai) on every pull request

## Layout

A modular monolith in a monorepo: one deployable app, with its code split
into packages that reach each other only through declared dependencies.

```text
apps/
  web/          the TanStack Start app
packages/
  ui/           shared UI: shadcn components, the theme (globals.css), cn
  parser/       a directory on disk in; files, imports, edges and coverage out
  frameworks/   each package's framework, file roles, entry points and routes
  graph/        the map's arithmetic: folding, labels, layout, selection, insights
  github/       public repositories without a token: addresses, commits, archives
  database/     Supabase: migrations, row-level policies and their tests, queries
  ai/           the model, its tracing, explanations and the chat's lookups
  evals/        scores explanations and chat answers, by arithmetic
  golden/       dev-only: downloads the golden repositories the tests pin
  typescript-config/, eslint-config/, vitest-config/
                the settings every package shares
```

Each package has a README: what it is, why it's a package of its own, and
how to use it.

Dependency versions shared between packages are defined once, in the
[catalog](https://pnpm.io/catalogs) in `pnpm-workspace.yaml`; packages refer to
them as `catalog:`.

## Getting started

Requires Node.js 24, pnpm (the version is set by `packageManager` in
`package.json`), and Docker Desktop, running, for the local database.

```bash
pnpm install

# The local database: Postgres, its API and Realtime, with every migration.
pnpm --filter @workspace/database db:start
pnpm --filter @workspace/database db:reset

# Configuration: copy the example and fill it in.
cp apps/web/.env.example apps/web/.env.local

pnpm dev
```

[`apps/web/.env.example`](apps/web/.env.example) lists every variable, where
each value comes from, and which are optional. Locally you need a Clerk
development instance's keys, the local database's values (printed by
`pnpm --filter @workspace/database exec supabase status`) and a Gemini API
key on its free tier. Tracing and error reports are optional, and everything
works without them.

The app runs at <http://localhost:3000>.

## Scripts

Run from the repository root. Turborepo runs `dev`, `build`, `lint`,
`typecheck` and `test` in each package; Prettier runs once over the whole
repository.

| Script              | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `pnpm dev`          | Starts the app in development mode                            |
| `pnpm build`        | Builds the app                                                |
| `pnpm lint`         | Lints every package                                           |
| `pnpm typecheck`    | Type-checks every package                                     |
| `pnpm test`         | Runs every package's tests (Vitest)                           |
| `pnpm eval`         | Scores explanations and chat answers against the accepted run |
| `pnpm format`       | Formats every file in the repository with Prettier            |
| `pnpm format:check` | Checks formatting without writing (this is what CI runs)      |

The database's own scripts (start, reset, its pgTAP tests, Supabase's
advisors, generated types, sample data) are in
[packages/database/README.md](packages/database/README.md#the-local-database).

## Deploying

The app is hosted on Vercel and built by Nitro
([ADR 0002](docs/adr/0002-hosting-on-vercel-with-nitro.md)): every pull
request gets a preview address, and `main` deploys to production. Setting up
the Vercel project is in
[spec 000's tasks](docs/specs/000-platform-requirements/tasks.md); migrations
reach production on merge, as
[packages/database/README.md](packages/database/README.md) describes.

## Adding UI components

With the shadcn CLI, registry first: the steps are in
[packages/ui/README.md](packages/ui/README.md#adding-components).

## Agent skills

Claude Code skills live in `.claude/skills/`, pinned in `skills-lock.json`.
Always install with `-a claude-code --copy`:

```bash
pnpm dlx skills@latest add <source> --skill <name> -a claude-code --copy -y
pnpm dlx skills@latest update
```

TanStack's own skills ship inside its packages and load through
[TanStack Intent](https://tanstack.com/intent/latest/docs/getting-started/quick-start-consumers):
`pnpm exec intent list`.

Every command, the reason for each flag, and what's installed are in
[docs/bookmarks.md](docs/bookmarks.md#agent-skills).

## References

Start with [docs/specs/README.md](docs/specs/README.md): it says what to read
first, whether you're building Cartograph your own way or working on this
repository.

- [Project doc](docs/project-doc.md): what Cartograph is and why each decision was made
- [Glossary](CONTEXT.md): one meaning per term, used by the specs, the code and the interface
- [Specs](docs/specs/README.md): the thirteen capabilities, in build order
- [Decision records](docs/adr/): hard-to-reverse choices, with the trade-off behind each
- [AGENTS.md](AGENTS.md): how to work in this repository: the rules for packages, the interface, rendering, performance and accessibility
- [Future improvements](docs/future-improvements.md): ideas for later, and how Cartograph compares with other repository tools
- [Bookmarks](docs/bookmarks.md): useful external references, and the installed agent skills

## License

Proprietary. All rights reserved; see [LICENSE](LICENSE).
