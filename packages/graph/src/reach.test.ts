import { describe, expect, it } from "vitest"

import { REACH_OPEN_LEVELS } from "./limits.ts"
import { edgeIndex, walk } from "./reach.ts"
import { edge } from "./testing.ts"
import type { MapEdge } from "./input.ts"

/** Every file reachable from `start`, found without levels, to check against. */
function closure(edges: ReadonlyArray<MapEdge>, start: string): Set<string> {
  const reached = new Set<string>()
  let grew = true
  while (grew) {
    grew = false
    for (const { from, to } of edges) {
      if ((from === start || reached.has(from)) && !reached.has(to)) {
        reached.add(to)
        grew = true
      }
    }
  }
  reached.delete(start)
  return reached
}

describe("walk (spec 004)", () => {
  it("lists each file of a cycle once, and never the start (AC-06)", () => {
    const edges = [
      edge("a.ts", "b.ts"),
      edge("b.ts", "c.ts"),
      edge("c.ts", "a.ts"),
      edge("c.ts", "d.ts"),
    ]
    expect(walk(edgeIndex(edges), "a.ts", "dependencies")).toEqual([
      ["b.ts"],
      ["c.ts"],
      ["d.ts"],
    ])
  })

  it("lists a file at the first level it's reached (FR-018)", () => {
    const edges = [
      edge("a.ts", "b.ts"),
      edge("b.ts", "d.ts"),
      edge("a.ts", "d.ts"),
      edge("d.ts", "e.ts"),
    ]
    expect(walk(edgeIndex(edges), "a.ts", "dependencies")).toEqual([
      ["b.ts", "d.ts"],
      ["e.ts"],
    ])
  })

  it("finds a blast radius equal to the dependency chain on reversed edges (AC-10)", () => {
    const edges = [
      edge("app/page.tsx", "lib/a.ts"),
      edge("app/layout.tsx", "lib/a.ts"),
      edge("lib/a.ts", "lib/b.ts"),
      edge("lib/b.ts", "util/c.ts"),
      edge("util/c.ts", "lib/a.ts"),
      edge("app/page.tsx", "util/c.ts"),
    ]
    const reversed = edges.map((e) => ({ ...e, from: e.to, to: e.from }))
    const files = [...new Set(edges.flatMap((e) => [e.from, e.to]))]
    for (const file of files) {
      expect(walk(edgeIndex(reversed), file, "dependents")).toEqual(
        walk(edgeIndex(edges), file, "dependencies")
      )
    }
  })

  it("follows every level past REACH_OPEN_LEVELS, the levels adding up to the total (AC-11)", () => {
    // A chain of dependents twice as deep as the levels the pane opens.
    const depth = REACH_OPEN_LEVELS * 2
    const edges = Array.from({ length: depth }, (_, i) =>
      edge(`f${i + 1}.ts`, `f${i}.ts`)
    )
    const levels = walk(edgeIndex(edges), "f0.ts", "dependents")
    expect(levels).toHaveLength(depth)
    const reversed = edges.map((e) => ({ ...e, from: e.to, to: e.from }))
    expect(levels.flat()).toHaveLength(closure(reversed, "f0.ts").size)
  })

  it("follows type-only edges (AC-12, C-05)", () => {
    const edges = [{ ...edge("app/page.tsx", "types/user.ts"), typeOnly: true }]
    expect(walk(edgeIndex(edges), "types/user.ts", "dependents")).toEqual([
      ["app/page.tsx"],
    ])
  })

  it("stops at a depth when given one", () => {
    const edges = [edge("a.ts", "b.ts"), edge("b.ts", "c.ts")]
    expect(walk(edgeIndex(edges), "a.ts", "dependencies", 1)).toEqual([
      ["b.ts"],
    ])
  })

  it("finds nothing for a file nothing depends on", () => {
    const edges = [edge("a.ts", "b.ts")]
    expect(walk(edgeIndex(edges), "a.ts", "dependents")).toEqual([])
  })
})
