// AC-06 (spec 002, C-05): each framework's name appears only in its own
// adapter folder, and nowhere in the parser. Names are searched in strings
// and comments, the places framework knowledge would show; module paths are
// left out, since `./nextjs/adapter.ts` only points at an adapter.
import { readFileSync, readdirSync } from "node:fs"
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { parseSource } from "@workspace/parser/syntax"
import { Visitor } from "oxc-parser"
import { describe, expect, it } from "vitest"

/** Each adapter folder and the names that give its framework away. */
const NAMES: Record<string, ReadonlyArray<RegExp>> = {
  nextjs: [/next\.?js/i, /^next(\/|$)/],
  nestjs: [/nest\.?js/i, /@nestjs\//],
  express: [/\bexpress\b/i],
  react: [/\breact\b/i, /^react-dom/],
}

const FRAMEWORKS_SRC = import.meta.dirname
const PARSER_SRC = dirname(
  fileURLToPath(import.meta.resolve("@workspace/parser"))
)

/** Every non-test source file under a directory. */
function sourceFiles(directory: string): Array<string> {
  return readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => join(directory, f))
}

/** A file's string values and comments, without its module paths. */
function textsOf(path: string): Array<string> {
  const parsed = parseSource(path, readFileSync(path, "utf8"))
  const moduleStarts = new Set(
    [...parsed.module.staticImports, ...parsed.module.staticExports]
      .flatMap((m) =>
        "moduleRequest" in m
          ? [m.moduleRequest]
          : m.entries.flatMap((e) => (e.moduleRequest ? [e.moduleRequest] : []))
      )
      .map((request) => request.start)
  )
  const texts = parsed.comments.map((c) => c.value)
  new Visitor({
    Literal(node) {
      if (typeof node.value === "string" && !moduleStarts.has(node.start)) {
        texts.push(node.value)
      }
    },
    TemplateLiteral(node) {
      for (const quasi of node.quasis) texts.push(quasi.value.raw)
    },
  }).visit(parsed.program)
  return texts
}

/** The frameworks a file names. */
const named = (path: string) =>
  Object.entries(NAMES)
    .filter(([, patterns]) =>
      textsOf(path).some((text) => patterns.some((p) => p.test(text)))
    )
    .map(([framework]) => framework)

describe("framework names (AC-06, C-05)", () => {
  it("never appear in the parser", () => {
    const files = sourceFiles(PARSER_SRC)
    expect(files.length).toBeGreaterThan(5)
    for (const path of files) expect([path, named(path)]).toEqual([path, []])
  })

  it.each(sourceFiles(FRAMEWORKS_SRC).map((p) => relative(FRAMEWORKS_SRC, p)))(
    "%s names no framework but its own adapter's",
    (path) => {
      const [, folder] = path.split(sep)
      const own = path.startsWith(`adapters${sep}`) ? folder : undefined
      expect(
        named(join(FRAMEWORKS_SRC, path)).filter((f) => f !== own)
      ).toEqual([])
    }
  )
})
