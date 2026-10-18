import "@tanstack/react-start/server-only"

import { listAnalyses, readAnalysis } from "@workspace/database"
import type { AnalysisDetail, RunDetail } from "@workspace/database"
import { repositoryFrom } from "@workspace/github/address"
import type { MapInput } from "@workspace/graph"

import { runAfterResponse } from "./background.server"
import { runLimitLiftsAt } from "./limits.server"
import { RUN_MESSAGES } from "./run-messages"
import { runAnalysis, runDeps } from "./run.server"
import { readSession } from "./session.server"
import { readStoredAnalysis } from "./stored-analysis.server"
import { requestStorage, serverRunWriter } from "./storage.server"

/**
 * What submitting an address gives: the analysis to go to, or why not; at
 * the run limit, when a run can start (`012` FR-006), for the browser to
 * say in the member's own time.
 */
export type Submitted =
  { analysisId: string } | { refusal: string } | { runsResumeAt: string }

/** What a re-run gives: nothing, or when a run can start (`012` FR-006). */
export type Rerun = { runsResumeAt: string } | null

/** An analysis's page: the analysis, and its map once a run has stored one. */
export type AnalysisPage = { analysis: AnalysisDetail; map: MapInput | null }

/**
 * The current organization, from the session Clerk's middleware verified:
 * the only source of whose analysis this is (plan D-06), never the request.
 */
export async function currentOrganization(): Promise<string> {
  const session = await readSession()
  if (!session.signedIn)
    throw new Error("Signed out: no organization to act for.")
  return session.organization.id
}

/**
 * A repository's address submitted (spec 008, FR-001, FR-002): refused with
 * its reason, or the organization's analysis of it, new with a run started
 * after the response, or existing with none. At the run limit (`012`
 * FR-006) an existing analysis still opens; only a new one is refused.
 */
export async function submitAddress(address: string): Promise<Submitted> {
  const read = repositoryFrom(address)
  if ("refusal" in read) return { refusal: read.refusal }
  const { repository } = read
  const organizationId = await currentOrganization()
  const storage = await requestStorage()
  const runsResumeAt = await runLimitLiftsAt(storage)
  if (runsResumeAt !== null) {
    // Repositories are matched without case, as storage matches them.
    const existing = (await listAnalyses(storage)).find(
      (analysis) =>
        analysis.repository.toLowerCase() === repository.toLowerCase()
    )
    return existing === undefined
      ? { runsResumeAt }
      : { analysisId: existing.id }
  }
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
 * unless one is under way (FR-004) or the organization is at its run limit
 * (`012` FR-006). The analysis must be the current organization's; the
 * database checks it.
 */
export async function rerun(analysisId: string): Promise<Rerun> {
  const organizationId = await currentOrganization()
  const storage = await requestStorage()
  const analysis = await readAnalysis(storage, analysisId)
  if (analysis === null) throw new Error(`No analysis ${analysisId}`)
  const runsResumeAt = await runLimitLiftsAt(storage)
  if (runsResumeAt !== null) return { runsResumeAt }
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
  return null
}

/**
 * An analysis's latest run alone, with no stored map (spec 008, plan
 * D-11): what a page checks when it starts following, to know whether it
 * missed anything. Null with no run, or no such analysis for the member.
 */
export async function latestRunOf(
  analysisId: string
): Promise<RunDetail | null> {
  const analysis = await readAnalysis(await requestStorage(), analysisId)
  return analysis?.latestRun ?? null
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
  const read = await readStoredAnalysis(await requestStorage(), analysisId)
  if (read === null) return null
  return { analysis: read.analysis, map: read.result?.input ?? null }
}
