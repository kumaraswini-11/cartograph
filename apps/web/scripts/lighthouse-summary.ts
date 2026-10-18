// `pnpm --filter web lighthouse-summary <report.json…>`: each Lighthouse
// report's headline numbers, then the median of the runs (spec 012, AC-13).
// A single run varies widely on a busy machine, so a page is run several
// times and the median compared (README: "Checking in a real browser").
import { readFileSync } from "node:fs"

type Audit = { numericValue?: number; details?: { items?: Array<unknown> } }
type Report = {
  finalDisplayedUrl: string
  runtimeError?: { message: string }
  categories: Record<string, { score: number | null } | undefined>
  audits: Record<string, Audit | undefined>
}

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error("Usage: lighthouse-summary <report.json…>")
  process.exit(1)
}

const number = (report: Report, audit: string) =>
  report.audits[audit]?.numericValue ?? Number.NaN

const rows = files.map((file) => {
  const report = JSON.parse(readFileSync(file, "utf8")) as Report
  return {
    file,
    failed: report.runtimeError !== undefined,
    performance: Math.round((report.categories.performance?.score ?? 0) * 100),
    lcp: Math.round(number(report, "largest-contentful-paint")),
    tbt: Math.round(number(report, "total-blocking-time")),
    cls: Number(number(report, "cumulative-layout-shift").toFixed(3)),
    smallTargets: report.audits["target-size"]?.details?.items?.length ?? 0,
  }
})

for (const row of rows) {
  console.log(
    `${row.failed ? "FAILED " : ""}${row.file}: performance ${row.performance}, LCP ${row.lcp} ms, TBT ${row.tbt} ms, CLS ${row.cls}, small targets ${row.smallTargets}`
  )
}

/** The middle value of the runs that finished. */
const median = (values: Array<number>) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN
}
const finished = rows.filter((row) => !row.failed)
console.log(
  `median of ${finished.length} finished runs: LCP ${median(finished.map((r) => r.lcp))} ms, TBT ${median(finished.map((r) => r.tbt))} ms, CLS ${median(finished.map((r) => r.cls))}`
)
