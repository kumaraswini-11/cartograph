// The evaluation (spec 011). Dev-only: nothing the app runs imports it.
export { PINS, analyse, archiveOf } from "./analysis.ts"
export type { Analysis, Pin } from "./analysis.ts"
export { committedCases, freshCases } from "./cases.ts"
export { deriveCases } from "./facts.ts"
export type { Case, Rule } from "./facts.ts"
