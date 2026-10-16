import { describe, expect, it } from "vitest"
import { edgeIndex } from "@workspace/graph"

import { SAMPLE_MAP } from "./map.gen"

describe("the sample map (spec 004)", () => {
  it("gives each file a fan-in and fan-out equal to its lists (AC-03, C-02)", () => {
    const index = edgeIndex(SAMPLE_MAP.edges)
    for (const file of SAMPLE_MAP.files) {
      expect(index.dependents.get(file.path)?.length ?? 0, file.path).toBe(
        file.fanIn
      )
      expect(index.dependencies.get(file.path)?.length ?? 0, file.path).toBe(
        file.fanOut
      )
    }
  })

  it("carries the summary's frameworks and counts (FR-001)", () => {
    expect(SAMPLE_MAP.frameworks).toEqual(["Next.js"])
    expect(SAMPLE_MAP.imports.resolved).toBeLessThanOrEqual(
      SAMPLE_MAP.imports.seen
    )
    expect(SAMPLE_MAP.routes).toBeGreaterThan(0)
  })
})
