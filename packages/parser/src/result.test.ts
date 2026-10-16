import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { ZodError } from "zod"

import { measureCoverage } from "./coverage.ts"
import { parseRepository } from "./parse.ts"
import { isTooLarge, readResult, writeResult } from "./result.ts"
import type { ParsedRepository } from "./result.ts"
import { makeRepository } from "./testing.ts"
import type { Repository } from "./testing.ts"

let repository: Repository | undefined
afterEach(() => repository?.remove())

function parsed(files: Record<string, string>): ParsedRepository {
  repository = makeRepository(files)
  const result = parseRepository(repository.directory)
  if (isTooLarge(result)) throw new Error("unexpectedly too large")
  return result
}

describe("edges (FR-015 to FR-017)", () => {
  it("keeps one edge per pair, and counts it once in fan-in and fan-out (AC-16)", () => {
    const result = parsed({
      "a.ts":
        'import { x } from "./b"\nimport { y } from "./b"\nconst z = require("./b")',
      "b.ts": "",
    })
    expect(result.edges).toEqual([
      {
        from: "a.ts",
        to: "b.ts",
        kinds: ["static", "require"],
        typeOnly: false,
      },
    ])
    expect(result.files.map((f) => [f.path, f.fanIn, f.fanOut])).toEqual([
      ["a.ts", 0, 1],
      ["b.ts", 1, 0],
    ])
  })

  it("marks an edge type-only only when every import behind it is (AC-13)", () => {
    const result = parsed({
      "a.ts":
        'import type { T } from "./types"\nimport type { U } from "./mixed"\nimport { v } from "./mixed"',
      "types.ts": "",
      "mixed.ts": "",
    })
    expect(result.edges.map((e) => [e.to, e.typeOnly])).toEqual([
      ["mixed.ts", false],
      ["types.ts", true],
    ])
  })

  it("draws no edge for an import that didn't resolve to a file", () => {
    const result = parsed({
      "a.ts": 'import "react"\nimport "./missing"\nimport "./styles.css"',
      "styles.css": "",
    })
    expect(result.edges).toEqual([])
  })
})

describe("coverage (FR-019, FR-020)", () => {
  it("adds every import into exactly one resolution (AC-14)", () => {
    const result = parsed({
      "a.ts":
        'import "./b"\nimport "react"\nimport "./x.css"\nimport "./missing"\nrequire(name)',
      "b.ts": "",
      "x.css": "",
    })
    const { imports, figure, unresolvedByReason } = result.coverage
    expect(imports).toEqual({
      resolved: 1,
      external: 1,
      excluded: 1,
      unresolved: 2,
    })
    expect(Object.values(imports).reduce((a, b) => a + b, 0)).toBe(
      result.imports.length
    )
    expect(figure).toBeCloseTo(1 / 3)
    expect(unresolvedByReason.map((g) => [g.reason, g.count])).toEqual([
      ["not a literal", 1],
      ["not found", 1],
    ])
  })

  it("keeps at most the example limit per reason, and the full count", () => {
    const imports = Array.from({ length: 5 }, (_, i) => ({
      from: "a.ts",
      line: i + 1,
      specifier: `./m${i}`,
      resolution: "unresolved" as const,
      reason: "not found" as const,
    }))
    const [group] = measureCoverage(imports, 3).unresolvedByReason
    expect(group?.count).toBe(5)
    expect(group?.examples.map((e) => e.specifier)).toEqual([
      "./m0",
      "./m1",
      "./m2",
    ])
  })

  it("gives no figure, not 100%, when there are no imports", () => {
    expect(parsed({}).coverage.figure).toBeNull()
  })
})

describe("the result (FR-021, FR-022)", () => {
  const files = {
    "src/a.ts": 'import { b } from "./b"\nimport "react"',
    "src/b.ts": 'export const b = 1\nimport type { T } from "./types"',
    "src/types.ts": "export type T = string",
  }

  it("reads back what it wrote, schema-checked (AC-05)", () => {
    const result = parsed(files)
    const out = join(repository?.directory ?? "", "result.json")
    writeResult(out, result)
    expect(readResult(out)).toEqual(result)
  })

  it("rejects a file that doesn't match the schema", () => {
    parsed(files)
    const out = join(repository?.directory ?? "", "bad.json")
    writeFileSync(out, JSON.stringify({ schemaVersion: 1, files: "nope" }))
    expect(() => readResult(out)).toThrow(ZodError)
  })

  it("writes byte-identical output for the same content (AC-06)", () => {
    const first = parsed(files)
    const firstOut = join(repository?.directory ?? "", "first.json")
    writeResult(firstOut, first)
    const firstBytes = readFileSync(firstOut)
    repository?.remove()

    const second = parsed(files)
    const secondOut = join(repository?.directory ?? "", "second.json")
    writeResult(secondOut, second)
    expect(readFileSync(secondOut).equals(firstBytes)).toBe(true)
  })
})
