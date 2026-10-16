import { describe, expect, it } from "vitest"

import { countOf, matchCount, panelCounts } from "./boxes.ts"
import { isBoxStrong, isRowStrong } from "./selection.ts"
import type { FullStrength } from "./selection.ts"

const strength = (kept: Array<string>): FullStrength => ({
  kept: new Set(kept),
  into: new Set(),
  outOf: new Set(),
})

describe("full strength (FR-013, FR-016)", () => {
  it("keeps every box with nothing selected and no role chosen", () => {
    expect(isBoxStrong("lib", null, null)).toBe(true)
  })

  it("keeps a box the selection keeps, holding a file of the chosen role", () => {
    const kept = strength(["lib"])
    expect(isBoxStrong("lib", kept, null)).toBe(true)
    expect(isBoxStrong("app", kept, null)).toBe(false)
    expect(isBoxStrong("lib", kept, new Map([["lib", 2]]))).toBe(true)
    expect(isBoxStrong("lib", kept, new Map([["lib", 0]]))).toBe(false)
  })

  it("keeps a row the selection keeps, or every row of a selected box", () => {
    const row = { box: "lib", file: "lib/a.ts", role: "Utilities" }
    expect(
      isRowStrong(row, strength(["lib", "lib\0lib/a.ts"]), null, null)
    ).toBe(true)
    expect(isRowStrong(row, strength(["lib"]), null, null)).toBe(false)
    expect(isRowStrong(row, strength(["lib"]), { box: "lib" }, null)).toBe(true)
  })

  it("dims a row outside the chosen role", () => {
    const row = { box: "lib", file: "lib/a.ts", role: "Utilities" }
    expect(isRowStrong(row, null, null, "Utilities")).toBe(true)
    expect(isRowStrong(row, null, null, "Hooks")).toBe(false)
  })
})

describe("a panel's counts", () => {
  it("names one file, and more files, in English", () => {
    expect(countOf(1, "file", "files")).toBe("1 file")
    expect(countOf(2, "file", "files")).toBe("2 files")
    expect(countOf(0, "file", "files")).toBe("0 files")
  })

  it("lists files, then in and out, as the header shows them", () => {
    expect(panelCounts({ files: ["a.ts"], fanIn: 3, fanOut: 0 })).toEqual([
      "1 file",
      "in 3",
      "out 0",
    ])
    expect(matchCount(2)).toBe("2 matching")
  })
})
