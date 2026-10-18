// The stored runs (spec 011, FR-008, plan D-02): one file a run in `runs/`,
// committed and reviewed like any change that moves a number, and
// `accepted.json` naming the run new ones are compared with.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import type { RunRecord } from "./report.ts"

export const RUNS_DIR = join(import.meta.dirname, "..", "runs")
const ACCEPTED = join(RUNS_DIR, "accepted.json")

/** A run's file name, from when it ran: sortable, and safe on every OS. */
export const runName = (run: RunRecord) =>
  `${run.at.replace(/[:.]/g, "-")}.json`

/** Keeps a run; returns its file name. */
export function storeRun(run: RunRecord): string {
  mkdirSync(RUNS_DIR, { recursive: true })
  const name = runName(run)
  writeFileSync(join(RUNS_DIR, name), `${JSON.stringify(run, null, 2)}\n`)
  return name
}

/** A stored run, by its file name. */
export function readRun(name: string): RunRecord {
  return JSON.parse(readFileSync(join(RUNS_DIR, name), "utf8")) as RunRecord
}

/** The accepted run, or null before the first is accepted. */
export function acceptedRun(): RunRecord | null {
  if (!existsSync(ACCEPTED)) return null
  const { run } = JSON.parse(readFileSync(ACCEPTED, "utf8")) as { run: string }
  return readRun(run)
}

/** Makes a stored run the one new runs are compared with. */
export function acceptRun(name: string): void {
  writeFileSync(ACCEPTED, `${JSON.stringify({ run: name }, null, 2)}\n`)
}
