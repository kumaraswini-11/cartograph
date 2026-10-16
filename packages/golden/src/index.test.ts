import { describe, expect, it } from "vitest"

import { compareCounts, compareList, timed } from "./index.ts"

describe("compareCounts", () => {
  it("marks each pinned count ok, or names the pinned value", () => {
    const { lines, drift } = compareCounts(
      { files: 3, edges: 5 },
      { files: 3, edges: 4 }
    )
    expect(drift).toBe(true)
    expect(lines[0]).toMatch(/files\s+3\s+ok$/)
    expect(lines[1]).toMatch(/edges\s+5\s+pinned 4$/)
  })

  it("is no drift when every count matches", () => {
    expect(compareCounts({ files: 3 }, { files: 3 }).drift).toBe(false)
  })

  it("counts a new or a missing count as drift once counts are pinned", () => {
    expect(compareCounts({ files: 3, routes: 1 }, { files: 3 }).drift).toBe(
      true
    )
    const missing = compareCounts({ files: 3 }, { files: 3, routes: 1 })
    expect(missing.drift).toBe(true)
    expect(missing.lines.at(-1)).toMatch(/routes\s+-\s+pinned 1$/)
  })

  it("only prints, with no marks or drift, when nothing is pinned yet", () => {
    const { lines, drift } = compareCounts({ files: 3 }, undefined)
    expect(drift).toBe(false)
    expect(lines[0]).toMatch(/files\s+3$/)
  })
})

describe("compareList", () => {
  it("marks items added with + and items missing with -", () => {
    const { lines, drift } = compareList(
      ["GET /a", "GET /c"],
      ["GET /a", "GET /b"]
    )
    expect(drift).toBe(true)
    expect(lines).toEqual(["    GET /a", "  + GET /c", "  - GET /b"])
  })

  it("is no drift for the same items", () => {
    expect(compareList(["GET /a"], ["GET /a"]).drift).toBe(false)
  })
})

describe("timed", () => {
  it("returns the step's value and a duration in seconds", () => {
    const [value, seconds] = timed(() => 42)
    expect(value).toBe(42)
    expect(seconds).toBeGreaterThanOrEqual(0)
  })
})
