import { Suspense, lazy } from "react"
import { ClientOnly } from "@tanstack/react-router"
import type { MapInput } from "@workspace/graph"
import { EmptyState } from "@workspace/ui/components/empty-state"
import { Skeleton } from "@workspace/ui/components/shadcn-ui/skeleton"

// React Flow loads with the map, not with the page.
const MapDrawing = lazy(() => import("@/components/map/map-drawing"))

/**
 * The map's column (spec 003, FR-022, C-06): its size is set by the shell's
 * grid before anything is drawn, and the placeholder fills it, so nothing
 * else on the page moves when the map appears.
 */
export function MapView({ input }: { input: MapInput }) {
  const placeholder = (
    <Skeleton className="size-full rounded-none" aria-label="Loading the map" />
  )
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
        <MapDrawing input={input} />
      </Suspense>
    </ClientOnly>
  )
}
