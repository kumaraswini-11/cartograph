import type { BoxMap } from "./boxes.ts"
import type { MapFile } from "./input.ts"
import { edgeEndKey } from "./layout.ts"
import type { EdgeEnd, Layout } from "./layout.ts"

/** The one box or file chosen on the map (CONTEXT.md: Selection). */
export type Selection = { box: string; file?: string }

/** What stays at full strength, and which way each kept edge runs (FR-013). */
export type FullStrength = {
  /** Box ids, and `box\0file` for rows. */
  kept: Set<string>
  /** Edge ids into the selection, and out of it (FR-018). */
  into: Set<string>
  outOf: Set<string>
}

/** Whether an edge's end is the selection: the box itself, or the row. */
const isSelected = (end: EdgeEnd, selection: Selection) =>
  end.box === selection.box &&
  (selection.file === undefined || end.row === selection.file)

/**
 * The selection, its edges and its neighbours (FR-013): everything one edge
 * away, in either direction. Everything else is dimmed.
 */
export function fullStrength(
  layout: Layout,
  selection: Selection
): FullStrength {
  const kept = new Set<string>([
    selection.file === undefined
      ? selection.box
      : `${selection.box}\0${selection.file}`,
  ])
  const into = new Set<string>()
  const outOf = new Set<string>()
  for (const edge of layout.edges) {
    const fromSelected = isSelected(edge.from, selection)
    const toSelected = isSelected(edge.to, selection)
    if (toSelected && !fromSelected) {
      into.add(edge.id)
      kept.add(edgeEndKey(edge.from))
    } else if (fromSelected && !toSelected) {
      outOf.add(edge.id)
      kept.add(edgeEndKey(edge.to))
    }
  }
  // A kept row keeps its panel readable.
  for (const key of [...kept]) {
    const box = key.split("\0")[0]
    if (box !== undefined) kept.add(box)
  }
  return { kept, into, outOf }
}

/**
 * Each box's count of files in `role` (FR-016). Every file is in one box, so
 * the counts add up to the rail's count for the role (AC-08).
 */
export function roleCounts(
  map: BoxMap,
  files: ReadonlyArray<MapFile>,
  role: string
): Map<string, number> {
  const roleOf = new Map(files.map((f) => [f.path, f.role]))
  return new Map(
    map.boxes.map((box) => [
      box.id,
      box.files.filter((path) => roleOf.get(path) === role).length,
    ])
  )
}
