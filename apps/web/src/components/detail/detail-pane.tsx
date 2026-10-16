import { useRef } from "react"
import {
  Sidebar,
  SidebarContent,
} from "@workspace/ui/components/shadcn-ui/sidebar"

import { PaneScrollContext } from "@/components/detail/file-list"
import { Summary } from "@/components/detail/summary"

/**
 * The detail pane (spec 003, FR-001, FR-002; spec 004): built on shadcn's
 * Sidebar, always open, so always a column and never an overlay. Its resting
 * state is the repository's summary (C-01).
 */
export function DetailPane() {
  const scroller = useRef<HTMLDivElement>(null)
  return (
    <Sidebar
      collapsible="none"
      side="right"
      role="complementary"
      aria-labelledby="pane-heading"
      className="border-s"
      style={
        {
          "--sidebar-width": "clamp(10rem, 24vw, 20rem)",
        } as React.CSSProperties
      }
    >
      <h2 id="pane-heading" className="sr-only">
        Details
      </h2>
      <SidebarContent ref={scroller}>
        <PaneScrollContext value={scroller}>
          <Summary />
        </PaneScrollContext>
      </SidebarContent>
    </Sidebar>
  )
}
