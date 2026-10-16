// AC-09: the parser knows no framework, interface, storage or network (C-01,
// C-02, FR-001). Its own extractor reads its imports.
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { extractImports } from "./extract.ts"

const PACKAGE_DIRECTORY = join(import.meta.dirname, "..")
const ALLOWED_PACKAGES = ["oxc-parser", "oxc-resolver", "zod"]
/** Built-ins that reach a network, a database or another process. */
const FORBIDDEN_BUILTINS =
  /^node:(http|https|http2|net|tls|dgram|dns|sqlite|child_process|cluster|worker_threads)(\/|$)/
/** Network globals that need no import. */
const FORBIDDEN_GLOBALS = /\b(fetch|WebSocket|EventSource|XMLHttpRequest)\s*\(/

const sourceFiles = readdirSync(join(PACKAGE_DIRECTORY, "src"))
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .map((name) => join("src", name))

describe("boundaries (AC-09)", () => {
  it("depends on oxc and Zod only", () => {
    const manifest = JSON.parse(
      readFileSync(join(PACKAGE_DIRECTORY, "package.json"), "utf8")
    ) as {
      dependencies?: Record<string, string>
    }
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual(
      ALLOWED_PACKAGES
    )
  })

  it.each(sourceFiles)(
    "%s imports only its own modules, oxc, Zod and safe built-ins",
    (path) => {
      const source = readFileSync(join(PACKAGE_DIRECTORY, path), "utf8")
      const extracted = extractImports(path, source)
      if ("error" in extracted) throw new Error(extracted.error)

      const outside = extracted.imports
        .map((i) => i.specifier)
        .filter(
          (s) =>
            !s.startsWith("./") &&
            !(s.startsWith("node:") && !FORBIDDEN_BUILTINS.test(s)) &&
            !ALLOWED_PACKAGES.includes(s)
        )
      expect(outside).toEqual([])
      expect(source).not.toMatch(FORBIDDEN_GLOBALS)
    }
  )
})
