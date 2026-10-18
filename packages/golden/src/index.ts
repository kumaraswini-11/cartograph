// Golden repositories for the golden scripts of the parser (spec 001) and of
// detection (spec 002): each downloaded once at its pinned commit, and its
// counts printed beside the ones its spec pins. The network belongs here,
// never to the packages these scripts check.
import { existsSync, readFileSync, renameSync, rmSync } from "node:fs"
import { join } from "node:path"
import process, { stdout } from "node:process"

import { extractArchive } from "@workspace/github"

/** Counts by name, as a spec's golden data pins them. */
export type Counts = Record<string, number | string>

/** A golden repository at its pinned commit. */
export type GoldenRepository = { repository: string; commit: string }

/** What checking one golden repository found. */
export type GoldenReport = {
  /** How long the step under test took, in seconds. */
  seconds: number
  lines: Array<string>
  drift: boolean
}

/**
 * A golden script's loop: each repository downloaded, checked, and printed
 * under a heading with what was `done` ("parsed", "detected") and how long it
 * took; the script exits with status 1 if anything drifted.
 */
export async function runGolden<TGolden extends GoldenRepository>(
  goldens: ReadonlyArray<TGolden>,
  done: string,
  check: (golden: TGolden, directory: string) => GoldenReport
): Promise<void> {
  let drift = false
  for (const golden of goldens) {
    const directory = await checkout(golden.repository, golden.commit)
    const report = check(golden, directory)
    drift ||= report.drift
    const heading = `${golden.repository} @ ${golden.commit.slice(0, 7)} (${done} in ${report.seconds.toFixed(1)} s)`
    stdout.write(`${[heading, ...report.lines].join("\n")}\n\n`)
  }
  // The status, not exit(): the drift report still on its way to a pipe is
  // written in full before the process ends (Node.js: process.exit).
  if (drift) process.exitCode = 1
}

/** `step`'s value, and how long it took in seconds. */
export function timed<TValue>(step: () => TValue): [TValue, number] {
  const started = performance.now()
  const value = step()
  return [value, (performance.now() - started) / 1000]
}

/** Git-ignored (`.cache` in the root .gitignore). */
const CACHE = join(import.meta.dirname, "..", ".cache")

/**
 * The repository's files at `commit`, downloaded once into the cache, the
 * way a run fetches one (`@workspace/github`, spec 008 plan D-01). With
 * `archive`, GitHub's own archive of that commit, kept in a file, is
 * unpacked the same way, with no network (spec 011, plan D-03).
 */
export async function checkout(
  repository: string,
  commit: string,
  { archive }: { archive?: string } = {}
): Promise<string> {
  const name = `${repository.replace("/", "-")}-${commit}`
  const directory = join(CACHE, name)
  if (existsSync(directory)) return directory

  // Extracted beside the cache entry, then renamed into place: the entry
  // exists only once complete, so an interrupted run never leaves one
  // half-filled that a later run would trust.
  const staging = join(CACHE, `${name}.partial`)
  rmSync(staging, { recursive: true, force: true })
  try {
    await extractArchive(
      repository,
      commit,
      staging,
      archive === undefined
        ? {}
        : { fetch: () => Promise.resolve(new Response(readFileSync(archive))) }
    )
    renameSync(staging, directory)
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }
  return directory
}

/**
 * Each count beside its pinned value: "ok" when they match, the pinned
 * value when they don't. `drift` is true on any mismatch.
 */
export function compareCounts(
  counts: Counts,
  pinned: Counts | undefined
): { lines: Array<string>; drift: boolean } {
  let drift = false
  const width = Math.max(...Object.keys(counts).map((k) => k.length))
  const lines = Object.entries(counts).map(([name, value]) => {
    const expected = pinned?.[name]
    // Once counts are pinned, a new one is drift too, not a silent pass.
    if (pinned !== undefined && expected !== value) drift = true
    const mark =
      pinned === undefined
        ? ""
        : expected === undefined
          ? "  not pinned"
          : expected === value
            ? "  ok"
            : `  pinned ${expected}`
    return `  ${name.padEnd(width)} ${String(value).padStart(7)}${mark}`
  })
  for (const name of Object.keys(pinned ?? {})) {
    if (name in counts) continue
    drift = true
    lines.push(`  ${name.padEnd(width)}       -  pinned ${pinned?.[name]}`)
  }
  return { lines, drift }
}

/** A list beside its pinned one, item by item; `drift` on any difference. */
export function compareList(
  items: ReadonlyArray<string>,
  pinned: ReadonlyArray<string> | undefined
): { lines: Array<string>; drift: boolean } {
  const expected = new Set(pinned ?? items)
  const actual = new Set(items)
  const lines = [
    ...items.map((i) => `  ${expected.has(i) ? " " : "+"} ${i}`),
    ...[...expected].filter((i) => !actual.has(i)).map((i) => `  - ${i}`),
  ]
  return {
    lines,
    drift: lines.some((l) => l.startsWith("  +") || l.startsWith("  -")),
  }
}
