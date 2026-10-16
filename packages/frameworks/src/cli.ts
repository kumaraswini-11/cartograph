// `pnpm --filter @workspace/frameworks detect <directory> [--out <file>]`:
// parses a directory, detects its frameworks, and prints each package, the
// role counts in taxonomy order, the entry points and the routes (spec 002).
import { resolve } from "node:path"
import { argv, exit, stderr, stdout } from "node:process"
import { parseArgs } from "node:util"

import { isTooLarge, parseRepository } from "@workspace/parser"

import { detectFrameworks } from "./detect.ts"
import { writeDetection } from "./result.ts"

function usage(): never {
  stderr.write("Usage: detect <directory> [--out <file>]\n")
  exit(2)
}

let parsedArgs
try {
  parsedArgs = parseArgs({
    args: argv.slice(2),
    options: { out: { type: "string" } },
    allowPositionals: true,
  })
} catch {
  usage()
}
const { out } = parsedArgs.values
const [directory, ...extra] = parsedArgs.positionals
if (directory === undefined || extra.length > 0) usage()

const root = resolve(directory)
const parsed = parseRepository(root)
if (isTooLarge(parsed)) {
  stdout.write(
    `Too large: ${parsed.tooLarge.files} files, over the ${parsed.tooLarge.maxFiles}-file limit. Nothing was detected.\n`
  )
  exit(1)
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
