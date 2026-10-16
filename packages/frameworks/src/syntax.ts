// Each file's syntax tree, parsed on first use and kept (plan D-02), with
// the helpers adapters share. Parsing follows the parser's own rules.
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { lineFinder, literalValue, parseSource } from "@workspace/parser/syntax"
import type { Literalish } from "@workspace/parser/syntax"
import { Visitor } from "oxc-parser"
import type { Program } from "oxc-parser"

export { literalValue }

export type ParsedFile = {
  program: Program
  /** The 1-based line of a UTF-16 offset. */
  lineOf: (offset: number) => number
}

/** A file's syntax by its relative path; undefined if it doesn't parse. */
export type Syntax = (path: string) => ParsedFile | undefined

export function createSyntax(directory: string): Syntax {
  const cache = new Map<string, ParsedFile | undefined>()
  return (path) => {
    if (cache.has(path)) return cache.get(path)
    const source = readFileSync(join(directory, path), "utf8")
    const parsed = parseSource(path, source)
    const file =
      parsed.errors.length > 0
        ? undefined
        : { program: parsed.program, lineOf: lineFinder(source) }
    cache.set(path, file)
    return file
  }
}

/** Any node, as far as the helpers need to know. */
export type Node = Literalish & {
  [key: string]: unknown
  end: number
}

/** The string literals an argument holds: one, a literal array, or none. */
export function literalList(node: unknown): Array<string> | undefined {
  const n = node as Node | undefined
  if (n?.type === "ArrayExpression") {
    const values = (n.elements as Array<Node | null>).map((e) =>
      literalValue(e ?? undefined)
    )
    return values.every((v) => v !== undefined) ? values : undefined
  }
  const value = literalValue(n)
  return value === undefined ? undefined : [value]
}

/**
 * Where each imported name comes from: `import { Get as G } from "m"` maps
 * `G` to `{ source: "m", imported: "Get" }` (plan D-05).
 */
export function importedNames(
  program: Program
): Map<string, { source: string; imported: string }> {
  const names = new Map<string, { source: string; imported: string }>()
  for (const statement of program.body) {
    if (statement.type !== "ImportDeclaration") continue
    for (const specifier of statement.specifiers) {
      const imported =
        specifier.type === "ImportSpecifier"
          ? specifier.imported.type === "Identifier"
            ? specifier.imported.name
            : String(specifier.imported.value)
          : specifier.type === "ImportDefaultSpecifier"
            ? "default"
            : "*"
      names.set(specifier.local.name, {
        source: statement.source.value,
        imported,
      })
    }
  }
  return names
}

/** The property of an object literal by name, if present. */
export function property(node: unknown, name: string): Node | undefined {
  const n = node as Node | undefined
  if (n?.type !== "ObjectExpression") return undefined
  for (const p of n.properties as Array<Node>) {
    if (p.type !== "Property") continue
    const key = p.key as Node & { name?: string }
    const keyName = key.type === "Identifier" ? key.name : literalValue(key)
    if (keyName === name) return p.value as Node
  }
  return undefined
}

type Callee = Node & { name?: string; property?: Node & { name?: string } }

/** Every call `name(...)` or `x.name(...)` in a program. */
export function calls(program: Program, name: string): Array<Node> {
  const found: Array<Node> = []
  new Visitor({
    CallExpression(node) {
      const callee = node.callee as Callee
      if (
        (callee.type === "Identifier" && callee.name === name) ||
        (callee.type === "MemberExpression" && callee.property?.name === name)
      ) {
        found.push(node as unknown as Node)
      }
    },
  }).visit(program)
  return found
}

/** Every call `x.name(...)` in a program: a method, not a plain function. */
export const memberCalls = (program: Program, name: string) =>
  calls(program, name).filter(
    (call) => (call.callee as Node).type === "MemberExpression"
  )
