import type { Detection, TaxonomyEntry } from "@workspace/frameworks"
import type { ParsedRepository } from "@workspace/parser"

export type MapFile = {
  path: string
  /** The directory that holds it; "" for the root (`001` FR-007). */
  folder: string
  lines: number
  fanIn: number
  fanOut: number
  role: string
  entryPoint: boolean
}

export type MapEdge = { from: string; to: string; typeOnly: boolean }

/** What the map draws, derived from the parser's and detection's results. */
export type MapInput = {
  /** "owner/name". */
  repository: string
  commit: string
  files: Array<MapFile>
  edges: Array<MapEdge>
  taxonomy: Array<TaxonomyEntry>
  /** Resolved imports over resolved and unresolved; null with none (`001`). */
  coverage: number | null
  /**
   * The frameworks detected, each once, in the order their packages were
   * found; empty when no adapter matched (`002` FR-004).
   */
  frameworks: Array<string>
  /** Imports found, and those resolved to a file in the repository (`001`). */
  imports: { seen: number; resolved: number }
  /** Routes found (`002`). */
  routes: number
}

/**
 * The map's input, read from both results unchanged (spec 003, C-02): every
 * parsed file with its role, every edge, the taxonomy and the coverage, and
 * the summary's frameworks and counts (spec 004, FR-001).
 */
export function toMapInput(
  source: { repository: string; commit: string },
  parsed: ParsedRepository,
  detection: Detection
): MapInput {
  const roles = new Map(detection.files.map((f) => [f.path, f]))
  return {
    ...source,
    files: parsed.files.map((file) => {
      const detected = roles.get(file.path)
      if (!detected) throw new Error(`${file.path} has no detected role`)
      return {
        path: file.path,
        folder: file.folder,
        lines: file.lines,
        fanIn: file.fanIn,
        fanOut: file.fanOut,
        role: detected.role,
        entryPoint: detected.entryPoint,
      }
    }),
    edges: parsed.edges.map(({ from, to, typeOnly }) => ({
      from,
      to,
      typeOnly,
    })),
    taxonomy: detection.taxonomy,
    coverage: parsed.coverage.figure,
    frameworks: [
      ...new Set(
        detection.packages.flatMap((p) =>
          p.framework === null ? [] : [p.framework]
        )
      ),
    ],
    imports: {
      seen: Object.values(parsed.coverage.imports).reduce((a, b) => a + b, 0),
      resolved: parsed.coverage.imports.resolved,
    },
    routes: detection.routes.length,
  }
}
