import { useEffect, useRef, useState } from "react"
import { useAuth } from "@clerk/tanstack-react-start"
import { useRouter } from "@tanstack/react-router"

import type { RunDetail, RunSummary, StageChange } from "@workspace/database"

/** A run's two ends: after either, what the page shows is storage's again. */
const ENDS: ReadonlySet<string> = new Set(["done", "failed"])

/**
 * The stage changes storage pushes on `topic` while the page is open (spec
 * 008, FR-010, FR-011, plan D-11), newest per analysis. The page rendered
 * what storage held; this follows it from there, with no polling (C-02):
 *
 * - once the channel is joined, and again after any rejoin, the route's
 *   data is read again, catching what changed while nothing listened;
 *   with `isCurrent`, only when it says something did, so a page whose
 *   data is large (an analysis's map) isn't read twice for nothing;
 * - when a run ends, or a change names an analysis the page doesn't have
 *   (`isKnown`), the route reads storage again, for the map, the failure
 *   or the new analysis;
 * - once a read is back, the changes held when it began give way to it:
 *   storage's answer is at least as new as they are. Changes pushed during
 *   the read stay, as they may be newer still.
 *
 * The browser's storage client carries the member's Clerk token, renewed
 * on every Realtime heartbeat, so the database's policy decides whether
 * they may listen (FR-012, C-04). It's loaded once the page is interactive,
 * not with it: nothing needs it before, and it's the page's largest script.
 */
export function useStages(
  topic: string,
  isKnown: (analysisId: string) => boolean,
  /** Whether storage still holds what the page was read with. */
  isCurrent?: () => Promise<boolean>
): ReadonlyMap<string, StageChange> {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const [changes, setChanges] = useState<ReadonlyMap<string, StageChange>>(
    () => new Map()
  )
  // The same changes, for reading when a reload begins and ends.
  const held = useRef<ReadonlyMap<string, StageChange>>(new Map())
  // Read at each change, so a new render's answer is used without
  // joining the channel again.
  const known = useRef(isKnown)
  const current = useRef(isCurrent)
  useEffect(() => {
    known.current = isKnown
    current.current = isCurrent
  })

  useEffect(() => {
    // Until Clerk has loaded in the browser, there's no token to give: the
    // client would ask for one at once and be refused.
    if (!isLoaded || !isSignedIn) return
    let stop: (() => void) | undefined
    let left = false
    const hold = (next: ReadonlyMap<string, StageChange>) => {
      held.current = next
      setChanges(next)
    }
    // Reads the route again; once storage has answered, drops the changes
    // that were held when the read began and haven't been replaced since.
    // `sync`: an already loaded route otherwise reloads in the background,
    // and the promise settles before the new data has arrived.
    const reread = () => {
      const before = held.current
      void router.invalidate({ sync: true }).then(() => {
        if (left) return
        hold(afterRead(before, held.current))
      })
    }
    import("@workspace/database/follow")
      .then(({ followStages }) => {
        if (left) return
        stop = followStages(
          {
            url: import.meta.env.VITE_SUPABASE_URL,
            publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            getToken: () => getToken(),
          },
          topic,
          {
            onJoined: () => {
              const check = current.current
              if (check === undefined) return reread()
              // Read again only if the cheap check says something moved;
              // if it can't say, read again, as without it.
              check().then(
                (unchanged) => {
                  if (!unchanged && !left) reread()
                },
                () => {
                  if (!left) reread()
                }
              )
            },
            onStage: (change) => {
              hold(new Map(held.current).set(change.analysisId, change))
              if (ENDS.has(change.stage) || !known.current(change.analysisId)) {
                reread()
              }
            },
          }
        )
      })
      .catch((error: unknown) => {
        // The page still shows what storage held; it just won't move live.
        console.error(`Couldn't load the live progress for ${topic}:`, error)
      })
    return () => {
      left = true
      stop?.()
    }
  }, [topic, getToken, router, isLoaded, isSignedIn])

  return changes
}

/**
 * Whether two reads saw the same run, as far as a page shows it: the same
 * run, in the same state, as stale, and finished at the same time.
 */
export function sameRun(a: RunDetail | null, b: RunDetail | null): boolean {
  if (a === null || b === null) return a === b
  return (
    a.id === b.id &&
    a.state === b.state &&
    a.stale === b.stale &&
    a.finishedAt === b.finishedAt
  )
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

/**
 * The changes still worth showing once a read from storage is back: those
 * held when it began give way to storage's answer, unless a newer push has
 * replaced them since (plan D-11).
 */
export function afterRead(
  before: ReadonlyMap<string, StageChange>,
  now: ReadonlyMap<string, StageChange>
): ReadonlyMap<string, StageChange> {
  const next = new Map(now)
  for (const [analysisId, change] of before) {
    if (next.get(analysisId) === change) next.delete(analysisId)
  }
  return next
}
