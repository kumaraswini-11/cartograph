import { detectFrameworks } from "@workspace/frameworks"
import { isTooLarge, parseRepository } from "@workspace/parser"
import { makeRepository } from "@workspace/parser/testing"
import { afterAll, describe, expect, it } from "vitest"

import { toMapInput } from "./input.ts"
import { insights } from "./insights.ts"
import { fileDetails, findFiles, neighbours } from "./lookups.ts"
import { edgeIndex, walk } from "./reach.ts"
import { file } from "./testing.ts"

// A real analysis: parsed and detected, as a run stores it.
const repository = makeRepository({
  "package.json": JSON.stringify({ dependencies: { next: "1" } }),
  "app/page.tsx": 'import { b } from "../lib/b"',
  "app/about/page.tsx": 'import { b } from "../../lib/b"',
  "lib/b.ts": 'import { c } from "./c"\nexport const b = c',
  "lib/c.ts": "export const c = 1",
  "app/api/hello/route.ts": "export function GET() {}",
  "lib/unused.ts": "export const u = 1",
})
const parsed = parseRepository(repository.directory)
if (isTooLarge(parsed)) throw new Error("too large")
const input = toMapInput(
  { repository: "o/r", commit: "c" },
  parsed,
  detectFrameworks(repository.directory, parsed)
)
const index = edgeIndex(input.edges)
afterAll(() => repository.remove())

describe("the chat's lookups (spec 010, FR-002, AC-07)", () => {
  it("finds files by path or name, best match first, and nothing for no match", () => {
    expect(findFiles(input.files, "lib/b.ts")).toEqual(["lib/b.ts"])
    expect(findFiles(input.files, "./lib/b.ts")).toEqual(["lib/b.ts"])
    expect(findFiles(input.files, "PAGE.tsx")).toEqual([
      "app/about/page.tsx",
      "app/page.tsx",
    ])
    expect(findFiles(input.files, "lib")).toEqual([
      "lib/b.ts",
      "lib/c.ts",
      "lib/unused.ts",
    ])
    // The spec's edge case: no such file, so nothing is invented.
    expect(findFiles(input.files, "ghost")).toEqual([])
    expect(findFiles(input.files, "  ")).toEqual([])
  })

  it("ranks an exact name above a name that starts with it", () => {
    const files = [file("lib/app.tsx"), file("src/app.ts")]
    // Path order alone would put lib/app.tsx first.
    expect(findFiles(files, "app.ts")).toEqual(["src/app.ts", "lib/app.tsx"])
  })

  it("gives a file's details as the analysis has them", () => {
    expect(fileDetails(input.files, "lib/b.ts")).toMatchObject({
      path: "lib/b.ts",
      lines: 2,
      fanIn: 2,
      fanOut: 1,
    })
    expect(fileDetails(input.files, "lib/ghost.ts")).toBeNull()
  })

  it("gives a file's neighbours one edge away, from the stored edges", () => {
    expect(neighbours(index, "lib/b.ts")).toEqual({
      dependencies: ["lib/c.ts"],
      dependents: ["app/about/page.tsx", "app/page.tsx"],
    })
    expect(neighbours(index, "lib/ghost.ts")).toEqual({
      dependencies: [],
      dependents: [],
    })
  })

  it("reads the routes and insights the map has", () => {
    expect(input.routes.map((route) => [route.method, route.path])).toEqual([
      ["GET", "/api/hello"],
    ])
    // A file with a role that nothing imports; the route handler is an
    // entry point, so it isn't one (`005` FR-002).
    expect(insights(input)).toEqual([
      { kind: "unimported", file: "lib/unused.ts" },
    ])
  })

  // FR-003, C-01: the chat walks with the detail pane's walk, to every
  // level; it never stops early or adds a file.
  it("walks every level, as the detail pane does", () => {
    expect(walk(index, "lib/c.ts", "dependents")).toEqual([
      ["lib/b.ts"],
      ["app/about/page.tsx", "app/page.tsx"],
    ])
    expect(walk(index, "app/page.tsx", "dependencies")).toEqual([
      ["lib/b.ts"],
      ["lib/c.ts"],
    ])
  })
})
