// Following a run's stages from the browser (spec 008, FR-010 to FR-012,
// plan D-09, D-11). Exported on its own, at `@workspace/database/follow`,
// and never from the package's entry: it brings Supabase's client, which a
// page needs only once it's interactive, so the page imports it then and
// the client stays out of what the page loads first.
import { storageClient } from "./client.ts"
import type { StorageAccess, StorageClient } from "./client.ts"
import { stageChangeFrom } from "./progress.ts"
import type { StageChange } from "./progress.ts"

export type StageHandlers = {
  onStage: (change: StageChange) => void
  onJoined: () => void
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
  handlers: StageHandlers
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

/**
 * A storage client of its own, following `topic` until stopped; stopping
 * also closes the client's connection.
 */
export function followStages(
  access: StorageAccess,
  topic: string,
  handlers: StageHandlers
): () => void {
  const storage = storageClient(access)
  const stop = subscribeToStages(storage, topic, handlers)
  return () => {
    stop()
    void storage.realtime.disconnect()
  }
}
