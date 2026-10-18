// The scores (spec 011, FR-003 to FR-005, C-01, plan D-05): arithmetic over
// the paths an output names, read as grounding reads them (`namedPaths`),
// never a model's opinion. Pure.
import { namedPaths } from "@workspace/ai/grounding"
import type { PathIndex } from "@workspace/ai/grounding"

/**
 * What a case's run gave. A null text: nothing usable came back. `refused`:
 * the model named a file that doesn't exist, twice, and the answer was
 * refused (`009` and `010` FR-006), so a member saw no invented file.
 */
export type Output =
  | { kind: "explanation"; text: string | null; refused?: boolean }
  | {
      kind: "answer"
      text: string | null
      refused?: boolean
      /** The chat declined: no lookup made, no answer (`010` FR-007). */
      declined: boolean
      /** Every analysis path a lookup it showed returned. */
      shown: ReadonlySet<string>
    }

/** One case's scores, each 0 to 1; lookup use for questions only. */
export type CaseScores = {
  grounded: number
  coverage: number
  lookupUse?: number
}

const ZERO = (output: Output): CaseScores =>
  output.kind === "answer"
    ? { grounded: 0, coverage: 0, lookupUse: 0 }
    : { grounded: 0, coverage: 0 }

/**
 * Groundedness of one output (FR-003, AC-02): 1 if every file it names is
 * in the analysis, else 0.
 */
export const grounded = (text: string, index: PathIndex): number =>
  namedPaths(text, index).absent.length === 0 ? 1 : 0

/**
 * Fact coverage of one output (FR-004, AC-07): the share of the case's
 * facts it names. Three of four is 0.75.
 */
export function coverage(
  text: string,
  facts: ReadonlyArray<string>,
  index: PathIndex
): number {
  if (facts.length === 0) return 0
  const named = new Set(namedPaths(text, index).found)
  return facts.filter((fact) => named.has(fact)).length / facts.length
}

/**
 * Lookup use of one answer (FR-005, AC-08): 1 if every file it names came
 * back from a lookup it showed, else 0.
 */
export const lookupUse = (
  text: string,
  shown: ReadonlySet<string>,
  index: PathIndex
): number =>
  namedPaths(text, index).found.every((path) => shown.has(path)) ? 1 : 0

/**
 * A case's scores (plan D-05). An output that's empty, limited or
 * unavailable scores zero on every score (the spec's edge case). A refused
 * one counts as members see it: grounded, since no invented file was shown,
 * but covering nothing and using no lookup, so the slip still costs. A
 * question meant to be declined scores in full when it was, and zero when
 * it was answered.
 */
export function scoreCase(
  output: Output,
  facts: ReadonlyArray<string>,
  expectDecline: boolean,
  index: PathIndex
): CaseScores {
  if (output.kind === "answer" && expectDecline) {
    return output.declined
      ? { grounded: 1, coverage: 1, lookupUse: 1 }
      : ZERO(output)
  }
  if (output.refused === true) {
    return output.kind === "answer"
      ? { grounded: 1, coverage: 0, lookupUse: 0 }
      : { grounded: 1, coverage: 0 }
  }
  if (output.text === null || output.text.trim() === "") return ZERO(output)
  if (output.kind === "answer" && output.declined) return ZERO(output)
  const scores = {
    grounded: grounded(output.text, index),
    coverage: coverage(output.text, facts, index),
  }
  return output.kind === "answer"
    ? { ...scores, lookupUse: lookupUse(output.text, output.shown, index) }
    : scores
}
