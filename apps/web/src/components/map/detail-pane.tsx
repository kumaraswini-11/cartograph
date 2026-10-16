import { MousePointerClickIcon } from "lucide-react"
import { EmptyState } from "@workspace/ui/components/empty-state"
import {
  Sidebar,
  SidebarContent,
} from "@workspace/ui/components/shadcn-ui/sidebar"

/**
 * The detail pane (spec 003, FR-001, FR-002): built on shadcn's Sidebar,
 * always open, so always a column and never an overlay. What it shows for a
 * selection is spec 004's.
 */
export function DetailPane() {
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
      <SidebarContent>
        <EmptyState
          icon={<MousePointerClickIcon />}
          title="Nothing selected"
          description="Select a box or a file on the map to see its details here."
        />
      </SidebarContent>
    </Sidebar>
  )
}
