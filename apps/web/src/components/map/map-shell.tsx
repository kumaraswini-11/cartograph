import type { MapInput } from "@workspace/graph"
import { Badge } from "@workspace/ui/components/shadcn-ui/badge"
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/shadcn-ui/sidebar"

import { CoverageBanner } from "@/components/map/coverage-banner"
import { DetailPane } from "@/components/detail/detail-pane"
import { MapDataProvider } from "@/components/map/map-data"
import { MapStateProvider } from "@/components/map/map-state"
import { MapView } from "@/components/map/map-view"
import { Rail } from "@/components/map/rail"
import { ThemeToggle } from "@/components/theme/theme-toggle"

/**
 * The three-column shell every later spec adds to (spec 003, FR-001,
 * FR-002): the rail, the map and the detail pane, at every width. Both side
 * columns are shadcn Sidebars kept always open, so their widths are fixed
 * before the map draws (FR-022) and the pane is never an overlay.
 */
export function MapShell({ input }: { input: MapInput }) {
  return (
    <MapDataProvider input={input}>
      <MapStateProvider>
        <SidebarProvider className="h-dvh min-h-0">
          <Rail taxonomy={input.taxonomy} />
          <SidebarInset className="min-h-0 min-w-0">
            <header className="flex items-center justify-between gap-4 border-b px-4 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate font-medium">{input.repository}</h1>
                <Badge variant="outline" className="font-mono">
                  {input.commit.slice(0, 7)}
                </Badge>
              </div>
              <ThemeToggle />
            </header>
            <h2 className="sr-only">Dependency map</h2>
            <div className="p-2 empty:hidden">
              <CoverageBanner coverage={input.coverage} />
            </div>
            <div className="min-h-0 flex-1">
              <MapView />
            </div>
          </SidebarInset>
          <DetailPane />
        </SidebarProvider>
      </MapStateProvider>
    </MapDataProvider>
  )
}
