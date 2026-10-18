import { Suspense, lazy } from "react"
import { ClientOnly } from "@tanstack/react-router"
import { EmptyState } from "@workspace/ui/components/empty-state"
import { Skeleton } from "@workspace/ui/components/shadcn-ui/skeleton"

import { useMapData } from "@/components/map/map-data"

// React Flow loads with the map, not with the page.
const MapDrawing = lazy(() => import("@/components/map/map-drawing"))

/**
 * What fills the map's column until the map is drawn: before its code
 * loads, and while its first layout is made (spec 012, D-08).
 */
export function MapPlaceholder() {
  return (
    <Skeleton
      role="status"
      aria-label="Loading the map"
      className="size-full rounded-none motion-reduce:animate-none"
    />
  )
}

/**
 * The map's column (spec 003, FR-022, C-06): its size is set by the shell's
 * grid before anything is drawn, and the placeholder fills it, so nothing
 * else on the page moves when the map appears.
 */
export function MapView() {
  const { input } = useMapData()
  const placeholder = <MapPlaceholder />
  if (input.files.length === 0) {
    return (
      <EmptyState
        className="size-full"
        title="No files found"
        description="This repository has no JavaScript or TypeScript files to map."
      />
    )
  }
  return (
    <ClientOnly fallback={placeholder}>
      <Suspense fallback={placeholder}>
        <MapDrawing />
      </Suspense>
    </ClientOnly>
  )
}
