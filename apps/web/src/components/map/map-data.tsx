import { createContext, use, useMemo } from "react"
import { buildBoxes, edgeIndex } from "@workspace/graph"
import type { BoxMap, EdgeIndex, MapInput } from "@workspace/graph"
import type { Tier } from "@workspace/frameworks/taxonomy"

/**
 * The map's data (spec 004, plan): the loader's map input, its boxes, its
 * edge index and each role's tier, shared by the map and the detail pane.
 * The derived parts are built on first use, once per input: the server renders the summary,
 * which needs neither, so it never pays for them. The data never changes
 * while the page is open, so reading it re-renders nothing; what changes
 * (selection, open boxes, role) is the map state's.
 */
type MapData = {
  input: MapInput
  boxMap: BoxMap
  index: EdgeIndex
  /** Each role's tier, from the taxonomy; a role not in it is Unidentified. */
  tierOf: (role: string) => Tier
}

const MapDataContext = createContext<MapData | undefined>(undefined)

export function MapDataProvider({
  input,
  children,
}: {
  input: MapInput
  children: React.ReactNode
}) {
  const value = useMemo<MapData>(() => {
    let boxMap: BoxMap | undefined
    let index: EdgeIndex | undefined
    let tiers: Map<string, Tier> | undefined
    return {
      input,
      get boxMap() {
        return (boxMap ??= buildBoxes(input.files, input.edges))
      },
      get index() {
        return (index ??= edgeIndex(input.edges))
      },
      tierOf(role) {
        tiers ??= new Map(input.taxonomy.map((t) => [t.role, t.tier]))
        return tiers.get(role) ?? "unidentified"
      },
    }
  }, [input])
  return <MapDataContext value={value}>{children}</MapDataContext>
}

export function useMapData(): MapData {
  const value = use(MapDataContext)
  if (!value)
    throw new Error("useMapData must be used within a MapDataProvider")
  return value
}
