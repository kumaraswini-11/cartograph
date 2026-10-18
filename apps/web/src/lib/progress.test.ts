import { describe, expect, it } from "vitest"

import type { RunDetail, StageChange } from "@workspace/database"

import { afterRead, sameRun, withChange } from "./progress"

const change = (analysisId: string, stage: StageChange["stage"]) => ({
  analysisId,
  stage,
  message: stage,
})

describe("pushed changes against storage's answer (spec 008, plan D-11)", () => {
  it("drops what was held when the read began", () => {
    const done = change("a", "done")
    const held = new Map([["a", done]])
    expect(afterRead(held, held).size).toBe(0)
  })

  it("keeps what was pushed while the read was out", () => {
    const parsing = change("a", "parsing")
    const storing = change("a", "storing")
    const fetching = change("b", "fetching")
    const before = new Map([["a", parsing]])
    const now = new Map([
      ["a", storing],
      ["b", fetching],
    ])
    expect(afterRead(before, now)).toEqual(now)
  })

  it("lays a push over the run storage gave, as current and not stale", () => {
    const run = { state: "parsing" as const, stale: true, message: "Parsing" }
    expect(withChange(run, change("a", "storing"))).toEqual({
      state: "storing",
      stale: false,
      message: "storing",
    })
    expect(withChange(run, undefined)).toBe(run)
  })
})

const run = (overrides: Partial<RunDetail> = {}): RunDetail => ({
  id: "r1",
  state: "done",
  stale: false,
  message: "Done",
  failedStage: null,
  commit: "c".repeat(40),
  startedAt: "2026-10-18T10:00:00Z",
  finishedAt: "2026-10-18T10:01:00Z",
  ...overrides,
})

// Plan D-11: on joining, the page is read again only if the run moved.
describe("whether the page still shows storage's run (spec 008, plan D-11)", () => {
  it("is the same run when nothing it shows has changed", () => {
    expect(sameRun(run(), run({ message: "Done." }))).toBe(true)
    expect(sameRun(null, null)).toBe(true)
  })

  it("isn't when the run moved, finished, went stale, or a new one began", () => {
    expect(sameRun(run({ state: "parsing", finishedAt: null }), run())).toBe(
      false
    )
    expect(sameRun(run(), run({ id: "r2" }))).toBe(false)
    expect(sameRun(run({ stale: true }), run())).toBe(false)
    expect(sameRun(null, run())).toBe(false)
  })
})
