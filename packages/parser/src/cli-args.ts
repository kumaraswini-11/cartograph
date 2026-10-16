// The arguments every command over a directory takes: `<directory> [--out
// <file>]`. One source for the parser's and detection's commands; exported at
// `@workspace/parser/cli`.
import { argv, exit, stderr } from "node:process"
import { parseArgs } from "node:util"

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
