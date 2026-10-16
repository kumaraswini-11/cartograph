import { describe, expect, it } from "vitest"
import { edgeIndex } from "@workspace/graph"

import { readSampleMap } from "@/lib/sample.server"
import { SAMPLES } from "./samples"

describe.each(SAMPLES)("the $name sample (specs 004, 005)", ({ name }) => {
  it("gives each file a fan-in and fan-out equal to its lists (004 AC-03, C-02)", async () => {
    const map = await readSampleMap(name)
    const index = edgeIndex(map.edges)
    for (const file of map.files) {
      expect(index.dependents.get(file.path)?.length ?? 0, file.path).toBe(
        file.fanIn
      )
      expect(index.dependencies.get(file.path)?.length ?? 0, file.path).toBe(
        file.fanOut
      )
    }
  })

  it("carries the summary's counts (004 FR-001)", async () => {
    const map = await readSampleMap(name)
    expect(map.imports.resolved).toBeLessThanOrEqual(map.imports.seen)
  })
})

describe("the samples' frameworks and routes (005 D-02, D-07)", () => {
  it("has routes for Next.js and NestJS, and none recovered for Express", async () => {
    const [taxonomy, nest, express] = await Promise.all([
      readSampleMap("taxonomy"),
      readSampleMap("nestjs-realworld-example-app"),
      readSampleMap("node-express-boilerplate"),
    ])
    expect(taxonomy.frameworks).toEqual(["Next.js"])
    expect(taxonomy.routes.length).toBeGreaterThan(0)
    expect(nest.frameworks).toContain("NestJS")
    expect(nest.routes.length).toBeGreaterThan(0)
    expect(express.frameworks).toContain("Express")
    expect(express.routes).toEqual([])
    expect(express.routesNotRecovered).toEqual(["Express"])
  })
})
