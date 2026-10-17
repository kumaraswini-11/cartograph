import type { Stage } from "./analyses.ts"
import type { Json } from "./database.types.ts"
import { secretClient } from "./secret.ts"
import type { SecretAccess } from "./secret.ts"

/** An analysis submitted: its ID, and its first run's when one started. */
export type Started = { analysisId: string; runId: string | null }

/** A re-run asked for: the run under way, and whether it's new. */
export type Rerun = { runId: string; started: boolean }

/**
 * Every write a run makes, through the database's functions (spec 008, plan
 * D-06). Members never write: the server does, with the secret key, after
 * the signed-in person's session has named the organization. Each method
 * takes only the organization or the run it acts on, and the client behind
 * them is never handed out.
 */
export type RunWriter = {
  /**
   * A repository submitted for an organization (FR-001, FR-002): its
   * analysis, with a first run in its first stage when the analysis is new,
   * or with none when the organization already has one, in any case.
   */
  startAnalysis: (input: {
    organizationId: string
    repository: string
    message: string
  }) => Promise<Started>
  /**
   * A re-run chosen from an analysis (FR-003): a stale run is ended first,
   * with `stopped` as its reason; a run still under way is returned instead
   * of starting another (FR-004).
   */
  rerunAnalysis: (input: {
    organizationId: string
    analysisId: string
    message: string
    stopped: string
  }) => Promise<Rerun>
  /**
   * A run's next stage, with its sentence and, once fetched, its commit
   * (FR-005, FR-006). False when the run has already ended, so the caller
   * stops.
   */
  advanceRun: (
    runId: string,
    input: { stage: Stage; message: string; commit?: string }
  ) => Promise<boolean>
  /** A run ended as failed in the stage it reached, with why (FR-007). */
  failRun: (runId: string, message: string) => Promise<void>
  /**
   * A run ended as done, its results stored under the commit it fetched,
   * in one transaction (FR-015). False when the run had already ended.
   */
  finishRun: (
    runId: string,
    input: { parsed: Json; detection: Json; message: string }
  ) => Promise<boolean>
}

/** The writer for runs, with the secret key (server-only). */
export function runWriter(access: SecretAccess): RunWriter {
  const secret = secretClient(access)
  const fail = (what: string, error: { message: string }): never => {
    throw new Error(`Couldn't ${what}: ${error.message}`)
  }

  return {
    async startAnalysis({ organizationId, repository, message }) {
      const { data, error } = await secret
        .rpc("start_analysis", {
          organization: organizationId,
          repository,
          message,
        })
        .single()
      if (error) return fail(`start an analysis of ${repository}`, error)
      // The function returns no run for an analysis that exists (FR-002);
      // the generated type can't say a returned column may be null.
      const runId = data.run_id as string | null
      return { analysisId: data.analysis_id, runId }
    },

    async rerunAnalysis({ organizationId, analysisId, message, stopped }) {
      const { data, error } = await secret
        .rpc("rerun_analysis", {
          organization: organizationId,
          analysis: analysisId,
          message,
          stopped,
        })
        .single()
      if (error) return fail(`re-run analysis ${analysisId}`, error)
      return { runId: data.run_id, started: data.started }
    },

    async advanceRun(runId, { stage, message, commit }) {
      const { data, error } = await secret.rpc("advance_run", {
        run: runId,
        stage,
        message,
        ...(commit === undefined ? {} : { commit }),
      })
      if (error) return fail(`move run ${runId} to ${stage}`, error)
      return data
    },

    async failRun(runId, message) {
      const { error } = await secret.rpc("fail_run", { run: runId, message })
      if (error) fail(`record run ${runId} as failed`, error)
    },

    async finishRun(runId, { parsed, detection, message }) {
      const { data, error } = await secret.rpc("finish_run", {
        run: runId,
        parsed,
        detection,
        message,
      })
      if (error) return fail(`store run ${runId}'s results`, error)
      return data
    },
  }
}
