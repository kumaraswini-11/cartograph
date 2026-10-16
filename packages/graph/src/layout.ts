import dagre from "@dagrejs/dagre"
import { compareText } from "@workspace/parser/paths"

import { panelOf } from "./boxes.ts"
import type { BoxMap } from "./boxes.ts"
import type { MapEdge } from "./input.ts"

/** A file row of an open panel, or its "more" row for files past the limit. */
export const MORE = "+more"

/** Where an edge ends: a box, or one row of an open panel. */
export type EdgeEnd = { box: string; row?: string }

export type PlacedBox = {
  /** The box's id. */
  id: string
  open: boolean
  /** Top-left corner and size, in pixels. */
  x: number
  y: number
  width: number
  height: number
  /** An open panel's rows (FR-008) and how many files are past them. */
  rows: Array<string>
  more: number
}

export type LaidOutEdge = {
  id: string
  from: EdgeEnd
  to: EdgeEnd
  /** How many file edges it stands for. */
  count: number
  typeOnly: boolean
}

export type Layout = {
  boxes: Array<PlacedBox>
  edges: Array<LaidOutEdge>
  width: number
  height: number
}

/** Space between boxes in a rank, and between ranks. */
const BOX_SEPARATION = 24
const RANK_SEPARATION = 72

/** dagre misreads an empty id, and the root box's id is "": prefix them all. */
const dagreId = (box: string) => `box:${box}`

/** An edge's end as one key: the box, or `box\0row` for a row. */
export const edgeEndKey = (e: EdgeEnd) =>
  e.row === undefined ? e.box : `${e.box}\0${e.row}`

/**
 * Lays the map out with dagre, left to right, so a file's dependencies sit to
 * its right (plan D-05). Open boxes take their panel's size and their edges
 * end on rows (FR-009); a file past the row limit ends on the "more" row.
 * The same input gives the same layout (FR-012): everything enters dagre in
 * path order.
 */
export function layoutMap(
  map: BoxMap,
  fileEdges: ReadonlyArray<MapEdge>,
  open: ReadonlySet<string> = new Set(),
  /** A file its open panel lists even past the row limit (spec 004, FR-012). */
  pinned?: string
): Layout {
  const panels = new Map(
    map.boxes
      .filter((b) => open.has(b.id))
      .map((b) => [b.id, panelOf(b, pinned)])
  )
  const endOf = (file: string): EdgeEnd | undefined => {
    const box = map.boxOf.get(file)
    if (box === undefined) return undefined
    const panel = panels.get(box)
    if (!panel) return { box }
    return { box, row: panel.rows.includes(file) ? file : MORE }
  }

  const edges = new Map<string, LaidOutEdge>()
  for (const edge of fileEdges) {
    const from = endOf(edge.from)
    const to = endOf(edge.to)
    if (!from || !to) continue
    // Inside a closed box: not drawn until it opens.
    if (from.box === to.box && from.row === undefined) continue
    const id = `${edgeEndKey(from)}→${edgeEndKey(to)}`
    const known = edges.get(id)
    if (known) {
      known.count += 1
      known.typeOnly &&= edge.typeOnly
    } else {
      edges.set(id, { id, from, to, count: 1, typeOnly: edge.typeOnly })
    }
  }

  const graph = new dagre.graphlib.Graph()
  graph.setGraph({
    rankdir: "LR",
    nodesep: BOX_SEPARATION,
    ranksep: RANK_SEPARATION,
    marginx: 0,
    marginy: 0,
  })
  graph.setDefaultEdgeLabel(() => ({}))
  for (const box of map.boxes) {
    const panel = panels.get(box.id)
    graph.setNode(dagreId(box.id), {
      width: panel?.width ?? box.width,
      height: panel?.height ?? box.height,
    })
  }
  const ranked = new Set<string>()
  for (const edge of [...edges.values()].sort((a, b) =>
    compareText(a.id, b.id)
  )) {
    const pair = `${edge.from.box}\0${edge.to.box}`
    if (edge.from.box === edge.to.box || ranked.has(pair)) continue
    ranked.add(pair)
    graph.setEdge(dagreId(edge.from.box), dagreId(edge.to.box))
  }
  dagre.layout(graph)

  const boxes = map.boxes.map((box): PlacedBox => {
    const placed = graph.node(dagreId(box.id))
    const panel = panels.get(box.id)
    return {
      id: box.id,
      open: panel !== undefined,
      x: placed.x - placed.width / 2,
      y: placed.y - placed.height / 2,
      width: placed.width,
      height: placed.height,
      rows: panel?.rows ?? [],
      more: panel?.more ?? 0,
    }
  })
  const size = graph.graph()
  return {
    boxes,
    edges: [...edges.values()].sort((a, b) => compareText(a.id, b.id)),
    width: size.width ?? 0,
    height: size.height ?? 0,
  }
}
