import "@tanstack/react-start/server-only"

import { listAnalyses, readAnalysis } from "@workspace/database"
import type { AnalysisDetail, RunDetail, RunWriter } from "@workspace/database"
import { repositoryFrom } from "@workspace/github/address"
import type { MapInput } from "@workspace/graph"

import { runAfterResponse } from "./background.server"
import { runLimitLiftsAt } from "./limits.server"
import { RUN_MESSAGES } from "./run-messages"
import { runAnalysis, runDeps } from "./run.server"
import { readSession } from "./session.server"
import { readStoredAnalysis } from "./stored-analysis.server"
import { requestStorage, serverRunWriter } from "./storage.server"
import { track } from "./telemetry.server"

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

/** The signed-in person and the organization they act for. */
export type Member = { userId: string; organizationId: string }

/**
 * The signed-in person and their current organization, from the session
 * Clerk's middleware verified: the only source of whose analysis this is
 * (plan D-06), never the request.
 */
export async function currentMember(): Promise<Member> {
  const session = await readSession()
  if (!session.signedIn)
    throw new Error("Signed out: no organization to act for.")
  return { userId: session.userId, organizationId: session.organization.id }
}

/** The current organization alone (see `currentMember`). */
export async function currentOrganization(): Promise<string> {
  return (await currentMember()).organizationId
}

/**
 * A run after the response, and its event once it ends (`012` FR-002),
 * sent for the member who started it.
 */
function runAfterwards(
  member: Member,
  run: { analysisId: string; runId: string; repository: string },
  writer: RunWriter
): void {
  const startedAt = Date.now()
  runAfterResponse(
    runAnalysis(
      { runId: run.runId, repository: run.repository },
      runDeps(writer)
    ).then((outcome) =>
      track(member.userId, {
        event: "run_finished",
        properties: {
          organizationId: member.organizationId,
          analysisId: run.analysisId,
          runId: run.runId,
          outcome,
          durationMs: Date.now() - startedAt,
        },
      })
    )
  )
}

/** That an address was submitted (`012` FR-002), sent after the response. */
function submitted(member: Member, analysisId: string, started: boolean) {
  runAfterResponse(
    track(member.userId, {
      event: "analysis_submitted",
      properties: {
        organizationId: member.organizationId,
        analysisId,
        started,
      },
    })
  )
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
  const member = await currentMember()
  const storage = await requestStorage()
  const runsResumeAt = await runLimitLiftsAt(storage)
  if (runsResumeAt !== null) {
    // Repositories are matched without case, as storage matches them.
    const existing = (await listAnalyses(storage)).find(
      (analysis) =>
        analysis.repository.toLowerCase() === repository.toLowerCase()
    )
    if (existing === undefined) return { runsResumeAt }
    submitted(member, existing.id, false)
    return { analysisId: existing.id }
  }
  const writer = serverRunWriter()
  const { analysisId, runId } = await writer.startAnalysis({
    organizationId: member.organizationId,
    repository,
    message: RUN_MESSAGES.reading(repository),
  })
  submitted(member, analysisId, runId !== null)
  if (runId !== null) {
    runAfterwards(member, { analysisId, runId, repository }, writer)
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
  const member = await currentMember()
  const storage = await requestStorage()
  const analysis = await readAnalysis(storage, analysisId)
  if (analysis === null) throw new Error(`No analysis ${analysisId}`)
  const runsResumeAt = await runLimitLiftsAt(storage)
  if (runsResumeAt !== null) return { runsResumeAt }
  const writer = serverRunWriter()
  const { runId, started } = await writer.rerunAnalysis({
    organizationId: member.organizationId,
    analysisId,
    message: RUN_MESSAGES.reading(analysis.repository),
    stopped: RUN_MESSAGES.stopped,
  })
  if (started) {
    runAfterwards(
      member,
      { analysisId, runId, repository: analysis.repository },
      writer
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
