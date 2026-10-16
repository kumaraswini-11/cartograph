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
Start), and packages under `packages/` (`ui` today). Code goes in the package
that owns it; a package uses another only by declaring it as a dependency and
importing it by its package name, never by a relative path into it.

## Rules

- `spec.md` files name no framework, library or vendor. How this repository
  builds a spec goes in its `plan.md`.
- Every dependency's version lives in the pnpm catalog (`pnpm-workspace.yaml`);
  packages write `catalog:`.
- `packages/ui/src/components/shadcn-ui` holds shadcn registry output only.
  Add components with the shadcn CLI (see the README); adjust them at the call
  site with `className`.
- Agent skills install with `-a claude-code --copy` (see `docs/bookmarks.md`).

## Before saying a change is done

Run the same checks as CI, from the repository root:

```bash
pnpm format:check
pnpm turbo run lint typecheck build
pnpm audit
```

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
