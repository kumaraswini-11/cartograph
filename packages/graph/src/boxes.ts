import { compareText, fileName } from "@workspace/parser/paths"

import { fold } from "./fold.ts"
import { labels } from "./labels.ts"
import {
  BADGE_CHAR_WIDTH,
  BADGE_PADDING,
  BOX_BORDER,
  BOX_HEIGHT_PER_DOUBLING,
  BOX_MIN_HEIGHT,
  BOX_PADDING,
  CHAR_WIDTH,
  FOLD_TARGET,
  HEADER_GAP,
  PANEL_ROW_LIMIT,
  ROW_HEIGHT,
  ROW_MEDIA_WIDTH,
} from "./limits.ts"
import type { MapEdge, MapFile } from "./input.ts"

/** One box on the map (CONTEXT.md: Box). */
export type Box = {
  /** The folder it stands for; "" for the root. */
  id: string
  /** The shortest unique form of its path (FR-006). */
  label: string
  /** It and every folder folded into it. */
  folders: Array<string>
  files: Array<string>
  /** Files outside the box with an edge to a file in it: its dependents. */
  fanIn: number
  /** Files outside the box that a file in it has an edge to. */
  fanOut: number
  /** Closed size, in pixels (FR-005, plan D-04). */
  width: number
  height: number
}

/** An edge between two boxes, from the file edges that cross them. */
export type BoxEdge = {
  from: string
  to: string
  /** How many file edges it stands for. */
  count: number
  /** True only if every file edge behind it is type-only. */
  typeOnly: boolean
}

export type BoxMap = {
  threshold: number
  boxes: Array<Box>
  /** Each box by its id. */
  byId: Map<string, Box>
  edges: Array<BoxEdge>
  /** Each file's box. */
  boxOf: Map<string, string>
}

const plural = new Intl.PluralRules("en")

/** A count with its noun: `1 file`, `2 files`. */
export const countOf = (count: number, one: string, other: string) =>
  `${count} ${plural.select(count) === "one" ? one : other}`

/**
 * The counts a panel's header shows (FR-008), one source for the panel and
 * the room the layout keeps for them: its files, then the files outside it
 * with an edge in, and out.
 */
export function panelCounts(
  box: Pick<Box, "files" | "fanIn" | "fanOut">
): Array<string> {
  return [
    countOf(box.files.length, "file", "files"),
    `in ${box.fanIn}`,
    `out ${box.fanOut}`,
  ]
}

/** How many of a box's files are in the role chosen on the rail (FR-016). */
export const matchCount = (count: number) => `${count} matching`

/** A label's width: monospace, so length times one character (D-04). */
export const textWidth = (text: string) =>
  text.length * CHAR_WIDTH + 2 * (BOX_PADDING + BOX_BORDER)

/** Taller with every dependent, by a step per doubling (FR-005). */
export const boxHeight = (dependents: number) =>
  BOX_MIN_HEIGHT + BOX_HEIGHT_PER_DOUBLING * Math.log2(1 + dependents)

/**
 * The boxes, their edges and sizes (FR-003 to FR-006). An edge between two
 * files of the same box isn't a box edge; it's drawn between rows once the
 * box opens.
 */
export function buildBoxes(
  files: ReadonlyArray<MapFile>,
  edges: ReadonlyArray<MapEdge>,
  target = FOLD_TARGET
): BoxMap {
  const { threshold, boxes: folds } = fold(files, target)
  const names = labels(folds.map((f) => f.folder))
  const boxOf = new Map<string, string>()
  for (const f of folds) for (const file of f.files) boxOf.set(file, f.folder)

  const dependents = new Map<string, Set<string>>()
  const dependencies = new Map<string, Set<string>>()
  const pairs = new Map<string, BoxEdge>()
  const add = (map: Map<string, Set<string>>, key: string, value: string) => {
    let set = map.get(key)
    if (!set) map.set(key, (set = new Set()))
    set.add(value)
  }
  for (const edge of edges) {
    const from = boxOf.get(edge.from)
    const to = boxOf.get(edge.to)
    if (from === undefined || to === undefined || from === to) continue
    add(dependents, to, edge.from)
    add(dependencies, from, edge.to)
    const key = `${from}\0${to}`
    const pair = pairs.get(key)
    if (pair) {
      pair.count += 1
      pair.typeOnly &&= edge.typeOnly
    } else {
      pairs.set(key, { from, to, count: 1, typeOnly: edge.typeOnly })
    }
  }

  const boxes = folds.map((f): Box => {
    const label = names.get(f.folder) ?? f.folder
    const fanIn = dependents.get(f.folder)?.size ?? 0
    return {
      id: f.folder,
      label,
      folders: f.folders,
      files: f.files,
      fanIn,
      fanOut: dependencies.get(f.folder)?.size ?? 0,
      width: textWidth(label),
      height: boxHeight(fanIn),
    }
  })
  return {
    threshold,
    boxOf,
    boxes,
    byId: new Map(boxes.map((box) => [box.id, box])),
    edges: [...pairs.values()].sort(
      (a, b) => compareText(a.from, b.from) || compareText(a.to, b.to)
    ),
  }
}

/**
 * An open box's panel (FR-007, FR-008): the files it shows as rows, up to
 * `PANEL_ROW_LIMIT`, how many more it holds, and its size.
 */
export function panelOf(box: Box): {
  rows: Array<string>
  more: number
  width: number
  height: number
} {
  const rows = box.files.slice(0, PANEL_ROW_LIMIT)
  const more = box.files.length - rows.length
  // The header: the label, then a badge per count, with room kept for the
  // role-match badge at its widest, so choosing a role never changes the
  // layout.
  const badges = [...panelCounts(box), matchCount(box.files.length)]
  const header =
    textWidth(box.label) +
    badges.reduce(
      (sum, text) =>
        sum + HEADER_GAP + text.length * BADGE_CHAR_WIDTH + 2 * BADGE_PADDING,
      0
    )
  const width = Math.max(
    header,
    ...rows.map((path) => textWidth(fileName(path)) + ROW_MEDIA_WIDTH)
  )
  const lines = 1 + rows.length + (more > 0 ? 1 : 0)
  return { rows, more, width, height: lines * ROW_HEIGHT }
}
