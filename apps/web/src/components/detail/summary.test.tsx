// The summary (spec 004, FR-001 to FR-005, AC-13), rendered as the server
// renders it: the pane's resting state is in the first HTML (C-01).
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { SUMMARY_LIST_LENGTH } from "@workspace/graph"
import type { MapFile, MapInput } from "@workspace/graph"
import { SidebarProvider } from "@workspace/ui/components/shadcn-ui/sidebar"

import { Summary } from "./summary"
import { MapDataProvider } from "@/components/map/map-data"
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
  routes: 6,
  ...overrides,
})

const render = (map: MapInput) =>
  renderToStaticMarkup(
    <MapDataProvider input={map}>
      <MapStateProvider>
        <SidebarProvider>
          <Summary />
        </SidebarProvider>
      </MapStateProvider>
    </MapDataProvider>
  )

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
    expect(html).toMatch(new RegExp(`Most depended on<span[^>]*>${DEPENDED}<`))
  })

  it("says no route was found when no framework was detected (edge cases)", () => {
    const html = render(input({ frameworks: [], routes: 0 }))
    expect(html).toContain("No framework detected")
    expect(html).toContain("None found")
  })
})
