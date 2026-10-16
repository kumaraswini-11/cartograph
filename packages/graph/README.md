# @workspace/graph

The map's arithmetic: from a repository's files and edges, the boxes the map
shows (folded so at most `FOLD_TARGET` fit), their labels and sizes, the
layout, what a selection keeps at full strength, and each box's count of
files in a role; for the detail pane, blast radius and dependency chain (one
walk over the edges), the summary's lists and the roles inside a box; and
the insights (unimported, heavily imported and oversized files, and cycles),
each with its fixed sentence.

## Why a separate package

Graph calculations are pure functions over a list of files and a list of
edges, with nothing to fetch and nothing to mock (`docs/project-doc.md`).
Kept apart from the interface, the same arithmetic serves the map and the
detail pane in the browser now, and insights and chat later (specs 005,
010). It imports no React, no React Flow and no storage.

## Use

```ts
import {
  buildBoxes,
  edgeIndex,
  fullStrength,
  layoutMap,
  walk,
} from "@workspace/graph"

const map = buildBoxes(input.files, input.edges)
const layout = layoutMap(map, input.edges, new Set(["src/lib"]))
const strength = fullStrength(layout, { box: "src/lib" })

// Blast radius: every file that depends on it, level by level.
const levels = walk(edgeIndex(input.edges), "src/lib/env.ts", "dependents")
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

[Spec 004](../../docs/specs/004-detail-pane/spec.md) ·
[plan](../../docs/specs/004-detail-pane/plan.md) ·
[tasks](../../docs/specs/004-detail-pane/tasks.md)

[Spec 005](../../docs/specs/005-structural-insights/spec.md) ·
[plan](../../docs/specs/005-structural-insights/plan.md) ·
[tasks](../../docs/specs/005-structural-insights/tasks.md)
