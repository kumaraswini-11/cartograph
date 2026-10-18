// The map's layout, off the page's main thread (spec 012, FR-009, plan
// D-08): dagre was most of the map page's blocking time, and ran again on
// every panel opened. The map is sent once; each layout asked for names
// only the open panels and the pinned file.
import { layoutMap } from "@workspace/graph"
import type { BoxMap, Layout, MapEdge } from "@workspace/graph"

/** What the page sends: the map once, then each layout it wants. */
export type LayoutRequest =
  | { kind: "map"; boxMap: BoxMap; edges: ReadonlyArray<MapEdge> }
  | { kind: "layout"; id: number; open: ReadonlySet<string>; pinned?: string }

/** A layout, with the request it answers. */
export type LayoutReply = { id: number; layout: Layout }

let map: { boxMap: BoxMap; edges: ReadonlyArray<MapEdge> } | undefined

self.addEventListener("message", (event: MessageEvent<LayoutRequest>) => {
  const request = event.data
  if (request.kind === "map") {
    map = { boxMap: request.boxMap, edges: request.edges }
    return
  }
  if (map === undefined) return
  const reply: LayoutReply = {
    id: request.id,
    layout: layoutMap(map.boxMap, map.edges, request.open, request.pinned),
  }
  self.postMessage(reply)
})
