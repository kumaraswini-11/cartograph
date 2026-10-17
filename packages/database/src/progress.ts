import type { RunState } from "./analyses.ts"
import { RUN_STATES } from "./analyses.ts"

/**
 * A run's stage change as storage pushes it (spec 008, FR-011): the stage
 * and its sentence, never the run's record (C-03), and which analysis it's
 * for, so the dashboard knows which row moved.
 */
export type StageChange = {
  analysisId: string
  stage: RunState
  message: string
}

// The topics are named in SQL too, where the trigger sends on them and the
// policy decides who hears them (the migration
// 20261017094414_stages_are_pushed.sql); tests on both sides pin the names.

/** Every run's stages in an organization: what the dashboard follows. */
export const organizationTopic = (organizationId: string) =>
  `organization:${organizationId}`

/** One analysis's stages: what its page follows, with nothing to filter. */
export const analysisTopic = (organizationId: string, analysisId: string) =>
  `${organizationTopic(organizationId)}:analysis:${analysisId}`

/** A pushed message, if it's a stage change, or null if it isn't one. */
export function stageChangeFrom(payload: unknown): StageChange | null {
  if (typeof payload !== "object" || payload === null) return null
  const { analysisId, stage, message } = payload as Record<string, unknown>
  if (
    typeof analysisId !== "string" ||
    typeof message !== "string" ||
    typeof stage !== "string" ||
    !(RUN_STATES as ReadonlyArray<string>).includes(stage)
  ) {
    return null
  }
  return { analysisId, stage: stage as RunState, message }
}
