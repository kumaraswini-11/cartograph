import { detectFrameworks } from "@workspace/frameworks"
import { isTooLarge, parseRepository } from "@workspace/parser"
import { makeRepository } from "@workspace/parser/testing"
import { describe, expect, it } from "vitest"

import { boxHeight, buildBoxes, panelOf, textWidth } from "./boxes.ts"
import { fold, foldAt } from "./fold.ts"
import { toMapInput } from "./input.ts"
import { labels } from "./labels.ts"
import { FOLD_TARGET, PANEL_ROW_LIMIT } from "./limits.ts"
import { file } from "./testing.ts"

/** `count` folders under `src/`, each with `per` files. */
const folders = (count: number, per: number) =>
  Array.from({ length: count }, (_, i) =>
    Array.from({ length: per }, (__, j) => file(`src/f${i}/m${j}.ts`))
  ).flat()

describe("folding (FR-003, FR-004, C-01)", () => {
  it("folds a folder of fewer files than the threshold into its parent, deepest first", () => {
    const boxes = foldAt(
      [
        file("a.ts"),
        file("src/x.ts"),
        file("src/lib/one.ts"),
        file("src/lib/deep/only.ts"),
        file("src/big/a.ts"),
        file("src/big/b.ts"),
      ],
      2
    )
    expect(boxes.map((b) => [b.folder, b.folders, b.files.length])).toEqual([
      // src/lib/deep folds into src/lib, which then holds 2 and stays;
      // src holds only 1, so it folds into the root.
      ["", ["", "src"], 2],
      ["src/big", ["src/big"], 2],
      ["src/lib", ["src/lib", "src/lib/deep"], 2],
    ])
  })

  it("raises the threshold until at most FOLD_TARGET boxes, at the lowest that fits (AC-01)", () => {
    // 30 folders of 2 files: at 2 nothing folds (31 boxes with src);
    // at 3 they all fold into src.
    const files = [...folders(30, 2), file("src/index.ts")]
    expect(foldAt(files, 2).length).toBeGreaterThan(FOLD_TARGET)
    const { threshold, boxes } = fold(files)
    expect(threshold).toBe(3)
    expect(boxes.length).toBeLessThanOrEqual(FOLD_TARGET)
  })

  it("keeps rising when sibling folders sit exactly at the threshold", () => {
    const files = [
      ...folders(20, 3),
      ...folders(20, 2).map((f) => file(f.path.replace("src/", "lib/"))),
    ]
    const { threshold, boxes } = fold(files)
    expect(boxes.length).toBeLessThanOrEqual(FOLD_TARGET)
    expect(fold(files, boxes.length - 1).threshold).toBeGreaterThan(threshold)
  })

  it("gives every box but the root more than one file (AC-02)", () => {
    const files = [...folders(40, 1), ...folders(5, 4), file("index.ts")]
    for (const box of fold(files).boxes) {
      if (box.folder !== "") expect(box.files.length).toBeGreaterThan(1)
    }
  })

  it("gives one box for a repository of one folder, and none for no files", () => {
    expect(fold([file("a.ts"), file("b.ts")]).boxes).toHaveLength(1)
    expect(fold([]).boxes).toEqual([])
  })
})

describe("labels (FR-006, AC-13)", () => {
  it("is the shortest form of each path that's unique on the map", () => {
    expect(
      Object.fromEntries(
        labels(["", "src/ui", "docs/ui", "packages/parser", "a/b/c", "x/b/c"])
      )
    ).toEqual({
      "": "/",
      "src/ui": "src/ui",
      "docs/ui": "docs/ui",
      "packages/parser": "parser",
      "a/b/c": "a/b/c",
      "x/b/c": "x/b/c",
    })
  })
})

