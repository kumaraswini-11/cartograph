// The per-organization limits (spec 012, FR-006, FR-007, plan Thresholds):
// shared by the server, which checks them, and the browser, which says
// when they lift in the member's own time zone.

/** The most runs an organization may start within `RUN_LIMIT_WINDOW`. */
export const RUN_LIMIT = 20

/** An hour, in milliseconds. */
export const RUN_LIMIT_WINDOW = 60 * 60 * 1000

/**
 * The most model calls an organization may make within
 * `MODEL_CALL_LIMIT_WINDOW`: below the shared key's free daily quota, so
 * one organization can't spend everyone's (D-06).
 */
export const MODEL_CALL_LIMIT = 100

/** A day, in milliseconds. */
export const MODEL_CALL_LIMIT_WINDOW = 24 * 60 * 60 * 1000

/**
 * When a limit lifts, given the latest times counted against it, newest
 * first: null while under it, or else the moment the `limit`th newest
 * leaves the window, ISO 8601. Counted from the `limit`th rather than the
 * oldest, so it's right even if a race let the count past the limit.
 */
export function liftsAt(
  times: ReadonlyArray<string>,
  limit: number,
  window: number
): string | null {
  const last = times[limit - 1]
  if (last === undefined) return null
  return new Date(Date.parse(last) + window).toISOString()
}

/** A time as the member reads it: their weekday and clock, not UTC. */
const clock = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))

/** Why a run didn't start (FR-006), and when one can. */
export const runLimitMessage = (resumesAt: string) =>
  `Your organization has started ${RUN_LIMIT} runs in the last hour. The next can start at ${clock(resumesAt)}.`

/** Why nothing was asked of the model (FR-007), and when it can be. */
export const modelCallLimitMessage = (
  what: "Explanations" | "Answers",
  resumesAt: string
) =>
  `Your organization has made its ${MODEL_CALL_LIMIT} model calls for today. ${what} resume at ${clock(resumesAt)}.`
