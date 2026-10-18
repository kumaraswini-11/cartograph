import type { Explained } from "@workspace/ai"

/**
 * What to explain: a file by its path, or a box by its id, the folder it
 * stands for ("" for the root).
 */
export type ExplainSubject = { kind: "file" | "box"; path: string }

/**
 * Whether a shown explanation still matches the repository (spec 009,
 * FR-014, FR-015, plan D-10).
 */
export type Staleness =
  /** The default branch is still at the analysed commit. */
  | { status: "current" }
  /** The branch moved; the file itself is unchanged, or it's a box. */
  | { status: "moved" }
  /** The file is different, or gone, at the branch's commit. */
  | { status: "changed" }
  /** GitHub didn't say; no notice rather than a wrong one. */
  | { status: "unknown" }

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
  /** The organization's model calls are spent until then (`012` FR-007). */
  | { status: "paused"; resumesAt: string }
  /** Something else went wrong, in words a member can read. */
  | { status: "failed"; message: string }
)
