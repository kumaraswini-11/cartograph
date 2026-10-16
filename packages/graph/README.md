# @workspace/graph

The map's arithmetic: from a repository's files and edges, the boxes the map
shows (folded so at most `FOLD_TARGET` fit), their labels and sizes, the
layout, what a selection keeps at full strength, and each box's count of
files in a role.

## Why a separate package

Graph calculations are pure functions over a list of files and a list of
edges, with nothing to fetch and nothing to mock (`docs/project-doc.md`).
Kept apart from the interface, the same arithmetic serves the map in the
browser now, and the detail pane, insights and chat later (specs 004, 005,
010). It imports no React, no React Flow and no storage.

## Use

```ts
import { buildBoxes, fullStrength, layoutMap } from "@workspace/graph"

const map = buildBoxes(input.files, input.edges)
const layout = layoutMap(map, input.edges, new Set(["src/lib"]))
const strength = fullStrength(layout, { box: "src/lib" })
```

`toMapInput(source, parsed, detection)` builds the input from the parser's
and detection's results. The thresholds and layout values live in
`src/limits.ts`, one source for each.

| Command (from the repository root)    | What it does   |
| ------------------------------------- | -------------- |
| `pnpm --filter @workspace/graph test` | Runs its tests |

## Status

Internal and private: never published. No build step; it declares
`sideEffects: false`, so a page importing one value doesn't load the layout.

## Docs

[Spec 003](../../docs/specs/003-dependency-map/spec.md) ·
[plan](../../docs/specs/003-dependency-map/plan.md) ·
[tasks](../../docs/specs/003-dependency-map/tasks.md)
