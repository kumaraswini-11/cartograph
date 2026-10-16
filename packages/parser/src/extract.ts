import { parseSync, Visitor } from "oxc-parser"

import type { ImportKind } from "./result.ts"

/** One import as written in a file, before it's resolved. */
export type ExtractedImport = {
  line: number
  /** The module as written; "" when the argument isn't a literal. */
  specifier: string
  kind: ImportKind
  /** Exists only at compile time (spec 001, FR-010). */
  typeOnly: boolean
  /** False for `import(name)` or `require(name)` (FR-014). */
  literal: boolean
}

export type Extraction = { imports: Array<ExtractedImport> } | { error: string }

type AstNode = { type: string; start: number }
type Literalish = AstNode & {
  value?: unknown
  quasis?: Array<{ value: { cooked?: string | null; raw: string } }>
  expressions?: Array<unknown>
}
type WithKind = { importKind?: string; exportKind?: string }

/** The string a literal or an expression-free template holds, if any. */
function literalValue(node: Literalish | undefined): string | undefined {
  if (node?.type === "Literal" && typeof node.value === "string")
    return node.value
  if (node?.type === "TemplateLiteral" && node.expressions?.length === 0) {
    const quasi = node.quasis?.[0]?.value
    return quasi?.cooked ?? quasi?.raw
  }
  return undefined
}

/**
 * Type-only when the declaration says so (`import type`, `export type`), or
 * when every name it imports or exports is marked `type`.
 */
function isTypeOnly(
  declaration: WithKind,
  specifiers: ReadonlyArray<object>,
  key: "importKind" | "exportKind"
): boolean {
  if (declaration[key] === "type") return true
  // A default or namespace import has no kind of its own: it's a value.
  return (
    specifiers.length > 0 &&
    specifiers.every((s) => (s as WithKind)[key] === "type")
  )
}

/** Maps a UTF-16 offset (oxc's spans) to a 1-based line number. */
function lineFinder(source: string): (offset: number) => number {
  const starts = [0]
  for (
    let i = source.indexOf("\n");
    i !== -1;
    i = source.indexOf("\n", i + 1)
  ) {
    starts.push(i + 1)
  }
  return (offset) => {
    let low = 0
    let high = starts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if ((starts[mid] ?? 0) <= offset) low = mid
      else high = mid - 1
    }
    return low + 1
  }
}

/**
 * Reads every import in one file with oxc's parser (FR-008, FR-009): static
 * imports, re-exports, dynamic imports and `require()` calls. A file that
 * doesn't parse returns its first error instead (FR-004).
 */
export function extractImports(path: string, source: string): Extraction {
  // .js, .mjs and .cjs files often hold JSX (React), so they're parsed as JSX,
  // which accepts every valid JavaScript program as well.
  const lang = /\.(c|m)?js$/.test(path) ? "jsx" : undefined
  const parsed = parseSync(path, source, lang ? { lang } : {})
  const [firstError] = parsed.errors
  if (firstError !== undefined) return { error: firstError.message }

  const lineOf = lineFinder(source)
  const imports: Array<ExtractedImport> = []
  const add = (
    node: AstNode,
    from: Literalish | undefined,
    kind: ImportKind,
    typeOnly: boolean
  ) => {
    const value = literalValue(from)
    imports.push({
      line: lineOf(node.start),
      specifier: value ?? "",
      kind,
      typeOnly,
      literal: value !== undefined,
    })
  }

  new Visitor({
    ImportDeclaration(node) {
      add(
        node,
        node.source,
        "static",
        isTypeOnly(node, node.specifiers, "importKind")
      )
    },
    ExportNamedDeclaration(node) {
      if (node.source === null) return // `export { a }`: not an import
      add(
        node,
        node.source,
        "re-export",
        isTypeOnly(node, node.specifiers, "exportKind")
      )
    },
    ExportAllDeclaration(node) {
      add(node, node.source, "re-export", node.exportKind === "type")
    },
    ImportExpression(node) {
      add(node, node.source, "dynamic", false)
    },
    CallExpression(node) {
      const callee = node.callee as AstNode & { name?: string }
      if (callee.type !== "Identifier" || callee.name !== "require") return
      add(node, node.arguments[0], "require", false)
    },
    TSImportEqualsDeclaration(node) {
      // `import x = require("y")`: TypeScript's form of a CommonJS import.
      const reference = node.moduleReference as AstNode & {
        expression?: Literalish
      }
      if (reference.type !== "TSExternalModuleReference") return
      add(node, reference.expression, "require", node.importKind === "type")
    },
    TSImportType(node) {
      // `typeof import("y")` in a type: a compile-time import only.
      add(
        node,
        (node as unknown as { source: Literalish }).source,
        "static",
        true
      )
    },
  }).visit(parsed.program)

  return { imports: imports.sort((a, b) => a.line - b.line) }
}
