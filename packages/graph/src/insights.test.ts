import { describe, expect, it } from "vitest"

import { cycles, insights, sentenceOf, sentenceText } from "./insights.ts"
import { HEAVY_FAN_IN, OVERSIZED_LINES } from "./limits.ts"
import { edge, file } from "./testing.ts"
import type { MapFile } from "./input.ts"

const counted = (path: string, counts: Partial<MapFile>): MapFile => ({
  ...file(path, "Utilities"),
  ...counts,
})
const kinds = (files: Array<MapFile>, edges = [edge("x.ts", "y.ts")]) =>
  insights({ files, edges })

describe("unimported files (FR-002, C-02)", () => {
  it("lists a file nothing imports, with a role, that isn't an entry point (AC-01)", () => {
    expect(kinds([counted("lib/unused.ts", { fanIn: 0 })])).toEqual([
      { kind: "unimported", file: "lib/unused.ts" },
    ])
  })

  it("leaves out a page nothing imports, and a file with no role (AC-02)", () => {
    const page = counted("app/page.tsx", { fanIn: 0, entryPoint: true })
    const unknown = { ...file("test/auth.js"), fanIn: 0 }
    expect(kinds([page, unknown])).toEqual([])
  })
})

describe("thresholds (FR-003, FR-004, AC-09)", () => {
  it("lists only files at the threshold, not one below", () => {
    const found = kinds([
      counted("a.ts", { fanIn: HEAVY_FAN_IN - 1 }),
      counted("b.ts", { fanIn: HEAVY_FAN_IN }),
      counted("c.ts", { fanIn: 1, lines: OVERSIZED_LINES - 1 }),
      counted("d.ts", { fanIn: 1, lines: OVERSIZED_LINES }),
    ])
    expect(found).toEqual([
      { kind: "heavily imported", file: "b.ts", fanIn: HEAVY_FAN_IN },
      { kind: "oversized", file: "d.ts", lines: OVERSIZED_LINES },
    ])
  })

  it("lists a file oversized and heavily imported under both kinds", () => {
    const both = counted("big.ts", {
      fanIn: HEAVY_FAN_IN,
      lines: OVERSIZED_LINES,
    })
    expect(kinds([both]).map((i) => i.kind)).toEqual([
      "heavily imported",
      "oversized",
    ])
  })
})

describe("cycles (FR-005, C-03)", () => {
  it("lists each cycle once, from its first-sorting file", () => {
    const edges = [
      edge("c.ts", "a.ts"),
      edge("a.ts", "b.ts"),
      edge("b.ts", "c.ts"),
      edge("x.ts", "y.ts"),
    ]
    expect(cycles(edges)).toEqual([["a.ts", "b.ts", "c.ts"]])
  })

  it("names shortest cycles: a's first, then one through b, not yet named", () => {
    const edges = [
      edge("a.ts", "b.ts"),
      edge("b.ts", "c.ts"),
      edge("c.ts", "a.ts"),
      edge("a.ts", "c.ts"),
    ]
    // a's shortest is a → c → a; b is on none of it, so b → c → a → b
    // follows, listed from a.
    expect(cycles(edges)).toEqual([
      ["a.ts", "b.ts", "c.ts"],
      ["a.ts", "c.ts"],
    ])
  })

  it("names every file of a group on some cycle, each cycle once", () => {
    // Two cycles share article: one with comment, one with user.
    const edges = [
      edge("article.ts", "comment.ts"),
      edge("article.ts", "user.ts"),
      edge("comment.ts", "article.ts"),
      edge("user.ts", "article.ts"),
    ]
    expect(cycles(edges)).toEqual([
      ["article.ts", "comment.ts"],
      ["article.ts", "user.ts"],
    ])
  })

  it("lists a cycle from its first-sorting file, whichever file found it", () => {
    // b's shortest cycle, b → c → b, starts from... b, its first file.
    // a's, a → b → a, is found first; c is then on no cycle named yet.
    const edges = [
      edge("a.ts", "b.ts"),
      edge("b.ts", "a.ts"),
      edge("b.ts", "c.ts"),
      edge("c.ts", "b.ts"),
    ]
    expect(cycles(edges)).toEqual([
      ["a.ts", "b.ts"],
      ["b.ts", "c.ts"],
    ])
  })

  it("finds a file importing itself, and each separate group, in order", () => {
    const edges = [
      edge("z.ts", "z.ts"),
      edge("m.ts", "n.ts"),
      edge("n.ts", "m.ts"),
    ]
    expect(cycles(edges)).toEqual([["m.ts", "n.ts"], ["z.ts"]])
  })

  it("leaves out a cycle only type-only edges close", () => {
    const edges = [
      edge("a.ts", "b.ts"),
      { ...edge("b.ts", "a.ts"), typeOnly: true },
    ]
    expect(cycles(edges)).toEqual([])
  })

  it("completes on a chain far deeper than a call stack (AC-04)", () => {
    const depth = 100_000
    const name = (i: number) => `f${String(i).padStart(6, "0")}.ts`
    const edges = Array.from({ length: depth }, (_, i) =>
      edge(name(i), name(i + 1))
    )
    edges.push(edge(name(depth), name(depth - 2)))
    expect(cycles(edges)).toEqual([
      [name(depth - 2), name(depth - 1), name(depth)],
    ])
  })
})

describe("the insights' order and sentences", () => {
  const all = kinds(
    [
      counted("lib/big.ts", { fanIn: 1, lines: 812 }),
      counted("lib/utils.ts", { fanIn: 66 }),
      counted("components/ui/badge.tsx", { fanIn: 0 }),
    ],
    [edge("a.ts", "b.ts"), edge("b.ts", "a.ts")]
  )

  it("lists unimported, heavily imported, cycles, then oversized (AC-10)", () => {
    expect(all.map((i) => i.kind)).toEqual([
      "unimported",
      "heavily imported",
      "cycle",
      "oversized",
    ])
  })

  it("states each in its fixed sentence, word for word (AC-08, FR-006)", () => {
    expect(all.map((i) => sentenceText(sentenceOf(i)))).toEqual([
      "No file imports components/ui/badge.tsx, and it isn't an entry point.",
      "66 files import lib/utils.ts.",
      "A cycle of 2 files: a.ts → b.ts → a.ts.",
      "lib/big.ts has 812 lines.",
    ])
    expect(sentenceText(sentenceOf({ kind: "cycle", files: ["a.ts"] }))).toBe(
      "A cycle of 1 file: a.ts → a.ts."
    )
  })

  it("names every file in a sentence as a part someone can choose (FR-009)", () => {
    const parts = sentenceOf({ kind: "cycle", files: ["a.ts", "b.ts"] })
    expect(parts.filter((p) => typeof p !== "string")).toEqual([
      { file: "a.ts" },
      { file: "b.ts" },
      { file: "a.ts" },
    ])
  })
})
