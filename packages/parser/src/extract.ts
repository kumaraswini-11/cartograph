import { Visitor } from "oxc-parser"

import type { ImportKind } from "./result.ts"
import { lineFinder, literalValue, parseSource } from "./syntax.ts"
import type { AstNode, Literalish } from "./syntax.ts"

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

type WithKind = { importKind?: string; exportKind?: string }

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

/**
 * Reads every import in one file with oxc's parser (FR-008, FR-009): static
 * imports, re-exports, dynamic imports and `require()` calls. A file that
 * doesn't parse returns its first error instead (FR-004).
 */
export function extractImports(path: string, source: string): Extraction {
  const parsed = parseSource(path, source)
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
