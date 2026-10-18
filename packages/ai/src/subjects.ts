// What an explanation is written from (spec 009): a file's or a box's facts,
// built from an analysis, never from a request. One source for the web
// app's explanations and the evaluation (spec 011), so both explain alike.
import { buildBoxes } from "@workspace/graph"
import type { MapInput } from "@workspace/graph"

import type { BoxToExplain, FileToExplain } from "./explain.ts"
import type { PathIndex } from "./grounding.ts"

/** An analysis, as explaining reads it: its map, and each file's hash. */
export type AnalysisFacts = {
  repository: string
  input: MapInput
  /** Each file's content hash, as the parser recorded it. */
  hashes: ReadonlyMap<string, string>
  paths: PathIndex
}

/**
 * A file's facts (spec 009, FR-001): its hash, its role, and its real
 * neighbours from the analysis's edges. Null if the analysis has no such
 * file.
 */
export function fileToExplain(
  analysis: AnalysisFacts,
  path: string
): FileToExplain | null {
  const hash = analysis.hashes.get(path)
  const role = analysis.input.files.find((file) => file.path === path)?.role
  if (hash === undefined || role === undefined) return null
  return {
    repository: analysis.repository,
    path,
    hash,
    detectedRole: role,
    dependencies: analysis.input.edges
      .filter((edge) => edge.from === path)
      .map((edge) => edge.to),
    dependents: analysis.input.edges
      .filter((edge) => edge.to === path)
      .map((edge) => edge.from),
    analysisPaths: analysis.paths,
  }
}

/**
 * A box's facts (spec 009, FR-002): the map's own box, so it's the one on
 * screen, with its files' hashes and roles and the edges across it. Null if
 * the map has no such box.
 */
export function boxToExplain(
  analysis: AnalysisFacts,
  folder: string
): BoxToExplain | null {
  const { input } = analysis
  const box = buildBoxes(input.files, input.edges).byId.get(folder)
  if (box === undefined) return null
  const inBox = new Set(box.files)
  return {
    repository: analysis.repository,
    folder: box.id,
    folders: box.folders,
    files: input.files
      .filter((file) => inBox.has(file.path))
      .map((file) => {
        const hash = analysis.hashes.get(file.path)
        if (hash === undefined) throw new Error(`${file.path} has no hash`)
        return { path: file.path, hash, role: file.role }
      }),
    incoming: input.edges
      .filter((edge) => inBox.has(edge.to) && !inBox.has(edge.from))
      .map(({ from, to }) => ({ from, to })),
    outgoing: input.edges
      .filter((edge) => inBox.has(edge.from) && !inBox.has(edge.to))
      .map(({ from, to }) => ({ from, to })),
    analysisPaths: analysis.paths,
  }
}
