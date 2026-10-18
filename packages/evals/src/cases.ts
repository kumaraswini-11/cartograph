// The committed case set (spec 011, FR-001): read, and derived afresh from
// the pinned archives, which must agree (AC-06).
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { PINS, analyse } from "./analysis.ts"
import type { Analysis } from "./analysis.ts"
import { deriveCases } from "./facts.ts"
import type { Case } from "./facts.ts"

/** Where the case set is kept: in this package, committed. */
export const CASES_FILE = join(import.meta.dirname, "..", "cases.json")

/** The three analyses, in `PINS` order. */
export async function analyses(): Promise<
  readonly [Analysis, Analysis, Analysis]
> {
  const [express, commerce, nest] = await Promise.all(PINS.map(analyse))
  if (!express || !commerce || !nest) throw new Error("A pin wasn't analysed")
  return [express, commerce, nest]
}

/** The cases, derived again from the pinned archives. */
export async function freshCases(): Promise<Array<Case>> {
  return deriveCases(await analyses())
}

/** The cases as committed. */
export function committedCases(): Array<Case> {
  return JSON.parse(readFileSync(CASES_FILE, "utf8")) as Array<Case>
}

/** The case set as it's written: one case a line's worth, stable. */
export const casesJson = (cases: ReadonlyArray<Case>) =>
  `${JSON.stringify(cases, null, 2)}\n`
