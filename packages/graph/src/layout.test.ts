import { describe, expect, it } from "vitest"

import { buildBoxes } from "./boxes.ts"
import { PANEL_ROW_LIMIT } from "./limits.ts"
import { MORE, layoutMap } from "./layout.ts"
import { fullStrength, roleCounts } from "./selection.ts"
import { edge, file } from "./testing.ts"
import type { Layout } from "./layout.ts"

// Three boxes: app → lib → util, plus a panel-sized box with many files.
const files = [
  file("app/page.tsx", "Page routes"),
  file("app/layout.tsx", "Layouts"),
  file("lib/a.ts", "Utilities"),
  file("lib/b.ts", "Utilities"),
  ...Array.from({ length: PANEL_ROW_LIMIT + 2 }, (_, i) =>
    file(`util/m${String(i).padStart(2, "0")}.ts`, "Utilities")
  ),
]
const edges = [
  edge("app/page.tsx", "lib/a.ts"),
  edge("app/layout.tsx", "lib/a.ts"),
  edge("lib/a.ts", "lib/b.ts"),
  edge("lib/b.ts", "util/m00.ts"),
  edge("lib/b.ts", `util/m${PANEL_ROW_LIMIT + 1}.ts`),
]
const map = buildBoxes(files, edges)

/** Every edge end that exists in a layout: boxes, and rows of open panels. */
function ends(layout: Layout): Set<string> {
  const known = new Set<string>()
  for (const node of layout.boxes) {
    known.add(node.id)
    for (const row of node.rows) known.add(`${node.id}\0${row}`)
    if (node.more > 0) known.add(`${node.id}\0${MORE}`)
  }
  return known
}
const key = (e: { box: string; row?: string }) =>
  e.row === undefined ? e.box : `${e.box}\0${e.row}`

describe("layout (FR-009, FR-012)", () => {
  it.each([[[]], [["lib"]], [["util"]], [["app", "lib", "util"]]])(
    "ends every edge on a box or row that exists, with %j open (AC-03)",
    (open: Array<string>) => {
      const layout = layoutMap(map, edges, new Set(open))
      const known = ends(layout)
      for (const e of layout.edges) {
        expect(known.has(key(e.from))).toBe(true)
        expect(known.has(key(e.to))).toBe(true)
      }
    }
  )

  it("draws edges inside a box only once it's open", () => {
    const closed = layoutMap(map, edges)
    expect(closed.edges.map((e) => e.id)).not.toContain(
      "lib\0lib/a.ts→lib\0lib/b.ts"
    )
    const opened = layoutMap(map, edges, new Set(["lib"]))
    expect(opened.edges.map((e) => e.id)).toContain(
      "lib\0lib/a.ts→lib\0lib/b.ts"
    )
  })

  it("ends an edge to a file past the row limit on the panel's more row", () => {
    const layout = layoutMap(map, edges, new Set(["util"]))
    expect(layout.edges.map((e) => key(e.to))).toContain(`util\0${MORE}`)
  })

  it("gives the same layout for the same data, in any order (AC-04)", () => {
    const again = buildBoxes([...files].reverse(), [...edges].reverse())
    expect(layoutMap(again, [...edges].reverse(), new Set(["lib"]))).toEqual(
      layoutMap(map, edges, new Set(["lib"]))
    )
  })

  it("places dependencies to the right of what imports them", () => {
    const layout = layoutMap(map, edges)
    const x = new Map(layout.boxes.map((n) => [n.id, n.x]))
    expect(x.get("lib") ?? 0).toBeGreaterThan(x.get("app") ?? 0)
    expect(x.get("util") ?? 0).toBeGreaterThan(x.get("lib") ?? 0)
  })
})

describe("selection (FR-013)", () => {
  it("keeps a box, its edges and its neighbours, with each edge's direction", () => {
    const layout = layoutMap(map, edges)
    const { kept, into, outOf } = fullStrength(layout, { box: "lib" })
    expect([...kept].sort()).toEqual(["app", "lib", "util"])
    expect([...into]).toEqual(["app→lib"])
    expect([...outOf]).toEqual(["lib→util"])
  })

  it("keeps a selected row's neighbours, and leaves the rest dimmed", () => {
    const layout = layoutMap(map, edges, new Set(["lib"]))
    const { kept, into, outOf } = fullStrength(layout, {
      box: "lib",
      file: "lib/a.ts",
    })
    expect([...kept].sort()).toEqual([
      "app",
      "lib",
      "lib\0lib/a.ts",
      "lib\0lib/b.ts",
    ])
    expect([...into]).toEqual(["app→lib\0lib/a.ts"])
    expect([...outOf]).toEqual(["lib\0lib/a.ts→lib\0lib/b.ts"])
  })
})

describe("role counts (FR-016, AC-08)", () => {
  it("counts each box's files in a role, adding up to the role's total", () => {
    const counts = roleCounts(map, files, "Utilities")
    expect(Object.fromEntries(counts)).toEqual({
      app: 0,
      lib: 2,
      util: PANEL_ROW_LIMIT + 2,
    })
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(files.filter((f) => f.role === "Utilities").length)
  })
})

describe("the root box", () => {
  it("lays out a map whose root holds files of its own", () => {
    const rooted = [file("index.ts"), file("a.ts"), ...files]
    const rootEdges = [...edges, edge("index.ts", "app/page.tsx")]
    const layout = layoutMap(buildBoxes(rooted, rootEdges), rootEdges)
    expect(layout.boxes.map((n) => n.id)).toContain("")
    for (const node of layout.boxes) expect(Number.isFinite(node.x)).toBe(true)
  })
})