describe("sizes (FR-005, AC-12)", () => {
  it("makes a box with more dependents taller, at any count", () => {
    for (const n of [0, 1, 5, 50, 500]) {
      expect(boxHeight(n + 1)).toBeGreaterThan(boxHeight(n))
    }
  })

  it("takes a box's width from its label only", () => {
    const { boxes } = buildBoxes(
      [
        file("src/ui/a.ts"),
        file("src/ui/b.ts"),
        file("lib/c.ts"),
        file("lib/d.ts"),
      ],
      [
        { from: "lib/c.ts", to: "src/ui/a.ts", typeOnly: false },
        { from: "lib/d.ts", to: "src/ui/a.ts", typeOnly: false },
      ]
    )
    const [lib, ui] = boxes
    expect(lib?.width).toBe(textWidth("lib"))
    expect(ui?.width).toBe(textWidth("ui"))
    expect(ui?.height).toBeGreaterThan(lib?.height ?? Infinity)
  })
})

describe("box edges", () => {
  it("joins file edges into one edge per box pair, leaving edges inside a box out", () => {
    const { edges, boxes } = buildBoxes(
      [file("a/x.ts"), file("a/y.ts"), file("b/z.ts"), file("b/w.ts")],
      [
        { from: "a/x.ts", to: "b/z.ts", typeOnly: true },
        { from: "a/y.ts", to: "b/z.ts", typeOnly: false },
        { from: "a/x.ts", to: "a/y.ts", typeOnly: false },
      ]
    )
    expect(edges).toEqual([{ from: "a", to: "b", count: 2, typeOnly: false }])
    expect(boxes.map((b) => [b.id, b.fanIn, b.fanOut])).toEqual([
      ["a", 0, 1],
      ["b", 2, 0],
    ])
  })
})

describe("panels (FR-007, FR-008)", () => {
  it("shows at most PANEL_ROW_LIMIT rows and counts the rest", () => {
    const { boxes } = buildBoxes(folders(1, PANEL_ROW_LIMIT + 3), [])
    const [box] = boxes
    if (!box) throw new Error("no box")
    const panel = panelOf(box)
    expect(panel.rows).toHaveLength(PANEL_ROW_LIMIT)
    expect(panel.more).toBe(3)
  })
})

describe("the map input (C-02)", () => {
  it("reads both results unchanged: every file with its role, every edge", () => {
    const repository = makeRepository({
      "package.json": JSON.stringify({ dependencies: { next: "1" } }),
      "app/page.tsx": 'import { b } from "../lib/b"',
      "lib/b.ts": "export const b = 1",
    })
    try {
      const parsed = parseRepository(repository.directory)
      if (isTooLarge(parsed)) throw new Error("too large")
      const input = toMapInput(
        { repository: "o/r", commit: "c" },
        parsed,
        detectFrameworks(repository.directory, parsed)
      )
      expect(input.files.map((f) => [f.path, f.role, f.entryPoint])).toEqual([
        ["app/page.tsx", "Page routes", true],
        ["lib/b.ts", "Utilities", false],
      ])
      expect(input.edges).toEqual([
        { from: "app/page.tsx", to: "lib/b.ts", typeOnly: false },
      ])
      expect(input.coverage).toBe(1)
    } finally {
      repository.remove()
    }
  })

  it("carries the routes, and the frameworks whose routes can't be recovered, each once (spec 005)", () => {
    const repository = makeRepository({
      "package.json": JSON.stringify({ workspaces: ["web", "api", "jobs"] }),
      "web/package.json": JSON.stringify({ dependencies: { next: "1" } }),
      "web/app/api/hello/route.ts": "export function GET() {}",
      "api/package.json": JSON.stringify({ dependencies: { express: "1" } }),
      "api/index.js": "export {}",
      "jobs/package.json": JSON.stringify({ dependencies: { express: "1" } }),
      "jobs/index.js": "export {}",
    })
    try {
      const parsed = parseRepository(repository.directory)
      if (isTooLarge(parsed)) throw new Error("too large")
      const input = toMapInput(
        { repository: "o/r", commit: "c" },
        parsed,
        detectFrameworks(repository.directory, parsed)
      )
      expect(input.routes.map((r) => [r.method, r.path])).toEqual([
        ["GET", "/api/hello"],
      ])
      expect(input.routesNotRecovered).toEqual(["Express"])
    } finally {
      repository.remove()
    }
  })
})
