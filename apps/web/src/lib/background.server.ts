import "@tanstack/react-start/server-only"

import { getRequest } from "@tanstack/react-start/server"

/** A request whose host can keep the function alive for work after it. */
type HostRequest = Request & {
  waitUntil?: (promise: Promise<unknown>) => void
}

/**
 * Runs `work` after the response, for as long as the host allows (spec 008,
 * plan D-04). Nitro gives every request a `waitUntil` on the hosts that
 * need one: on Vercel, from the function's context, within its
 * maxDuration (`MAX_RUN_SECONDS`); on Node.js, srvx's, which graceful
 * shutdown waits for. Without one (Vite's dev server) the work simply runs
 * on in the long-lived process. This is the one module that knows how, so
 * the app names no host.
 *
 * `work` must handle its own failures: what's left is logged, never thrown
 * into a response already sent.
 */
export function runAfterResponse(work: Promise<unknown>): void {
  const settled = work.catch((error: unknown) => {
    console.error("Work after the response failed:", error)
  })
  const { waitUntil } = getRequest() as HostRequest
  if (typeof waitUntil === "function") waitUntil(settled)
}
