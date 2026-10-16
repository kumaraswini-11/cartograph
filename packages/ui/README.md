# @workspace/ui

Cartograph's shared interface: shadcn/ui components on Base UI, the theme
(`globals.css`, with Tailwind CSS 4) and the `cn` helper.

## Why a separate package

One source for the interface: every app imports the same components and the
same theme, so the look stays consistent and a component is fixed once
(AGENTS.md: Interface). It knows nothing about the parser, detection or data;
components present what they're given.

## Use

```tsx
import "@workspace/ui/globals.css"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import { cn } from "@workspace/ui/lib/utils"
```

`src/components/shadcn-ui` holds registry output only: adjust a component at
the call site with `className`, never by editing its file.

## Adding components

Check the registry first (`shadcn search`, `shadcn docs`): never hand-build a
component it has. From the repository root, run the shadcn CLI installed in
this package (the version pinned in the catalog):

```bash
pnpm --filter @workspace/ui exec shadcn add [COMPONENT]
```

Running it from the app's folder, as
[shadcn's monorepo guide](https://ui.shadcn.com/docs/monorepo) shows, writes
the same files with the latest CLI. Use this form for blocks: their
page-specific parts belong in `apps/web`, which this package can't see.

```bash
cd apps/web
pnpm dlx shadcn@latest add [COMPONENT]
```

A composition of components that appears a third time becomes one shared
component in `src/components`, beside `shadcn-ui`
([rule of three](<https://en.wikipedia.org/wiki/Rule_of_three_(computer_programming)>)).

## Status

Internal and private: never published. No build step; the app's bundler
reads the source.

## Docs

[AGENTS.md: Interface](../../AGENTS.md#interface) ·
[ADR 0001](../../docs/adr/0001-stack-and-repository-layout.md)
