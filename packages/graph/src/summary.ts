import { compareText } from "@workspace/parser/paths"
import type { TaxonomyEntry } from "@workspace/frameworks"

import type { Box } from "./boxes.ts"
import type { MapFile } from "./input.ts"

/** The files with dependents, the most first, then by path (FR-002). */
export function mostDependedOn(files: ReadonlyArray<MapFile>): Array<MapFile> {
  return files
    .filter((f) => f.fanIn > 0)
    .sort((a, b) => b.fanIn - a.fanIn || compareText(a.path, b.path))
}

/**
 * The files no other file imports, the places to start reading (FR-003):
 * entry points first, then the files that import the most, then by path.
 */
export function startingPoints(files: ReadonlyArray<MapFile>): Array<MapFile> {
  return files
    .filter((f) => f.fanIn === 0)
    .sort(
      (a, b) =>
        Number(b.entryPoint) - Number(a.entryPoint) ||
        b.fanOut - a.fanOut ||
        compareText(a.path, b.path)
    )
}

/** Each role inside a box, with its count, in the taxonomy's order (FR-010). */
export function rolesIn(
  box: Pick<Box, "files">,
  files: ReadonlyArray<MapFile>,
  taxonomy: ReadonlyArray<TaxonomyEntry>
): Array<{ role: string; files: number }> {
  const roleOf = new Map(files.map((f) => [f.path, f.role]))
  const counts = new Map<string, number>()
  for (const path of box.files) {
    const role = roleOf.get(path)
    if (role !== undefined) counts.set(role, (counts.get(role) ?? 0) + 1)
  }
  return taxonomy.flatMap(({ role }) => {
    const count = counts.get(role)
    return count === undefined ? [] : [{ role, files: count }]
  })
}
