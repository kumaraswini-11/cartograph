import "@tanstack/react-start/server-only"

import { PostHog } from "posthog-node"

import { getServerEnv } from "./env.server"
import { RELEASE, bareError } from "./telemetry"
import type { ProductEvent } from "./telemetry"

// The server's side of errors and events (spec 012, FR-001 to FR-003, plan
// D-01, D-02). Every send is immediate and awaited: a serverless function
// can end as soon as it responds, so nothing waits in a queue. Telemetry
// never fails a request: a send that fails is logged and dropped.

/** Sent with everything: the release, and no person profile kept. */
const COMMON = { release: RELEASE, $process_person_profile: false }

let client: PostHog | null | undefined

/** The client, made once; null while PostHog isn't configured. */
function posthog(): PostHog | null {
  if (client !== undefined) return client
  const env = getServerEnv()
  client =
    env.VITE_POSTHOG_KEY === undefined || env.VITE_POSTHOG_HOST === undefined
      ? null
      : new PostHog(env.VITE_POSTHOG_KEY, {
          host: env.VITE_POSTHOG_HOST,
          flushAt: 1,
          flushInterval: 0,
          // The server's own address would say where Vercel runs, not
          // where the person is.
          disableGeoip: true,
        })
  return client
}

/**
 * One product event (FR-002), for the person who caused it: their Clerk
 * user id, never their email (FR-003).
 */
export async function track(
  distinctId: string,
  { event, properties }: ProductEvent
): Promise<void> {
  const ph = posthog()
  if (ph === null) return
  try {
    await ph.captureImmediate({
      distinctId,
      event,
      properties: { ...properties, ...COMMON },
    })
  } catch (error) {
    console.error(`The ${event} event wasn't sent:`, error)
  }
}

// An error passes through both middlewares when a server function throws;
// it's reported once.
const reported = new WeakSet<object>()

/**
 * An unhandled error on the server (FR-001), with the release, as
 * `bareError` leaves it (C-01). The person, when known, is their Clerk
 * user id.
 */
export async function reportError(
  error: unknown,
  distinctId?: string
): Promise<void> {
  const ph = posthog()
  if (ph === null) return
  if (typeof error === "object" && error !== null) {
    if (reported.has(error)) return
    reported.add(error)
  }
  try {
    await ph.captureExceptionImmediate(bareError(error), distinctId, COMMON)
  } catch (failure) {
    console.error("The error wasn't reported:", failure)
  }
}
