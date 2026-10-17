import type { StorageClient } from "./client.ts"

/** A run's states, its stages then its two ends (CONTEXT.md: Run, Stage). */
export const RUN_STATES = [
  "fetching",
  "parsing",
  "storing",
  "done",
  "failed",
] as const

export type RunState = (typeof RUN_STATES)[number]

/** An analysis as the dashboard lists it (spec 007, FR-006). */
export type AnalysisSummary = {
  id: string
  /** "owner/name". */
  repository: string
  /** The latest run's state; null for an analysis that hasn't run yet. */
  latestRun: RunState | null
}

const isRunState = (state: string): state is RunState =>
  (RUN_STATES as ReadonlyArray<string>).includes(state)

/**
 * The current organization's analyses, by repository, each with its latest
 * run's state (FR-006). It names no organization: the token the client
 * carries does, and the policies return only that organization's rows
 * (C-02), so switching organization asks the same question (FR-008). Each
 * analysis brings one run, its newest.
 */
export async function listAnalyses(
  storage: StorageClient
): Promise<Array<AnalysisSummary>> {
  const { data, error } = await storage
    .from("analyses")
    .select("id, repository, runs(state, started_at)")
    .order("repository")
    .order("started_at", { referencedTable: "runs", ascending: false })
    .limit(1, { referencedTable: "runs" })
  if (error) throw new Error(`Couldn't list analyses: ${error.message}`)
  return data.map((analysis) => {
    const state = analysis.runs[0]?.state
    if (state !== undefined && !isRunState(state)) {
      throw new Error(`An unknown run state: ${state}`)
    }
    return {
      id: analysis.id,
      repository: analysis.repository,
      latestRun: state ?? null,
    }
  })
}
