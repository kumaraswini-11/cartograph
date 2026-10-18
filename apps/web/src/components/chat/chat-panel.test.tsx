// The Chat tab's replies (spec 010, FR-004, FR-005, FR-008, FR-009, C-02),
// rendered as the server renders them, from messages shaped as the stream
// builds them.
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { ChatMessage } from "@workspace/ai"
import { MAX_LOOKUPS } from "@workspace/ai/chat/limits"
import type { MapFile, MapInput } from "@workspace/graph"
import { SidebarProvider } from "@workspace/ui/components/shadcn-ui/sidebar"

import { Question, Reply } from "./chat-panel"
import { MapDataProvider } from "@/components/map/map-data"
import { HoverProvider } from "@/components/map/map-hover"
import { MapStateProvider } from "@/components/map/map-state"

const file = (path: string): MapFile => ({
  path,
  folder: "lib",
  lines: 3,
  fanIn: 1,
  fanOut: 1,
  role: "Utilities",
  entryPoint: false,
})

const map: MapInput = {
  repository: "owner/name",
  commit: "0".repeat(40),
  files: [file("lib/b.ts"), file("lib/c.ts"), file("app/page.tsx")],
  edges: [],
  taxonomy: [],
  coverage: 1,
  frameworks: [],
  imports: { seen: 2, resolved: 2 },
  routes: [],
  routesNotRecovered: [],
}

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <MapDataProvider input={map}>
      <MapStateProvider>
        <HoverProvider>
          <SidebarProvider>{node}</SidebarProvider>
        </HoverProvider>
      </MapStateProvider>
    </MapDataProvider>
  )
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')

const reply = (parts: ChatMessage["parts"]): ChatMessage => ({
  id: "a1",
  role: "assistant",
  parts,
})

const blastRadius: ChatMessage["parts"][number] = {
  type: "tool-blast_radius",
  toolCallId: "call-1",
  state: "output-available",
  input: { path: "lib/c.ts" },
  output: {
    path: "lib/c.ts",
    found: true,
    levels: [["lib/b.ts"], ["app/page.tsx"]],
  },
}

describe("a reply in the Chat tab (spec 010)", () => {
  it("shows its lookups first, open, then the answer with its paths as links (FR-004, C-02, FR-009)", () => {
    const html = render(
      <Reply
        message={reply([
          blastRadius,
          { type: "text", text: "Changing it breaks `lib/b.ts`." },
          {
            type: "data-outcome",
            data: { kind: "answered", stopped: false },
          },
        ])}
      />
    )
    // What the lookup found, in its title, before the answer.
    expect(html.indexOf("Blast radius of")).toBeLessThan(
      html.indexOf("Changing it breaks")
    )
    expect(html).toContain("2 files")
    // C-02: open by default, so what it returned is on screen.
    // The lookup's own trigger, not a walk level's, is the open one.
    const trigger =
      /<button[^>]*data-slot="trace-collapsible-trigger"[^>]*>/.exec(
        html
      )?.[0] ?? ""
    expect(trigger).toContain('aria-expanded="true"')
    expect(html).toContain("1 step away")
    // FR-009: the answer's path is a button onto the map.
    expect(html).toMatch(/<button[^>]*>lib\/b\.ts<\/button>/)
  })

  // CONTEXT.md: Dependencies and Dependents, never "imports"; the same
  // words and facts as the Details tab.
  it("names a file's neighbours and facts as the glossary and the Details tab do", () => {
    const html = render(
      <Reply
        message={reply([
          {
            type: "tool-neighbours",
            toolCallId: "call-3",
            state: "output-available",
            input: { path: "lib/b.ts" },
            output: {
              path: "lib/b.ts",
              found: true,
              dependencies: ["lib/c.ts"],
              dependents: [],
            },
          },
          {
            type: "tool-file_details",
            toolCallId: "call-4",
            state: "output-available",
            input: { path: "lib/b.ts" },
            output: { found: true, ...file("lib/b.ts") },
          },
        ])}
      />
    )
    expect(html).toContain("Dependencies")
    expect(html).toContain("Dependents")
    expect(html).toContain("No file imports it.")
    expect(html).toContain("Entry point")
    expect(html).not.toMatch(/>Imports<|>Imported by</)
  })

  it("shows a running lookup as running, before it returns", () => {
    const html = render(
      <Reply
        message={reply([
          {
            type: "tool-find_files",
            toolCallId: "call-2",
            state: "input-available",
            input: { query: "page" },
          },
        ])}
      />
    )
    expect(html).toContain('data-status="running"')
    expect(html).toContain("Finding files matching “page”")
  })

  // AC-06, FR-007, C-04: declined, with no lookups and no answer.
  it("declines with no lookups shown", () => {
    const html = render(
      <Reply
        message={reply([{ type: "data-outcome", data: { kind: "declined" } }])}
      />
    )
    expect(html).toContain("I only answer questions about this analysis")
    expect(html).not.toContain('aria-label="Lookups"')
  })

  // FR-005: an answer cut short by the limit says so.
  it("says when it stopped at the limit", () => {
    const html = render(
      <Reply
        message={reply([
          blastRadius,
          { type: "text", text: "As far as I got: `lib/b.ts`." },
          {
            type: "data-outcome",
            data: { kind: "answered", stopped: true },
          },
        ])}
      />
    )
    expect(html).toContain(`It stopped after ${MAX_LOOKUPS} lookups`)
  })

  it("shows the question as the member wrote it", () => {
    const html = render(
      <Question
        message={{
          id: "q1",
          role: "user",
          parts: [{ type: "text", text: "What breaks if lib/c.ts changes?" }],
        }}
      />
    )
    expect(html).toContain("What breaks if lib/c.ts changes?")
    expect(html).toContain('data-align="end"')
  })
})
