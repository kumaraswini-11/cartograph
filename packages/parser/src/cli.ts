// `pnpm --filter @workspace/parser parse <directory> [--out <file>]`: parses a
// directory, prints what it found (spec 001, FR-023) and optionally writes the
// result. Runs with nothing else started.
import { resolve } from "node:path"
import { exit, stdout } from "node:process"

import { directoryArgs } from "./cli-args.ts"
import { parseRepository } from "./parse.ts"
import { compareText } from "./paths.ts"
import { isTooLarge, writeResult } from "./result.ts"

function countBy<T>(items: ReadonlyArray<T>, key: (item: T) => string) {
  const counts = new Map<string, number>()
  for (const item of items)
    counts.set(key(item), (counts.get(key(item)) ?? 0) + 1)
  return [...counts].sort(([a], [b]) => compareText(a, b))
}

const { directory, out } = directoryArgs("parse")

const result = parseRepository(resolve(directory))
if (out !== undefined) writeResult(resolve(out), result)

if (isTooLarge(result)) {
  stdout.write(
    `Too large: ${result.tooLarge.files} files, over the ${result.tooLarge.maxFiles}-file limit. Nothing was parsed.\n`
  )
  exit(1)
}

const { coverage } = result
const percent = (n: number) => `${(n * 100).toFixed(1)}%`
const lines = [
  `Files found:   ${coverage.filesFound}`,
  `Files parsed:  ${coverage.filesParsed}`,
  `Files skipped: ${coverage.filesSkipped}`,
  ...countBy(result.skipped, (s) => s.reason.split(":")[0] ?? s.reason).map(
    ([reason, n]) => `  ${reason}: ${n}`
  ),
  `Excluded paths: ${result.excluded.length}`,
  ...countBy(result.excluded, (e) => e.reason).map(
    ([reason, n]) => `  ${reason}: ${n}`
  ),
  `Folders: ${new Set(result.files.map((f) => f.folder)).size}`,
  "",
  `Imports: ${result.imports.length}`,
  `  resolved:   ${coverage.imports.resolved}`,
  `  external:   ${coverage.imports.external}`,
  `  excluded:   ${coverage.imports.excluded}`,
  `  unresolved: ${coverage.imports.unresolved}`,
  ...coverage.unresolvedByReason.flatMap((group) => [
    `    ${group.reason}: ${group.count}`,
    ...group.examples.map(
      (e) => `      ${e.file}:${e.line} ${e.specifier || "(not a literal)"}`
    ),
  ]),
  `Edges: ${result.edges.length}`,
  coverage.figure === null
    ? "Coverage: no imports found"
    : `Coverage: ${percent(coverage.figure)} of ${coverage.imports.resolved + coverage.imports.unresolved} imports resolved`,
]
if (out !== undefined) lines.push(`Result written to ${out}`)
stdout.write(lines.join("\n") + "\n")
