// `pnpm --filter @workspace/frameworks detect <directory> [--out <file>]`:
// parses a directory, detects its frameworks, and prints each package, the
// role counts in taxonomy order, the entry points and the routes (spec 002).
import { resolve } from "node:path"
import process, { stdout } from "node:process"

import { isTooLarge, parseRepository } from "@workspace/parser"
import { directoryArgs, tooLargeMessage } from "@workspace/parser/command"

import { detectFrameworks } from "./detect.ts"
import { writeDetection } from "./result.ts"

/** Parses, detects, prints, and returns the exit status. */
function main(): number {
  const { directory, out } = directoryArgs("detect")

  const root = resolve(directory)
  const parsed = parseRepository(root)
  if (isTooLarge(parsed)) {
    stdout.write(`${tooLargeMessage(parsed.tooLarge, "detected")}\n`)
    return 1
  }

  const result = detectFrameworks(root, parsed)
  if (out !== undefined) writeDetection(resolve(out), result)

  const lines = [
    "Packages:",
    ...result.packages.map(
      (p) => `  ${p.path === "" ? "(root)" : p.path}: ${p.framework ?? "none"}`
    ),
    "",
    "Roles:",
    ...result.taxonomy.map(
      (t) => `  ${t.role.padEnd(22)} ${String(t.files).padStart(5)}  ${t.tier}`
    ),
    "",
    `Entry points: ${result.files.filter((f) => f.entryPoint).length}`,
    `Routes: ${result.routes.length}`,
    ...result.routes.map(
      (r) => `  ${r.method.padEnd(7)} ${r.path}  ${r.file}:${r.line}`
    ),
  ]
  if (out !== undefined) lines.push(`Result written to ${out}`)
  stdout.write(lines.join("\n") + "\n")
  return 0
}

// The status, not exit(): output still on its way to a pipe is written in
// full before the process ends (Node.js: process.exit).
process.exitCode = main()
