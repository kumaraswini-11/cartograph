// The summary (spec 004, FR-001 to FR-005, AC-13), rendered as the server
// renders it: the pane's resting state is in the first HTML (C-01).
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { SUMMARY_LIST_LENGTH } from "@workspace/graph"
import type { MapFile, MapInput } from "@workspace/graph"
import { SidebarProvider } from "@workspace/ui/components/shadcn-ui/sidebar"

import { Summary } from "./summary"
import { MapDataProvider } from "@/components/map/map-data"
import { HoverProvider } from "@/components/map/map-hover"
import { MapStateProvider } from "@/components/map/map-state"

const DEPENDED = SUMMARY_LIST_LENGTH + 5

const file = (path: string, fanIn: number): MapFile => ({
  path,
  folder: "lib",
  lines: 1,
  fanIn,
  fanOut: 0,
  role: "Utilities",
  entryPoint: false,
})

const input = (overrides: Partial<MapInput> = {}): MapInput => ({
  repository: "owner/name",
  commit: "0".repeat(40),
  files: Array.from({ length: DEPENDED }, (_, i) =>
    file(`lib/f${String(i).padStart(2, "0")}.ts`, i + 1)
  ),
  edges: [],
  taxonomy: [{ role: "Unidentified", tier: "unidentified", files: 3 }],
  coverage: 1,
  frameworks: ["Next.js"],
  imports: { seen: 40, resolved: 30 },
  routes: Array.from({ length: 6 }, (_, i) => ({
    method: "GET" as const,
    path: `/r${i}`,
    file: "app/route.ts",
    line: i + 1,
  })),
  routesNotRecovered: [],
  ...overrides,
})

// Apostrophes unescaped, so sentences compare as written.
const render = (map: MapInput) =>
  renderToStaticMarkup(
    <MapDataProvider input={map}>
      <MapStateProvider>
        <HoverProvider>
          <SidebarProvider>
            <Summary />
          </SidebarProvider>
        </HoverProvider>
      </MapStateProvider>
    </MapDataProvider>
  ).replaceAll("&#x27;", "'")

describe("the summary (spec 004)", () => {
  it("states the repository, its frameworks and counts (FR-001, FR-005)", () => {
    const html = render(input())
    for (const text of [
      "owner/name",
      "Next.js",
      "Routes",
      "6",
      "Unidentified files",
    ]) {
      expect(html).toContain(text)
    }
  })

  it("shows SUMMARY_LIST_LENGTH files and the full count in the heading (AC-13)", () => {
    const html = render(input())
    const rows = html.match(/data-sidebar="menu-button"/g) ?? []
    // Most depended on shows its first rows; nothing starts reading here.
    expect(rows).toHaveLength(SUMMARY_LIST_LENGTH)
    expect(html).toContain(`Show all ${DEPENDED}`)
    expect(html).toMatch(new RegExp(`Most depended on <span[^>]*>${DEPENDED}<`))
  })

  it("says no route was found when no framework was detected (edge cases)", () => {
    const html = render(input({ frameworks: [], routes: [] }))
    expect(html).toContain("No framework detected")
    expect(html).toContain("None found")
  })

  it("says routes weren't recovered, not 0, for a framework that can't (spec 005 D-06)", () => {
    const html = render(
      input({
        frameworks: ["Express"],
        routes: [],
        routesNotRecovered: ["Express"],
      })
    )
    expect(html).toContain("Not recovered")
  })
})

describe("the routes (spec 005, FR-010, FR-012)", () => {
  it("lists method, path and file, the file a button (FR-010, FR-011)", () => {
    const html = render(input())
    for (const head of ["Method", "Path", "File"]) {
      expect(html).toContain(`scope="col"`)
      expect(html).toMatch(new RegExp(`<th[^>]*>${head}</th>`))
    }
    expect(html.match(/<tr data-slot="table-row"/g)).toHaveLength(1 + 6)
    expect(html).toContain(`aria-label="route.ts app"`)
  })

  it("says the code has none, or which frameworks' routes can't be recovered", () => {
    expect(render(input({ routes: [] }))).toContain("No routes in the code.")
    const express = render(
      input({ routes: [], routesNotRecovered: ["Express", "React"] })
    )
    expect(express).toContain(
      "Express and React routes can't be recovered exactly."
    )
    expect(express).not.toContain("<table")
    // Routes from one package, none from another: both said.
    const mixed = render(input({ routesNotRecovered: ["Express"] }))
    expect(mixed).toContain("<table")
    expect(mixed).toContain("Express routes can't be recovered exactly.")
  })
})

describe("the insights (spec 005, FR-006 to FR-009)", () => {
  /** From the section's heading on. */
  const section = (html: string) =>
    html.slice(html.lastIndexOf("<h3", html.indexOf(">Insights<")))

  it("start closed, with their sentences in the server's HTML (AC-05, C-04, D-01)", () => {
    const html = section(render(input()))
    expect(html).toMatch(/aria-expanded="false"/)
    // Hidden, yet in the page; the browser makes it hidden until found.
    expect(html).toMatch(/data-closed="" [^>]*hidden=""/)
    expect(html).toContain("Heavily imported files")
    expect(html).toMatch(/ files import <button[^>]*>lib\/f14\.ts<\/button>\./)
  })

  it("leave out a kind with none, and never count (C-05, edge cases)", () => {
    const html = section(render(input()))
    expect(html).not.toContain("Cycles")
    expect(html).not.toContain("Unimported files")
    // The only figure is the one in the sentence itself.
    const text = html.replace(/<[^>]+>/g, " ")
    expect(text.match(/\d+/g)).toEqual([String(DEPENDED), "14"])
  })

  it("say there are none when there are none", () => {
    const html = render(input({ files: [file("lib/a.ts", 1)] }))
    expect(html).toContain(
      "No file is unimported, heavily imported, on a cycle or oversized."
    )
  })
})
