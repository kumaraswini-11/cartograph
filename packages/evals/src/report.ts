// The report (spec 011, FR-006 to FR-009, plan D-02): scores per kind and
// overall, the run as it's stored, the comparison of two runs, and the
// gate. Pure, so each rule is tested without a model call.
import type { CaseResult } from "./run.ts"

/** Below this, a run fails whatever came before (spec: 100%). */
export const GROUNDED_REQUIRED = 1

/** An overall score falling by more than this fails the run (2 points). */
export const SCORE_REGRESSION_TOLERANCE = 0.02

/** Two runs of the same cases agree within this, overall (AC-03). */
export const RERUN_VARIANCE = 0.03

/** One group's scores, each 0 to 1; lookup use only where questions are. */
export type Scores = {
  cases: number
  /** Answers refused for naming a file that doesn't exist (plan D-05). */
  refused: number
  grounded: number
  coverage: number
  lookupUse?: number
}

/** A run, as it's kept in `runs/` (FR-008). */
export type RunRecord = {
  /** When it ran, ISO 8601. */
  at: string
  /** The model and prompt versions behind its scores (FR-006). */
  versions: {
    explainModel: string
    explainPrompt: number
    chatModel: string
    chatPrompt: number
  }
  overall: Scores
  byKind: Partial<Record<CaseResult["kind"], Scores>>
  results: Array<CaseResult>
}

const mean = (values: ReadonlyArray<number>) =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length

/** A group of results' scores: the mean of each, over its cases. */
export function scoresOf(results: ReadonlyArray<CaseResult>): Scores {
  const questions = results.filter((r) => r.scores.lookupUse !== undefined)
  return {
    cases: results.length,
    refused: results.filter((r) => r.ended === "ungrounded").length,
    grounded: mean(results.map((r) => r.scores.grounded)),
    coverage: mean(results.map((r) => r.scores.coverage)),
    ...(questions.length > 0 && {
      lookupUse: mean(questions.map((r) => r.scores.lookupUse ?? 0)),
    }),
  }
}

/** A run's record: its scores per kind and overall (FR-006). */
export function recordOf(
  results: ReadonlyArray<CaseResult>,
  versions: RunRecord["versions"],
  at: string
): RunRecord {
  const kinds = [...new Set(results.map((r) => r.kind))]
  return {
    at,
    versions,
    overall: scoresOf(results),
    byKind: Object.fromEntries(
      kinds.map((kind) => [
        kind,
        scoresOf(results.filter((r) => r.kind === kind)),
      ])
    ),
    results: [...results],
  }
}

const SCORES = ["grounded", "coverage", "lookupUse"] as const
const NAMES: Record<(typeof SCORES)[number], string> = {
  grounded: "Groundedness",
  coverage: "Fact coverage",
  lookupUse: "Lookup use",
}

/**
 * Why a run fails (FR-009), if it does: groundedness below
 * `GROUNDED_REQUIRED`, or an overall score more than
 * `SCORE_REGRESSION_TOLERANCE` below the accepted run's.
 */
export function failures(
  run: RunRecord,
  accepted: RunRecord | null
): Array<string> {
  const found: Array<string> = []
  if (run.overall.grounded < GROUNDED_REQUIRED) {
    found.push(
      `Groundedness is ${percent(run.overall.grounded)}; it must be ${percent(GROUNDED_REQUIRED)}.`
    )
  }
  if (accepted !== null) {
    for (const score of SCORES) {
      const now = run.overall[score]
      const before = accepted.overall[score]
      if (now === undefined || before === undefined) continue
      if (before - now > SCORE_REGRESSION_TOLERANCE + 1e-9) {
        found.push(
          `${NAMES[score]} fell from ${percent(before)} to ${percent(now)}, more than ${points(SCORE_REGRESSION_TOLERANCE)}.`
        )
      }
    }
  }
  return found
}

export const percent = (value: number) => `${(value * 100).toFixed(1)}%`
const points = (value: number) => `${(value * 100).toFixed(1)} points`
const signed = (value: number) =>
  `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}`

/** A run's scores as printed (AC-01): per kind, then overall. */
export function scoreLines(run: RunRecord): Array<string> {
  const row = (label: string, s: Scores) =>
    `${label.padEnd(10)} ${String(s.cases).padStart(3)} cases, ${String(s.refused)} refused  ${SCORES.map(
      (score) =>
        `${NAMES[score]} ${s[score] === undefined ? "  -  " : percent(s[score]).padStart(6)}`
    ).join("  ")}`
  return [
    `Explanations: ${run.versions.explainModel}, prompt ${String(run.versions.explainPrompt)}. Chat: ${run.versions.chatModel}, prompt ${String(run.versions.chatPrompt)}.`,
    ...Object.entries(run.byKind).map(([kind, s]) => row(kind, s)),
    row("overall", run.overall),
  ]
}

/**
 * Two runs compared (FR-008, AC-05): each overall score's change, and both
 * runs' model and prompt versions, so a change can be blamed on one.
 */
export function comparisonLines(
  before: RunRecord,
  after: RunRecord
): Array<string> {
  const versions = (run: RunRecord) =>
    `${run.versions.explainModel} (prompt ${String(run.versions.explainPrompt)}), ${run.versions.chatModel} (prompt ${String(run.versions.chatPrompt)})`
  return [
    `Before: ${before.at}, ${versions(before)}`,
    `After:  ${after.at}, ${versions(after)}`,
    ...SCORES.flatMap((score) => {
      const a = before.overall[score]
      const b = after.overall[score]
      if (a === undefined || b === undefined) return []
      return [
        `${NAMES[score].padEnd(14)} ${percent(a).padStart(6)} → ${percent(b).padStart(6)}  (${signed(b - a)} points)`,
      ]
    }),
  ]
}
