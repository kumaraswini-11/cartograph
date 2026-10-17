# @workspace/parser

Turns a directory on disk into files, imports, edges and coverage: every box
and line on Cartograph's map comes from here.

## Why a separate package

The parser is the rule everything rests on, and it must run on its own: no
framework, interface, storage or network (spec 001, C-01). As a package with
only oxc and Zod as dependencies, it can be tested and reused alone, and a
test (AC-09) fails if anything else creeps in.

## Use

```ts
import { isTooLarge, parseRepository, writeResult } from "@workspace/parser"

const result = parseRepository("/path/to/repository")
if (!isTooLarge(result)) writeResult("result.json", result)
```

| Command (from the repository root)                      | What it does                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm --filter @workspace/parser parse <dir> [--out f]` | Parses a directory and prints its counts and coverage                    |
| `pnpm --filter @workspace/parser golden`                | Parses the golden repositories and fails on drift from the pinned counts |
| `pnpm --filter @workspace/parser test`                  | Runs its tests                                                           |

Each file's `hash` is `contentHash(bytes)`, the SHA-256 of its bytes. It's
exported, so a file fetched later is checked the same way (spec 009).

Other entry points, each one source for its concern:

- `@workspace/parser/paths`: how the result writes paths (compare, folder,
  file name) and which files are source (extensions, a compiled file's
  source); pure, so the browser uses it too.
- `@workspace/parser/json`: reading configuration (JSON with comments),
  telling an object apart, and writing and checking results; shared with
  detection.
- `@workspace/parser/syntax`: how the parser reads syntax, shared with
  detection.
- `@workspace/parser/command`: what every command over a directory shares:
  its `<directory> [--out <file>]` arguments and its messages.
- `@workspace/parser/testing`: a temporary repository for tests.

## Status

Internal and private: never published. Node.js 24 runs its TypeScript
directly; there's no build step (plan D-05).

## Docs

[Spec 001](../../docs/specs/001-repository-parser/spec.md) ·
[plan](../../docs/specs/001-repository-parser/plan.md) ·
[tasks](../../docs/specs/001-repository-parser/tasks.md)
