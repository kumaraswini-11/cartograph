import "@tanstack/react-start/server-only"

import { readAnalysis, readResult } from "@workspace/database"
import type { AnalysisDetail } from "@workspace/database"
import { detection } from "@workspace/frameworks"
import { repositoryFrom } from "@workspace/github/address"
import { toMapInput } from "@workspace/graph"
import type { MapInput } from "@workspace/graph"
import { isTooLarge, parseResult } from "@workspace/parser"

import { runAfterResponse } from "./background.server"
import { RUN_MESSAGES } from "./run-messages"
import { runAnalysis, runDeps } from "./run.server"
import { readSession } from "./session.server"
import { requestStorage, serverRunWriter } from "./storage.server"

/** What submitting an address gives: the analysis to go to, or why not. */
export type Submitted = { analysisId: string } | { refusal: string }

/** An analysis's page: the analysis, and its map once a run has stored one. */
export type AnalysisPage = { analysis: AnalysisDetail; map: MapInput | null }

/**
 * The current organization, from the session Clerk's middleware verified:
 * the only source of whose analysis this is (plan D-06), never the request.
 */
async function currentOrganization(): Promise<string> {
  const session = await readSession()
  if (!session.signedIn)
    throw new Error("Signed out: no organization to act for.")
  return session.organization.id
}

/**
 * A repository's address submitted (spec 008, FR-001, FR-002): refused with
 * its reason, or the organization's analysis of it, new with a run started
 * after the response, or existing with none.
 */
export async function submitAddress(address: string): Promise<Submitted> {
  const read = repositoryFrom(address)
  if ("refusal" in read) return { refusal: read.refusal }
  const { repository } = read
  const organizationId = await currentOrganization()
  const writer = serverRunWriter()
  const { analysisId, runId } = await writer.startAnalysis({
    organizationId,
    repository,
    message: RUN_MESSAGES.reading(repository),
  })
  if (runId !== null) {
    runAfterResponse(runAnalysis({ runId, repository }, runDeps(writer)))
  }
  return { analysisId }
}

/**
 * A re-run chosen from an analysis (FR-003): a new run after the response,
 * unless one is under way (FR-004). The analysis must be the current
 * organization's; the database checks it.
 */
export async function rerun(analysisId: string): Promise<void> {
  const organizationId = await currentOrganization()
  const storage = await requestStorage()
  const analysis = await readAnalysis(storage, analysisId)
  if (analysis === null) throw new Error(`No analysis ${analysisId}`)
  const writer = serverRunWriter()
  const { runId, started } = await writer.rerunAnalysis({
    organizationId,
    analysisId,
    message: RUN_MESSAGES.reading(analysis.repository),
    stopped: RUN_MESSAGES.stopped,
  })
  if (started) {
    runAfterResponse(
      runAnalysis({ runId, repository: analysis.repository }, runDeps(writer))
    )
  }
}

/**
 * An analysis and its stored map, read with the member's token, so another
 * organization's analysis is simply not there (spec 007, C-02). The stored
 * results are read back through the parser's and detection's own schemas,
 * then turned into the map's input (plan D-12).
 */
export async function analysisPage(
  analysisId: string
): Promise<AnalysisPage | null> {
  const storage = await requestStorage()
  const analysis = await readAnalysis(storage, analysisId)
  if (analysis === null) return null
  const stored = await readResult(storage, analysisId)
  if (stored === null) return { analysis, map: null }
  const parsed = parseResult.parse(stored.parsed)
  if (isTooLarge(parsed)) {
    throw new Error(`Analysis ${analysisId} stored a result too large to map`)
  }
  return {
    analysis,
    map: toMapInput(
      { repository: analysis.repository, commit: stored.commit },
      parsed,
      detection.parse(stored.detection)
    ),
  }
}
