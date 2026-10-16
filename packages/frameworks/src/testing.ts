// Test helper: parses and detects a small repository built in a temporary
// directory, with the parser's own repository builder.
import { isTooLarge, parseRepository } from "@workspace/parser"
import { makeRepository } from "@workspace/parser/testing"
import type { Repository } from "@workspace/parser/testing"

import { detectFrameworks } from "./detect.ts"
import type { Detection } from "./result.ts"

let current: Repository | undefined

/** Builds, parses and detects `files`; `cleanUp` removes it after each test. */
export function detected(files: Record<string, string>): Detection {
  current = makeRepository(files)
  const parsed = parseRepository(current.directory)
  if (isTooLarge(parsed)) throw new Error("unexpectedly too large")
  return detectFrameworks(current.directory, parsed)
}

export function cleanUp() {
  current?.remove()
  current = undefined
}

/** A manifest declaring `packages` as dependencies. */
export const manifest = (packages: Array<string>, extra: object = {}) =>
  JSON.stringify({
    dependencies: Object.fromEntries(packages.map((p) => [p, "1.0.0"])),
    ...extra,
  })

/** [path, role, entryPoint] for each file. */
export const roles = (result: Detection) =>
  result.files.map((f) => [f.path, f.role, f.entryPoint])

/** "METHOD path" for each route. */
export const routes = (result: Detection) =>
  result.routes.map((r) => `${r.method} ${r.path}`)
