// `pnpm --filter @workspace/parser golden`: downloads each golden repository
// at its pinned commit, parses it, and prints its counts beside the ones
// pinned in the spec's golden data (spec 001, T07). Exits 1 on any drift.
// The network belongs to this script, never to the parser (C-01).
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { join } from "node:path"
import { exit, stdout } from "node:process"

import { isTooLarge, parseRepository } from "../src/index.ts"
import type { ParsedRepository } from "../src/index.ts"

type Counts = Record<string, number | string>

type Golden = {
  repository: string
  commit: string
  /** The spec's golden data, pinned by the first run that passed the hand checks. */
  pinned: Counts | undefined
}

const GOLDEN: ReadonlyArray<Golden> = [
  {
    repository: "date-fns/date-fns",
    commit: "717ce0a807ea4c6b540d015b5c408723175b2838",
    pinned: {
      "files found": 1785,
      "files parsed": 1785,
      "files skipped": 0,
      "excluded paths": 1,
      imports: 5827,
      "imports resolved": 5344,
      "imports external": 458,
      "imports excluded": 2,
      "imports unresolved": 23,
      "re-exports": 757,
      "re-exports resolved": 757,
      "require() calls": 27,
      "require() resolved": 9,
      edges: 5333,
      coverage: "99.6%",
    },
  },
  {
    repository: "expressjs/express",
    commit: "a419aa7350389a275ab45fde2e849ed1f02449ef",
    pinned: {
      "files found": 141,
      "files parsed": 141,
      "files skipped": 0,
      "excluded paths": 0,
      imports: 403,
      "imports resolved": 159,
      "imports external": 241,
      "imports excluded": 0,
      "imports unresolved": 3,
      "re-exports": 0,
      "re-exports resolved": 0,
      "require() calls": 403,
      "require() resolved": 159,
      edges: 153,
      coverage: "98.1%",
    },
  },
]

const DOWNLOAD_TIMEOUT_MS = 120_000
const CACHE = join(import.meta.dirname, "..", ".cache", "golden")

/** The repository's files at `commit`, downloaded once into the cache. */
async function checkout({ repository, commit }: Golden): Promise<string> {
  const directory = join(CACHE, `${repository.replace("/", "-")}-${commit}`)
  if (existsSync(directory)) return directory

  const response = await fetch(
    `https://codeload.github.com/${repository}/tar.gz/${commit}`,
    { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) }
  )
  if (!response.ok)
    throw new Error(`${repository}@${commit}: HTTP ${response.status}`)
  mkdirSync(directory, { recursive: true })
  const archive = join(
    directory,
    "..",
    `${repository.replace("/", "-")}-${commit}.tar.gz`
  )
  writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
  try {
    // Relative paths: GNU tar reads "C:\..." as a remote host.
    execFileSync(
      "tar",
      ["-xzf", `../${archive.split(/[\\/]/).pop()}`, "--strip-components=1"],
      {
        cwd: directory,
      }
    )
  } catch (error) {
    rmSync(directory, { recursive: true, force: true })
    throw error
  } finally {
    rmSync(archive, { force: true })
  }
  return directory
}

function countsOf(result: ParsedRepository): Counts {
  const { coverage, imports } = result
  const of = (kind: string) => imports.filter((i) => i.kind === kind)
  const resolved = (list: typeof imports) =>
    list.filter((i) => i.resolution === "resolved").length
  return {
    "files found": coverage.filesFound,
    "files parsed": coverage.filesParsed,
    "files skipped": coverage.filesSkipped,
    "excluded paths": result.excluded.length,
    imports: imports.length,
    "imports resolved": coverage.imports.resolved,
    "imports external": coverage.imports.external,
    "imports excluded": coverage.imports.excluded,
    "imports unresolved": coverage.imports.unresolved,
    "re-exports": of("re-export").length,
    "re-exports resolved": resolved(of("re-export")),
    "require() calls": of("require").length,
    "require() resolved": resolved(of("require")),
    edges: result.edges.length,
    coverage:
      coverage.figure === null
        ? "none"
        : `${(coverage.figure * 100).toFixed(1)}%`,
  }
}

let drift = false
for (const golden of GOLDEN) {
  const directory = await checkout(golden)
  const started = performance.now()
  const result = parseRepository(directory)
  const seconds = (performance.now() - started) / 1000
  if (isTooLarge(result)) throw new Error(`${golden.repository} is too large`)

  const counts = countsOf(result)
  const lines = [
    `${golden.repository} @ ${golden.commit.slice(0, 7)} (parsed in ${seconds.toFixed(1)} s)`,
  ]
  for (const [name, value] of Object.entries(counts)) {
    const pinned = golden.pinned?.[name]
    const mark =
      pinned === undefined
        ? ""
        : pinned === value
          ? "  ok"
          : `  pinned ${pinned}`
    if (pinned !== undefined && pinned !== value) drift = true
    lines.push(`  ${name.padEnd(20)} ${String(value).padStart(7)}${mark}`)
  }
  for (const group of result.coverage.unresolvedByReason) {
    lines.push(`  unresolved, ${group.reason}: ${group.count}`)
    for (const e of group.examples)
      lines.push(`    ${e.file}:${e.line} ${e.specifier || "(not a literal)"}`)
  }
  stdout.write(lines.join("\n") + "\n\n")
}
if (drift) exit(1)
