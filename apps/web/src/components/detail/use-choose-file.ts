import { useCallback } from "react"

import { useMapData } from "@/components/map/map-data"
import { useMapActions } from "@/components/map/map-state"

/**
 * Choosing a file path in the detail pane (spec 004, FR-011): the map's
 * selection moves to that file, and its box opens if it's closed, so the
 * file is a row on the map (its panel lists it past the row limit, FR-012).
 */
export function useChooseFile(): (path: string) => void {
  // The boxes are read when a file is chosen, not while rendering, so the
  // server never builds them (map-data.tsx).
  const data = useMapData()
  const actions = useMapActions()
  return useCallback(
    (path: string) => {
      const box = data.boxMap.boxOf.get(path)
      if (box === undefined) return
      actions.select({ box, file: path })
      actions.openBox(box)
    },
    [data, actions]
  )
}
