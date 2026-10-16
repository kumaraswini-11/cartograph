// The browser loads this package (the map, the detail pane) and the parser's
// `paths` module with it, so neither may import Node.js, an interface or
// storage (AGENTS.md: packages; spec 003 plan D-01). Checked on their imports.
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { parseSource } from "@workspace/parser/syntax"
import { describe, expect, it } from "vitest"

/** What a browser-loaded module may import at run time. */
const ALLOWED = new Set([
  "@dagrejs/dagre",
  "@workspace/parser/paths",
  "@workspace/frameworks/taxonomy",
])

/** A module's imports that stay at run time: type-only ones are erased. */
function runtimeImports(path: string): Array<string> {
  const { module } = parseSource(path, readFileSync(path, "utf8"))
  return module.staticImports
    .filter((i) => i.entries.length === 0 || i.entries.some((e) => !e.isType))
    .map((i) => i.moduleRequest.value)
}

const SRC = import.meta.dirname
const sources = readdirSync(SRC).filter(
  (f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "testing.ts"
)

describe("browser-safe imports", () => {
  it.each(sources)(
    "%s imports only its own modules and the allowed",
    (file) => {
      const outside = runtimeImports(join(SRC, file)).filter(
        (specifier) => !specifier.startsWith("./") && !ALLOWED.has(specifier)
      )
      expect(outside).toEqual([])
    }
  )

  it("loads @workspace/parser/paths, which imports nothing", () => {
    const paths = fileURLToPath(import.meta.resolve("@workspace/parser/paths"))
    expect(runtimeImports(paths)).toEqual([])
  })
})
