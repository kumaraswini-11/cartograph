// `pnpm --filter @workspace/parser golden`: downloads each golden repository
// at its pinned commit, parses it, and prints its counts beside the ones
// pinned in the spec's golden data (spec 001, T07). Exits 1 on any drift.
// The network belongs to this script, never to the parser (C-01).
import { compareCounts, runGolden, timed } from "@workspace/golden"
import type { Counts } from "@workspace/golden"

import { percent, unresolvedLines } from "../src/command.ts"
import { isTooLarge, parseRepository } from "../src/index.ts"
import type { ParsedRepository } from "../src/index.ts"

type Golden = {
  repository: string
  commit: string
  /** The spec's golden data, pinned by the first run that passed the hand checks. */
  pinned: Counts | undefined
}

const GOLDEN: ReadonlyArray<Golden> = [
  {
    repository: "date-fns/date-fns",
    commit: "717ce0a807ea4c6b540d015b5c408723175b2838",
    pinned: {
      "files found": 1785,
      "files parsed": 1785,
      "files skipped": 0,
      "excluded paths": 1,
      imports: 5827,
      "imports resolved": 5344,
      "imports external": 458,
      "imports excluded": 2,
      "imports unresolved": 23,
      "re-exports": 757,
      "re-exports resolved": 757,
      "require() calls": 27,
      "require() resolved": 9,
      edges: 5333,
      coverage: "99.6%",
    },
  },
  {
    repository: "expressjs/express",
    commit: "a419aa7350389a275ab45fde2e849ed1f02449ef",
    pinned: {
      "files found": 141,
      "files parsed": 141,
      "files skipped": 0,
      "excluded paths": 0,
      imports: 403,
      "imports resolved": 159,
      "imports external": 241,
      "imports excluded": 0,
      "imports unresolved": 3,
      "re-exports": 0,
      "re-exports resolved": 0,
      "require() calls": 403,
      "require() resolved": 159,
      edges: 153,
      coverage: "98.1%",
    },
  },
]

function countsOf(result: ParsedRepository): Counts {
  const { coverage, imports } = result
  const of = (kind: string) => imports.filter((i) => i.kind === kind)
  const resolved = (list: typeof imports) =>
    list.filter((i) => i.resolution === "resolved").length
  return {
    "files found": coverage.filesFound,
    "files parsed": coverage.filesParsed,
    "files skipped": coverage.filesSkipped,
    "excluded paths": result.excluded.length,
    imports: imports.length,
    "imports resolved": coverage.imports.resolved,
    "imports external": coverage.imports.external,
    "imports excluded": coverage.imports.excluded,
    "imports unresolved": coverage.imports.unresolved,
    "re-exports": of("re-export").length,
    "re-exports resolved": resolved(of("re-export")),
    "require() calls": of("require").length,
    "require() resolved": resolved(of("require")),
    edges: result.edges.length,
    coverage: coverage.figure === null ? "none" : percent(coverage.figure),
  }
}

await runGolden(GOLDEN, "parsed", (golden, directory) => {
  const [result, seconds] = timed(() => parseRepository(directory))
  if (isTooLarge(result)) throw new Error(`${golden.repository} is too large`)
  const compared = compareCounts(countsOf(result), golden.pinned)
  return {
    seconds,
    lines: [
      ...compared.lines,
      ...unresolvedLines(
        result.coverage.unresolvedByReason,
        "  ",
        "unresolved, "
      ),
    ],
    drift: compared.drift,
  }
})
