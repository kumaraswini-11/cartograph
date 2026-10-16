import { afterEach, describe, expect, it } from "vitest"

import { extractImports } from "./extract.ts"
import type { ExtractedImport } from "./extract.ts"
import { parseRepository } from "./parse.ts"
import { isTooLarge } from "./result.ts"
import { makeRepository } from "./testing.ts"
import type { Repository } from "./testing.ts"

function importsOf(path: string, source: string): Array<ExtractedImport> {
  const extraction = extractImports(path, source)
  if ("error" in extraction) throw new Error(extraction.error)
  return extraction.imports
}

const summary = (imports: Array<ExtractedImport>) =>
  imports.map((i) => [i.specifier, i.kind, i.typeOnly])

describe("kinds of import (FR-009)", () => {
  it("reads static imports, re-exports, dynamic imports and require()", () => {
    const source = [
      'import a from "./a"',
      'import "./side"',
      'export { b } from "./b"',
      'export * from "./all"',
      'export * as ns from "./ns"',
      'const c = import("./c")',
      "const t = import(`./template`)",
      'const d = require("./d")',
      'import e = require("./e")',
    ].join("\n")
    expect(summary(importsOf("a.ts", source))).toEqual([
      ["./a", "static", false],
      ["./side", "static", false],
      ["./b", "re-export", false],
      ["./all", "re-export", false],
      ["./ns", "re-export", false],
      ["./c", "dynamic", false],
      ["./template", "dynamic", false],
      ["./d", "require", false],
      ["./e", "require", false],
    ])
  })

  it("never records an export with no source", () => {
    expect(importsOf("a.ts", "const a = 1\nexport { a }")).toEqual([])
  })

  it("records the line each import is on", () => {
    const imports = importsOf("a.ts", 'const é = "ü"\n\nimport x from "./x"')
    expect(imports.map((i) => i.line)).toEqual([3])
  })
})

describe("type-only imports (FR-010)", () => {
  it("marks declarations and all-type specifier lists as type-only", () => {
    const source = [
      'import type { T } from "./t"',
      'import { type U, type V } from "./u"',
      'import { type W, x } from "./w"',
      'export type { Z } from "./z"',
      'type Q = typeof import("./q")',
    ].join("\n")
    expect(summary(importsOf("a.ts", source))).toEqual([
      ["./t", "static", true],
      ["./u", "static", true],
      ["./w", "static", false],
      ["./z", "re-export", true],
      ["./q", "static", true],
    ])
  })
})

describe("a real parser (FR-008, AC-12)", () => {
  it("records nothing written inside a string or a comment", () => {
    const source = [
      'const s = "import a from \\"./not-an-import\\""',
      '// import b from "./also-not"',
      '/* require("./nor-this") */',
      "const t = `require('./or-this')`",
    ].join("\n")
    expect(importsOf("a.ts", source)).toEqual([])
  })

  it("parses JSX in a .js file", () => {
    const source = 'import React from "react"\nexport const A = () => <div />'
    expect(summary(importsOf("a.js", source))).toEqual([
      ["react", "static", false],
    ])
  })
})

describe("non-literal imports (FR-014, AC-15)", () => {
  it("marks import(name) and require(name) as not literal", () => {
    const imports = importsOf(
      "a.js",
      'const x = import(name)\nconst y = require(base + "/y")\nconst z = import(`./${n}`)'
    )
    expect(imports.map((i) => [i.kind, i.literal, i.specifier])).toEqual([
      ["dynamic", false, ""],
      ["require", false, ""],
      ["dynamic", false, ""],
    ])
  })
})

describe("parse errors (FR-004, AC-11)", () => {
  let repository: Repository | undefined
  afterEach(() => repository?.remove())

  it("skips a file that doesn't parse, with the error as the reason", () => {
    repository = makeRepository({
      "good.ts": 'import "./bad"',
      "bad.ts": "const = ;",
    })
    const result = parseRepository(repository.directory)
    if (isTooLarge(result)) throw new Error("unexpectedly too large")
    expect(result.files.map((f) => f.path)).toEqual(["good.ts"])
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0]?.path).toBe("bad.ts")
    expect(result.skipped[0]?.reason).toMatch(/^parse error: /)
    expect(result.imports.map((i) => [i.from, i.specifier])).toEqual([
      ["good.ts", "./bad"],
    ])
  })
})
