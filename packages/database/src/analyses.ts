import type { StorageClient } from "./client.ts"
import type { Json } from "./database.types.ts"

/** The stages a run moves through before it ends (CONTEXT.md: Stage). */
export const STAGES = ["fetching", "parsing", "storing"] as const

export type Stage = (typeof STAGES)[number]

/** A run's states, its stages then its two ends (CONTEXT.md: Run, Stage). */
export const RUN_STATES = [...STAGES, "done", "failed"] as const

export type RunState = (typeof RUN_STATES)[number]

/** A run as the dashboard shows it (spec 007, FR-006; spec 008, FR-013). */
export type RunSummary = {
  state: RunState
  /**
   * Unfinished for longer than STALE_RUN_AFTER, as the database decides it
   * (spec 008, FR-013, plan D-08).
   */
  stale: boolean
}

/** An analysis as the dashboard lists it (spec 007, FR-006). */
export type AnalysisSummary = {
  id: string
  /** "owner/name", as the member wrote it. */
  repository: string
  /** The latest run; null for an analysis that hasn't run yet. */
  latestRun: RunSummary | null
}

/** A run as an analysis's page shows it (spec 008, FR-007, FR-010). */
export type RunDetail = RunSummary & {
  id: string
  /** The current stage's sentence, or why the run failed. */
  message: string
  /** The stage a failed run failed in; null for any other. */
  failedStage: Stage | null
  /** The commit fetched; null until fetching has read it. */
  commit: string | null
  startedAt: string
  finishedAt: string | null
}

/** An analysis with its latest run, for its own page. */
export type AnalysisDetail = {
  id: string
  repository: string
  latestRun: RunDetail | null
}

/**
 * An analysis's stored results: the parser's and detection's output, as
 * stored, for the caller to read with their own schemas (spec 008, D-12).
 */
export type StoredResult = {
  commit: string
  parsed: Json
  detection: Json
  storedAt: string
}

const isOneOf = <T extends string>(
  values: ReadonlyArray<T>,
  value: string
): value is T => (values as ReadonlyArray<string>).includes(value)

function runState(state: string): RunState {
  if (!isOneOf(RUN_STATES, state)) {
    throw new Error(`An unknown run state: ${state}`)
  }
  return state
}

function stage(value: string | null): Stage | null {
  if (value === null) return null
  if (!isOneOf(STAGES, value)) throw new Error(`An unknown stage: ${value}`)
  return value
}

/**
 * The current organization's analyses, by repository, each with its latest
 * run's state and whether it's stale (spec 007, FR-006; spec 008, FR-013).
 * It names no organization: the token the client carries does, and the
 * policies return only that organization's rows (C-02), so switching
 * organization asks the same question (FR-008). Each analysis brings one
 * run, its newest.
 */
export async function listAnalyses(
  storage: StorageClient
): Promise<Array<AnalysisSummary>> {
  const { data, error } = await storage
    .from("analyses")
    .select("id, repository, runs(state, stale, started_at)")
    .order("repository")
    .order("started_at", { referencedTable: "runs", ascending: false })
    .limit(1, { referencedTable: "runs" })
  if (error) throw new Error(`Couldn't list analyses: ${error.message}`)
  return data.map((analysis) => {
    const run = analysis.runs[0]
    return {
      id: analysis.id,
      repository: analysis.repository,
      latestRun:
        run === undefined
          ? null
          : { state: runState(run.state), stale: run.stale === true },
    }
  })
}

/**
 * One analysis of the current organization's, with its latest run, or null
 * when the organization has none by that ID: another organization's
 * analysis is invisible, not refused (spec 007, C-02).
 */
export async function readAnalysis(
  storage: StorageClient,
  analysisId: string
): Promise<AnalysisDetail | null> {
  const { data, error } = await storage
    .from("analyses")
    .select(
      "id, repository, runs(id, state, stale, message, failed_stage, commit, started_at, finished_at)"
    )
    .eq("id", analysisId)
    .order("started_at", { referencedTable: "runs", ascending: false })
    .limit(1, { referencedTable: "runs" })
    .maybeSingle()
  if (error) throw new Error(`Couldn't read analysis: ${error.message}`)
  if (data === null) return null
  const run = data.runs[0]
  return {
    id: data.id,
    repository: data.repository,
    latestRun:
      run === undefined
        ? null
        : {
            id: run.id,
            state: runState(run.state),
            stale: run.stale === true,
            message: run.message,
            failedStage: stage(run.failed_stage),
            commit: run.commit,
            startedAt: run.started_at,
            finishedAt: run.finished_at,
          },
  }
}

/**
 * An analysis's stored results, or null before its first run is done
 * (spec 008, FR-014, FR-015).
 */
export async function readResult(
  storage: StorageClient,
  analysisId: string
): Promise<StoredResult | null> {
  const { data, error } = await storage
    .from("results")
    .select("commit, parsed, detection, stored_at")
    .eq("analysis_id", analysisId)
    .maybeSingle()
  if (error) throw new Error(`Couldn't read results: ${error.message}`)
  if (data === null) return null
  return {
    commit: data.commit,
    parsed: data.parsed,
    detection: data.detection,
    storedAt: data.stored_at,
  }
}
