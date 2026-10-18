import { describe, expect, it } from "vitest"

import { pathIndex } from "@workspace/ai/grounding"

import { coverage, grounded, lookupUse, scoreCase } from "./score.ts"

const index = pathIndex([
  "lib/a.ts",
  "lib/b.ts",
  "lib/c.ts",
  "lib/d.ts",
  "src/index.ts",
])
const facts = ["lib/a.ts", "lib/b.ts", "lib/c.ts", "lib/d.ts"]

describe("the scores (spec 011, C-01)", () => {
  // AC-02, FR-003: a file absent from the analysis counts against it.
  it("doesn't count an output naming an absent file as grounded", () => {
    expect(grounded("It uses `lib/a.ts`.", index)).toBe(1)
    expect(grounded("It uses `lib/a.ts` and `lib/ghost.ts`.", index)).toBe(0)
  })

  // AC-07, FR-004: three of four facts is 75%.
  it("scores coverage as the share of facts named", () => {
    expect(
      coverage("`lib/a.ts`, `lib/b.ts` and `lib/c.ts` change.", facts, index)
    ).toBe(0.75)
    expect(coverage("Nothing named.", facts, index)).toBe(0)
  })

  // AC-08, FR-005: a fact claimed that no shown lookup returned.
  it("fails lookup use when the answer names a file no lookup returned", () => {
    const shown = new Set(["lib/a.ts", "lib/b.ts"])
    expect(lookupUse("`lib/a.ts` imports `lib/b.ts`.", shown, index)).toBe(1)
    expect(lookupUse("`lib/a.ts` imports `lib/c.ts`.", shown, index)).toBe(0)
  })

  // The spec's edge case: nothing returned scores zero, not skipped.
  it("scores an empty output zero on every score", () => {
    expect(
      scoreCase({ kind: "explanation", text: null }, facts, false, index)
    ).toEqual({ grounded: 0, coverage: 0 })
    expect(
      scoreCase(
        { kind: "answer", text: "  ", declined: false, shown: new Set() },
        facts,
        false,
        index
      )
    ).toEqual({ grounded: 0, coverage: 0, lookupUse: 0 })
  })

  it("scores a question that should be declined in full only if it was", () => {
    const declined = {
      kind: "answer" as const,
      text: null,
      declined: true,
      shown: new Set<string>(),
    }
    expect(scoreCase(declined, [], true, index)).toEqual({
      grounded: 1,
      coverage: 1,
      lookupUse: 1,
    })
    expect(
      scoreCase(
        { ...declined, declined: false, text: "A poem." },
        [],
        true,
        index
      )
    ).toEqual({ grounded: 0, coverage: 0, lookupUse: 0 })
  })

  it("scores an answered question on all three", () => {
    expect(
      scoreCase(
        {
          kind: "answer",
          text: "`lib/a.ts` and `lib/b.ts` break.",
          declined: false,
          shown: new Set(["lib/a.ts", "lib/b.ts"]),
        },
        ["lib/a.ts", "lib/b.ts"],
        false,
        index
      )
    ).toEqual({ grounded: 1, coverage: 1, lookupUse: 1 })
  })
})
