// What Cartograph may send about itself (spec 012, FR-001 to FR-003, C-01,
// plan D-02): the five product events and the shape of an error report.
// One source for the server, which sends the events, and the browser,
// which reports its errors.

/**
 * The build's release: its commit on Vercel, "development" elsewhere
 * (vite.config.ts). Every error report carries it (FR-001).
 */
export const RELEASE = import.meta.env.VITE_RELEASE

/**
 * The five product events (FR-002) and the only properties each may have:
 * ids, counts, durations and outcomes, never text (FR-003). An event is
 * typed as one of these, so another name or property doesn't compile.
 */
export type ProductEvent =
  | { event: "signed_in"; properties: { organizationId: string | null } }
  | {
      event: "analysis_submitted"
      properties: {
        organizationId: string
        analysisId: string
        /** False when the organization already had it, or is at its limit. */
        started: boolean
      }
    }
  | {
      event: "run_finished"
      properties: {
        organizationId: string
        analysisId: string
        runId: string
        outcome: "done" | "failed" | "stopped"
        durationMs: number
      }
    }
  | {
      event: "explanation_requested"
      properties: {
        organizationId: string
        analysisId: string
        kind: "file" | "box"
        /** How it ended: "explained", "limited", "paused" and so on. */
        outcome: string
        cached: boolean
      }
    }
  | {
      event: "chat_question_asked"
      properties: {
        organizationId: string
        analysisId: string
        /** False when the organization's model calls are spent. */
        answered: boolean
      }
    }

/** The event names, for a test to check a session against (AC-11). */
export const PRODUCT_EVENTS = [
  "signed_in",
  "analysis_submitted",
  "run_finished",
  "explanation_requested",
  "chat_question_asked",
] as const satisfies ReadonlyArray<ProductEvent["event"]>

/** The most of an error's message a report keeps. */
export const MAX_ERROR_MESSAGE = 500

/** A stack's frame line: V8's "    at …", or Firefox's and Safari's "…@url:1:2". */
const FRAME = /^\s+at |^[^\s@]*@\S+:\d+:\d+$/

/**
 * An error as it may be reported (C-01): its name, its message cut to
 * `MAX_ERROR_MESSAGE`, and its stack's frames, nothing else. Any other
 * property an error holds, a request's body or a response's (the AI SDK's
 * errors keep both), or its cause, stays behind, so a file's source can't
 * ride along; the stack is rebuilt from its frames, as its first lines
 * repeat the whole message.
 */
export function bareError(error: unknown): Error {
  const from =
    error instanceof Error ? error : new Error("A value that isn't an Error")
  const bare = new Error(from.message.slice(0, MAX_ERROR_MESSAGE))
  bare.name = from.name
  const frames = (from.stack ?? "")
    .split("\n")
    .filter((line) => FRAME.test(line))
  bare.stack = [`${bare.name}: ${bare.message}`, ...frames].join("\n")
  return bare
}
