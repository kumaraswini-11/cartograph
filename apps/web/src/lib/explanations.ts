import type { Explained } from "@workspace/ai"

/**
 * What explaining gives the tab: the explanation, or why there is none
 * (spec 009). Shared by the server, which makes it, and the browser, which
 * shows it.
 */
export type ExplainResult = { traced: boolean } & (
  | { status: "explained"; explanation: Explained; cached: boolean }
  /** Two answers in a row named files that aren't there (FR-006). */
  | { status: "ungrounded" }
  /** The model's request limit is reached (plan D-02). */
  | { status: "limited" }
  /** Something else went wrong, in words a member can read. */
  | { status: "failed"; message: string }
)
