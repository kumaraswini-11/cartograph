import { describe, expect, it } from "vitest"

import { buildBoxes } from "./boxes.ts"
import { mostDependedOn, rolesIn, startingPoints } from "./summary.ts"
import { file } from "./testing.ts"

const counted = (
  path: string,
  counts: { fanIn?: number; fanOut?: number; entryPoint?: boolean }
) => ({ ...file(path), ...counts })

describe("the summary's lists (spec 004)", () => {
  it("lists files with dependents, the most first, ties by path (FR-002)", () => {
    const files = [
      counted("lib/b.ts", { fanIn: 3 }),
      counted("lib/a.ts", { fanIn: 3 }),
      counted("lib/c.ts", { fanIn: 7 }),
      counted("app/page.tsx", { fanIn: 0 }),
    ]
    expect(mostDependedOn(files).map((f) => f.path)).toEqual([
      "lib/c.ts",
      "lib/a.ts",
      "lib/b.ts",
    ])
  })

  it("lists files no file imports: entry points, then those importing the most (FR-003)", () => {
    const files = [
      counted("scripts/seed.ts", { fanOut: 9 }),
      counted("app/page.tsx", { fanOut: 2, entryPoint: true }),
      counted("app/layout.tsx", { fanOut: 4, entryPoint: true }),
      counted("lib/unused.ts", { fanOut: 1 }),
      counted("lib/used.ts", { fanIn: 1 }),
    ]
    expect(startingPoints(files).map((f) => f.path)).toEqual([
      "app/layout.tsx",
      "app/page.tsx",
      "scripts/seed.ts",
      "lib/unused.ts",
    ])
  })

  it("counts the roles inside a box, in the taxonomy's order (FR-010)", () => {
    const files = [
      file("app/page.tsx", "Page routes"),
      file("app/layout.tsx", "Layouts"),
      file("app/about/page.tsx", "Page routes"),
    ]
    const taxonomy = [
      { role: "Layouts", tier: "surface" as const, files: 1 },
      { role: "Page routes", tier: "surface" as const, files: 2 },
      { role: "Utilities", tier: "plumbing" as const, files: 0 },
    ]
    const [box] = buildBoxes(files, []).boxes
    expect(box && rolesIn(box, files, taxonomy)).toEqual([
      { role: "Layouts", files: 1 },
      { role: "Page routes", files: 2 },
    ])
  })
})
