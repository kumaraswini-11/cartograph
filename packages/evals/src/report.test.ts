import { describe, expect, it } from "vitest"

import { comparisonLines, failures, recordOf, scoreLines } from "./report.ts"
import type { RunRecord } from "./report.ts"
import type { CaseResult } from "./run.ts"

const versions = {
  explainModel: "gemini-3.6-flash",
  explainPrompt: 1,
  chatModel: "gemini-3.5-flash-lite",
  chatPrompt: 1,
}

const result = (
  kind: CaseResult["kind"],
  grounded: number,
  coverage: number,
  lookupUse?: number
): CaseResult => ({
  id: `${kind}-${String(grounded)}-${String(coverage)}`,
  kind,
  rule: kind === "question" ? "blast_radius" : "neighbours",
  ended: "explained",
  scores: { grounded, coverage, ...(lookupUse !== undefined && { lookupUse }) },
  ms: 1,
})

const run = (results: Array<CaseResult>, at = "2026-10-18T10:00:00Z") =>
  recordOf(results, versions, at)

const good = run([
  result("file", 1, 1),
  result("box", 1, 0.5),
  result("question", 1, 1, 1),
  result("question", 1, 0.5, 1),
])

describe("the report (spec 011, FR-006)", () => {
  it("scores per kind and overall, lookup use for questions only", () => {
    expect(good.overall).toEqual({
      cases: 4,
      grounded: 1,
      coverage: 0.75,
      lookupUse: 1,
    })
    expect(good.byKind.file).toEqual({ cases: 1, grounded: 1, coverage: 1 })
    expect(good.byKind.question?.coverage).toBe(0.75)
    const lines = scoreLines(good)
    expect(lines[0]).toContain("gemini-3.6-flash, prompt 1")
    expect(lines.at(-1)).toContain("Fact coverage  75.0%")
  })
})

describe("the gate (spec 011, FR-009)", () => {
  it("passes a run that's grounded and no worse than the accepted one", () => {
    expect(failures(good, good)).toEqual([])
    expect(failures(good, null)).toEqual([])
  })

  it("fails a run below 100% groundedness, whatever came before", () => {
    const invented = run([result("file", 0, 1), ...good.results.slice(1)])
    expect(failures(invented, null)).toEqual([
      "Groundedness is 75.0%; it must be 100.0%.",
    ])
  })

  // AC-04: a change lowering a score by more than 2 points fails.
  it("fails a run whose overall score fell by more than 2 points", () => {
    const worse = run([
      result("file", 1, 1),
      result("box", 1, 0.4),
      result("question", 1, 1, 1),
      result("question", 1, 0.5, 1),
    ])
    expect(failures(worse, good)).toEqual([
      "Fact coverage fell from 75.0% to 72.5%, more than 2.0 points.",
    ])
  })

  it("lets a fall of exactly 2 points through", () => {
    const slightly: RunRecord = {
      ...good,
      overall: { ...good.overall, coverage: 0.73 },
    }
    expect(failures(slightly, good)).toEqual([])
  })
})

describe("comparing two runs (spec 011, FR-008, AC-05)", () => {
  it("shows each score's change and both runs' versions", () => {
    const later = recordOf(
      [result("file", 1, 1), result("question", 1, 1, 0.5)],
      { ...versions, chatPrompt: 2 },
      "2026-10-19T10:00:00Z"
    )
    const lines = comparisonLines(good, later)
    expect(lines[0]).toContain("2026-10-18T10:00:00Z")
    expect(lines[1]).toContain("gemini-3.5-flash-lite (prompt 2)")
    expect(lines).toContain("Fact coverage   75.0% → 100.0%  (+25.0 points)")
    expect(lines).toContain("Lookup use     100.0% →  50.0%  (-50.0 points)")
  })
})
