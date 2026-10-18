import { compareText, fileName } from "@workspace/parser/paths"

import type { MapFile } from "./input.ts"
import type { EdgeIndex } from "./reach.ts"

// The chat's lookups over one analysis (spec 010, FR-002), as plain queries:
// what a lookup returns is what the parser and detection found, read here,
// never guessed. A blast radius or dependency chain is `walk` itself, the
// detail pane's (FR-003); the routes and insights are the map's own.

/** How well a file matches a search, best first; past the last, no match. */
const RANKS = ["path", "name", "name starts", "path contains"] as const

function rankOf(file: MapFile, query: string): number {
  const path = file.path.toLowerCase()
  const name = fileName(file.path).toLowerCase()
  if (path === query) return 0
  if (name === query) return 1
  if (name.startsWith(query)) return 2
  if (path.includes(query)) return 3
  return RANKS.length
}

/**
 * The files whose path or name matches `query`, ignoring case (FR-002):
 * the exact path first, then an exact name, a name that starts with it, and
 * a path that holds it, each in path order. Empty when nothing matches, so
 * the chat can say there's no such file (the spec's edge case).
 */
export function findFiles(
  files: ReadonlyArray<MapFile>,
  query: string
): Array<string> {
  const wanted = query
    .trim()
    .replace(/^\.?\//, "")
    .toLowerCase()
  if (wanted === "") return []
  return files
    .map((file) => ({ path: file.path, rank: rankOf(file, wanted) }))
    .filter((match) => match.rank < RANKS.length)
    .sort((a, b) => a.rank - b.rank || compareText(a.path, b.path))
    .map((match) => match.path)
}

/** A file's details as the analysis has them, or null if it has no such file. */
export function fileDetails(
  files: ReadonlyArray<MapFile>,
  path: string
): MapFile | null {
  return files.find((file) => file.path === path) ?? null
}

/**
 * A file's dependencies and dependents, one edge away, in path order
 * (FR-002): the same index the detail pane walks.
 */
export function neighbours(
  index: EdgeIndex,
  path: string
): { dependencies: Array<string>; dependents: Array<string> } {
  return {
    dependencies: [...(index.dependencies.get(path) ?? [])],
    dependents: [...(index.dependents.get(path) ?? [])],
  }
}
