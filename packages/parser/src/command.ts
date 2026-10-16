// What every command over a directory shares: its arguments,
// `<directory> [--out <file>]`, and the messages it prints. One source for
// the parser's and detection's commands and their golden scripts; exported at
// `@workspace/parser/command`.
import { argv, exit, stderr } from "node:process"
import { parseArgs } from "node:util"

import type { Coverage } from "./result.ts"

/**
 * Reads `<directory> [--out <file>]` from the command line. On anything else
 * it prints the usage and exits with status 2.
 */
export function directoryArgs(command: string): {
  directory: string
  out: string | undefined
} {
  const usage = (): never => {
    stderr.write(`Usage: ${command} <directory> [--out <file>]\n`)
    exit(2)
  }
  let parsed
  try {
    parsed = parseArgs({
      args: argv.slice(2),
      options: { out: { type: "string" } },
      allowPositionals: true,
    })
  } catch {
    return usage()
  }
  const [directory, ...extra] = parsed.positionals
  if (directory === undefined || extra.length > 0) return usage()
  return { directory, out: parsed.values.out }
}

/** A repository over `MAX_FILES`: nothing was `done` ("parsed", "detected"). */
export function tooLargeMessage(
  tooLarge: { files: number; maxFiles: number },
  done: string
): string {
  return `Too large: ${tooLarge.files} files, over the ${tooLarge.maxFiles}-file limit. Nothing was ${done}.`
}

/** A share as a percentage with one decimal: 0.9747 → `97.5%`. */
export const percent = (share: number) => `${(share * 100).toFixed(1)}%`

/**
 * Each reason imports went unresolved, after `label`, with its count, then
 * its examples indented below it.
 */
export function unresolvedLines(
  groups: Coverage["unresolvedByReason"],
  indent: string,
  label = ""
): Array<string> {
  return groups.flatMap((group) => [
    `${indent}${label}${group.reason}: ${group.count}`,
    ...group.examples.map(
      (e) =>
        `${indent}  ${e.file}:${e.line} ${e.specifier || "(not a literal)"}`
    ),
  ])
}
