import { useCallback } from "react"

import { useMapData } from "@/components/map/map-data"
import { useMapState } from "@/components/map/map-state"

/**
 * Choosing a file path in the detail pane (spec 004, FR-011): the map's
 * selection moves to that file.
 */
export function useChooseFile(): (path: string) => void {
  // The boxes are read when a file is chosen, not while rendering, so the
  // server never builds them (map-data.tsx).
  const data = useMapData()
  const { actions } = useMapState()
  return useCallback(
    (path: string) => {
      const box = data.boxMap.boxOf.get(path)
      if (box !== undefined) actions.select({ box, file: path })
    },
    [data, actions]
  )
}
