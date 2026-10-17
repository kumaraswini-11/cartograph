import { describe, expect, it } from "vitest"

import type { StageChange } from "@workspace/database"

import { afterRead, withChange } from "./progress"

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
