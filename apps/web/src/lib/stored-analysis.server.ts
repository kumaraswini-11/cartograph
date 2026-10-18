import "@tanstack/react-start/server-only"

import { pathIndex } from "@workspace/ai"
import type { AnalysisFacts } from "@workspace/ai"
import { readAnalysis, readResult } from "@workspace/database"
import type { AnalysisDetail, StorageClient } from "@workspace/database"
import { detection } from "@workspace/frameworks"
import { toMapInput } from "@workspace/graph"
import type { MapInput } from "@workspace/graph"
import { isTooLarge, parseResult } from "@workspace/parser"
import type { ParsedRepository } from "@workspace/parser"

/** An analysis's stored result, read back and turned into the map's input. */
export type MappedResult = {
  commit: string
  parsed: ParsedRepository
  input: MapInput
}

/**
 * An analysis and its stored result (spec 008, plan D-12), read with the
 * member's token, so another organization's is simply not there (spec 007,
 * C-02): null for no such analysis, and a null result before a run has
 * stored one. The results are read back through the parser's and
 * detection's own schemas. One source for the page, explanations and chat.
 */
export async function readStoredAnalysis(
  storage: StorageClient,
  analysisId: string
): Promise<{ analysis: AnalysisDetail; result: MappedResult | null } | null> {
  const analysis = await readAnalysis(storage, analysisId)
  if (analysis === null) return null
  const stored = await readResult(storage, analysisId)
  if (stored === null) return { analysis, result: null }
  const parsed = parseResult.parse(stored.parsed)
  if (isTooLarge(parsed)) {
    throw new Error(`Analysis ${analysisId} stored a result too large to map`)
  }
  return {
    analysis,
    result: {
      commit: stored.commit,
      parsed,
      input: toMapInput(
        { repository: analysis.repository, commit: stored.commit },
        parsed,
        detection.parse(stored.detection)
      ),
    },
  }
}

/** A stored result as explaining reads it (`@workspace/ai`'s facts). */
export function analysisFacts(
  repository: string,
  result: MappedResult
): AnalysisFacts {
  return {
    repository,
    input: result.input,
    hashes: new Map(result.parsed.files.map((file) => [file.path, file.hash])),
    paths: pathIndex(result.input.files.map((file) => file.path)),
  }
}
