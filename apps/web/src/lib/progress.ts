import { useEffect, useRef, useState } from "react"
import { useAuth } from "@clerk/tanstack-react-start"
import { useRouter } from "@tanstack/react-router"

import { storageClient, subscribeToStages } from "@workspace/database"
import type { RunSummary, StageChange } from "@workspace/database"

/** A run's two ends: after either, what the page shows is storage's again. */
const ENDS: ReadonlySet<string> = new Set(["done", "failed"])

/**
 * The stage changes storage pushes on `topic` while the page is open (spec
 * 008, FR-010, FR-011, plan D-11), newest per analysis. The page rendered
 * what storage held; this follows it from there, with no polling (C-02):
 *
 * - once the channel is joined, and again after any rejoin, the route's
 *   data is read again, catching what changed while nothing listened;
 * - when a run ends, or a change names an analysis the page doesn't have
 *   (`isKnown`), the route reads storage again, for the map, the failure
 *   or the new analysis.
 *
 * The browser's storage client carries the member's Clerk token, renewed
 * on every Realtime heartbeat, so the database's policy decides whether
 * they may listen (FR-012, C-04).
 */
export function useStages(
  topic: string,
  isKnown: (analysisId: string) => boolean
): ReadonlyMap<string, StageChange> {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const [changes, setChanges] = useState<ReadonlyMap<string, StageChange>>(
    () => new Map()
  )
  // Read at each change, so a new render's answer is used without
  // joining the channel again.
  const known = useRef(isKnown)
  useEffect(() => {
    known.current = isKnown
  })

  useEffect(() => {
    // Until Clerk has loaded in the browser, there's no token to give: the
    // client would ask for one at once and be refused.
    if (!isLoaded || !isSignedIn) return
    const storage = storageClient({
      url: import.meta.env.VITE_SUPABASE_URL,
      publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      getToken: () => getToken(),
    })
    const stop = subscribeToStages(storage, topic, {
      onJoined: () => void router.invalidate(),
      onStage: (change) => {
        setChanges((previous) =>
          new Map(previous).set(change.analysisId, change)
        )
        if (ENDS.has(change.stage) || !known.current(change.analysisId)) {
          void router.invalidate()
        }
      },
    })
    return () => {
      stop()
      void storage.realtime.disconnect()
    }
  }, [topic, getToken, router, isLoaded, isSignedIn])

  return changes
}

/**
 * A run as storage last had it, with a pushed change on top. A pushed stage
 * is current, so the run isn't stale; a failure's stage comes from storage
 * once the route reads it again.
 */
export function withChange<TRun extends RunSummary & { message?: string }>(
  run: TRun,
  change: StageChange | undefined
): TRun {
  if (change === undefined) return run
  return { ...run, state: change.stage, stale: false, message: change.message }
}
