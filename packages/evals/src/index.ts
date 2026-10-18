// The evaluation (spec 011). Dev-only: nothing the app runs imports it.
export { PINS, analyse, archiveOf } from "./analysis.ts"
export type { Analysis, Pin } from "./analysis.ts"
export { committedCases, freshCases } from "./cases.ts"
export { deriveCases } from "./facts.ts"
export type { Case, Rule } from "./facts.ts"
export { coverage, grounded, lookupUse, scoreCase } from "./score.ts"
export type { CaseScores, Output } from "./score.ts"
export { runCase, runCases } from "./run.ts"
export type { CaseResult, RunDeps } from "./run.ts"
export {
  GROUNDED_REQUIRED,
  RERUN_VARIANCE,
  SCORE_REGRESSION_TOLERANCE,
  comparisonLines,
  failures,
  recordOf,
  scoreLines,
} from "./report.ts"
export type { RunRecord, Scores } from "./report.ts"
export { acceptRun, acceptedRun, readRun, storeRun } from "./runs.ts"
