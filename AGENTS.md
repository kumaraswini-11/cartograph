<!-- intent-skills:start -->

## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:

- Run `pnpm exec intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm exec intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

# Working in this repository

Cartograph maps a public TypeScript or JavaScript repository from its parsed
code. Nothing on the map is guessed.

## Read first

- `docs/project-doc.md`: what Cartograph is, and the rule everything rests on.
- `CONTEXT.md`: the glossary. Use its terms in code, specs and the interface,
  and none of the words it lists under _Avoid_.
- `docs/specs/README.md`: how specs, plans and tasks fit together; then the
  `spec.md`, `plan.md` and `tasks.md` of the spec you're working on.
- `docs/adr/`: the decisions already made, starting with the stack (`0001`).

## Layout

A modular monolith in a monorepo: one deployable app, `apps/web` (TanStack
Start), and packages under `packages/` (`ui`, `parser`, `frameworks`,
`graph`, `database`, `github`, `ai`, `golden` and `evals` today, and
`typescript-config`, `eslint-config` and `vitest-config`, the settings every
package shares), each with a README. Code goes in the package that owns it;
a package uses another only by declaring it as a dependency and importing it
by its package name, never by a relative path into it.

## Rules

### Repository

- `spec.md` files name no framework, library or vendor that Cartograph is
  built with. How this repository builds a spec goes in its `plan.md`. What
  the product itself reads or recognises is named: GitHub, TypeScript,
  JavaScript, the frameworks `002` detects and the file types `001` reads.
- Every dependency's version lives in the pnpm catalog (`pnpm-workspace.yaml`);
  packages write `catalog:`.
- Agent skills install with `-a claude-code --copy` (see `docs/bookmarks.md`).
- A deliberate departure from official guidance or a vendored skill is
  recorded, with its reason, in the spec's `plan.md` or in `docs/adr/`.

### Packages

- A package does one job and knows nothing it doesn't need: the parser and the
  graph arithmetic import no framework, interface or storage code, so they can
  be reused and tested on their own.
- Shared code goes in a package once a second package needs it; code one
  package needs stays in that package.
- One source for each concern: a rule, a type or a helper is defined once and
  imported, never copied.

### Interface

- **Registry first.** Before writing any UI, check the shadcn registry
  (`shadcn search`, `shadcn docs`). If it has the component, install it (if it's
  missing) and use it; never hand-build one the registry has.
- `packages/ui/src/components/shadcn-ui` holds registry output only. Add
  components with the shadcn CLI (see `packages/ui/README.md`); adjust them at the call
  site with `className`, never by editing the file.
- **Shared compositions, by the
  [rule of three](<https://en.wikipedia.org/wiki/Rule_of_three_(computer_programming)>).**
  When the same composition of shadcn components appears a third time, make
  one component of it, not before: duplication is cheaper than the wrong
  abstraction ([Sandi Metz](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction);
  [AHA programming](https://kentcdodds.com/blog/aha-programming)). Shared
  ones in `packages/ui/src/components`, beside `shadcn-ui`; ones a single
  feature uses in `apps/web/src/components/<feature>/`. Keep it thin: a few
  props, and `children` or slots for the cases it doesn't cover. Don't wrap a
  component only to rename it. Follow the `vercel-composition-patterns` skill:
  compound components and explicit variants rather than boolean props.
- Components present data they're given; data comes from route loaders and
  server functions, never from inside a presentational component.
- Use semantic tokens (`bg-background`, `text-muted-foreground`), never raw
  colours, and semantic HTML elements before `div`s.

### Rendering (TanStack Start)

- Pages render on the server by default. Set a route's `ssr` to `false` or
  `'data-only'` only when it can't render on the server, and say why in a
  comment.
- Read and change data through `createServerFn`; keep secrets and
  server-only code behind `createServerOnlyFn`. Code is isomorphic by default,
  so nothing server-only goes in a module the browser also loads.
- Load the matching TanStack skill first (`pnpm exec intent list`), for
  example `start-core/server-functions`, `start-core/execution-model` or
  `router-core/data-loading`.
- Browser-only UI (anything that needs `window` or measures itself in the
  browser, as the map's drawing may) renders inside `<ClientOnly>`, with a
  fallback of the same size so the page doesn't shift.

### Performance and accessibility

- Pages meet the thresholds in spec `012`:
  [Core Web Vitals](https://web.dev/articles/vitals) (largest contentful
  paint, interaction to next paint, cumulative layout shift) and
  [WCAG 2.2](https://www.w3.org/TR/WCAG22/) AA.
- Nothing shifts after the first paint: reserve space for late content, and
  load fonts so text doesn't jump.
- For interface work, use the installed skills: `better-accessibility`,
  `better-layout`, `better-typography`, `better-ui`, `emil-design-eng`, and
  `interface-review` before a change is done; for speed, `core-web-vitals` and
  `performance`.

## Before saying a change is done

Run the same checks as CI, from the repository root:

```bash
pnpm format:check
pnpm turbo run lint typecheck test build
pnpm audit
```

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
