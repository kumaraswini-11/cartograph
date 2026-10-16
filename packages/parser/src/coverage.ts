import { compareText } from "./paths.ts"
import type { Coverage, ImportRecord, UnresolvedReason } from "./result.ts"

type CountedImport = Pick<
  ImportRecord,
  "from" | "line" | "specifier" | "resolution" | "reason"
>

type ImportCoverage = Pick<
  Coverage,
  "imports" | "unresolvedByReason" | "figure"
>

/**
 * Every import by resolution, each unresolved reason with its count and up
 * to `maxExamples` examples, and the coverage figure (FR-019, FR-020).
 * External and excluded imports are outside the figure.
 */
export function measureCoverage(
  imports: ReadonlyArray<CountedImport>,
  maxExamples: number
): ImportCoverage {
  const counts = { resolved: 0, external: 0, excluded: 0, unresolved: 0 }
  const byReason = new Map<
    UnresolvedReason,
    ImportCoverage["unresolvedByReason"][number]
  >()

  for (const i of imports) {
    counts[i.resolution] += 1
    if (i.resolution !== "unresolved" || i.reason === undefined) continue
    let group = byReason.get(i.reason)
    if (!group)
      byReason.set(
        i.reason,
        (group = { reason: i.reason, count: 0, examples: [] })
      )
    group.count += 1
    if (group.examples.length < maxExamples) {
      group.examples.push({
        file: i.from,
        line: i.line,
        specifier: i.specifier,
      })
    }
  }

  const measured = counts.resolved + counts.unresolved
  return {
    imports: counts,
    unresolvedByReason: [...byReason.values()].sort((a, b) =>
      compareText(a.reason, b.reason)
    ),
    figure: measured === 0 ? null : counts.resolved / measured,
  }
}
