import type { RunState } from "./analyses.ts"
import { RUN_STATES } from "./analyses.ts"
import type { StorageClient } from "./client.ts"

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

/**
 * Follows `topic`'s stage changes (FR-010, FR-011), on a private channel
 * that the storage client joins with the signed-in person's token, so the
 * database's policy decides whether they may (FR-012, C-04). `onJoined` is
 * called each time the channel is joined, rejoins after a lost connection
 * included: a page reads storage again then, for anything it missed while
 * not listening (plan D-11). Returns the way to stop.
 */
export function subscribeToStages(
  storage: StorageClient,
  topic: string,
  handlers: {
    onStage: (change: StageChange) => void
    onJoined: () => void
  }
): () => void {
  const channel = storage
    .channel(topic, { config: { private: true } })
    .on("broadcast", { event: "stage" }, ({ payload }) => {
      const change = stageChangeFrom(payload)
      if (change !== null) handlers.onStage(change)
    })
  // The token goes to Realtime before the channel asks to join, so the
  // policy reads the member's organization (Supabase: Realtime
  // authorization).
  let stopped = false
  storage.realtime
    .setAuth()
    .then(() => {
      if (stopped) return
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") handlers.onJoined()
      })
    })
    .catch((error: unknown) => {
      // The page still shows what storage held; it just won't move live.
      console.error(`Couldn't follow ${topic}:`, error)
    })
  return () => {
    stopped = true
    void storage.removeChannel(channel)
  }
}
