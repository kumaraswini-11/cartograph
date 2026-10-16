// Golden repositories for the golden scripts of the parser (spec 001) and of
// detection (spec 002): each downloaded once at its pinned commit, and its
// counts printed beside the ones its spec pins. The network belongs here,
// never to the packages these scripts check.
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

/** Counts by name, as a spec's golden data pins them. */
export type Counts = Record<string, number | string>

const DOWNLOAD_TIMEOUT_MS = 120_000
/** Git-ignored (`.cache` in the root .gitignore). */
const CACHE = join(import.meta.dirname, "..", ".cache")

/** The repository's files at `commit`, downloaded once into the cache. */
export async function checkout(
  repository: string,
  commit: string
): Promise<string> {
  const name = `${repository.replace("/", "-")}-${commit}`
  const directory = join(CACHE, name)
  if (existsSync(directory)) return directory

  const response = await fetch(
    `https://codeload.github.com/${repository}/tar.gz/${commit}`,
    { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) }
  )
  if (!response.ok) {
    throw new Error(`${repository}@${commit}: HTTP ${response.status}`)
  }
  mkdirSync(directory, { recursive: true })
  const archive = join(CACHE, `${name}.tar.gz`)
  writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
  try {
    // Relative paths: GNU tar reads "C:\..." as a remote host.
    execFileSync("tar", ["-xzf", `../${name}.tar.gz`, "--strip-components=1"], {
      cwd: directory,
    })
  } catch (error) {
    rmSync(directory, { recursive: true, force: true })
    throw error
  } finally {
    rmSync(archive, { force: true })
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
    if (expected !== undefined && expected !== value) drift = true
    const mark =
      expected === undefined
        ? ""
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
