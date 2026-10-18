import { describe, expect, it } from "vitest"

import { committedCases, freshCases } from "./cases.ts"
import { EXPLANATION_FACTS_MAX, QUESTION_FACTS_MAX } from "./facts.ts"

describe("the case set (spec 011, FR-001, FR-002)", () => {
  // AC-06: every recorded fact follows from the pinned analysis's edges.
  it("is exactly what the rules derive from the pinned archives", async () => {
    expect(committedCases()).toEqual(await freshCases())
  }, 120_000)

  it("holds the spec's cases: 6 files, 2 boxes and 20 questions", () => {
    const cases = committedCases()
    const count = (kind: string) => cases.filter((c) => c.kind === kind).length
    expect([count("file"), count("box"), count("question")]).toEqual([6, 2, 20])
  })

  it("asks no case for more facts than its output can hold", () => {
    for (const c of committedCases()) {
      const max =
        c.kind === "question" ? QUESTION_FACTS_MAX : EXPLANATION_FACTS_MAX
      expect(c.facts.length, c.id).toBeLessThanOrEqual(max)
      if (c.rule !== "declined") expect(c.facts.length, c.id).toBeGreaterThan(0)
    }
  })
})
