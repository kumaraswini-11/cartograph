# @workspace/golden

The answer key's tooling. A golden repository is a real public repository
frozen at one commit, whose counts were checked by hand and pinned in a
spec. This package downloads each one once and compares today's counts with
the pinned ones, so any change that moves a number is caught.

## Why a separate package

The parser's and detection's golden scripts both need it. One package keeps
one copy (AGENTS.md: shared code goes in a package once a second package
needs it), and keeps the network out of the parser, which must never touch
it (spec 001, C-01).

## Use

```ts
import { checkout, compareCounts } from "@workspace/golden"

const directory = await checkout("date-fns/date-fns", "717ce0a…")
const { lines, drift } = compareCounts(counts, pinnedCounts)
```

Downloads go through `@workspace/github`, the way a run fetches a
repository, into `.cache/` beside this file, which git ignores. With
`{ archive }`, `checkout` unpacks GitHub's archive of the commit from a
file instead, with no network, as `@workspace/evals` does (spec 011).

## Status

Internal and dev-only: other packages list it under `devDependencies`, and
nothing the app runs imports it.

## Docs

The golden data it checks: [spec 001](../../docs/specs/001-repository-parser/spec.md#golden-data),
[spec 002](../../docs/specs/002-framework-detection/spec.md#golden-data).
