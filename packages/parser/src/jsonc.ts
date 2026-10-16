// JSON as the packages read and write it: one source for reading
// configuration (with comments, as tsconfig.json allows), telling an object
// from other values, and writing and checking results. Exported at
// `@workspace/parser/json`.
import { readFileSync, writeFileSync } from "node:fs"

import { parseSync } from "oxc-parser"
import type { z } from "zod"

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | Array<JsonValue>
  | { [key: string]: JsonValue }

type Expression = {
  type: string
  value?: unknown
  elements?: Array<Expression | null>
  properties?: Array<{
    type: string
    key: Expression & { name?: string }
    value: Expression
  }>
  argument?: Expression
  operator?: string
}

/** Converts a literal-only expression (what JSON can hold) to its value. */
function toValue(node: Expression): JsonValue | undefined {
  switch (node.type) {
    case "Literal":
      return node.value as JsonValue
    case "ArrayExpression":
      return (node.elements ?? []).map((e) => (e ? (toValue(e) ?? null) : null))
    case "ObjectExpression": {
      const object: { [key: string]: JsonValue } = {}
      for (const property of node.properties ?? []) {
        if (property.type !== "Property") return undefined
        const key =
          property.key.type === "Identifier"
            ? property.key.name
            : String(property.key.value)
        const value = toValue(property.value)
        if (key === undefined || value === undefined) return undefined
        object[key] = value
      }
      return object
    }
    case "UnaryExpression":
      if (node.operator === "-" && node.argument?.type === "Literal") {
        return -(node.argument.value as number)
      }
      return undefined
    default:
      return undefined
  }
}

/**
 * Reads JSON with comments and trailing commas, as `tsconfig.json` allows,
 * by parsing it as a JavaScript expression with oxc. Returns undefined for a
 * file that's missing or isn't such a value.
 */
export function readJsonc(path: string): JsonValue | undefined {
  let text: string
  try {
    text = readFileSync(path, "utf8")
  } catch {
    return undefined
  }
  const parsed = parseSync("config.js", `(${text}\n)`)
  if (parsed.errors.length > 0) return undefined
  const [statement] = parsed.program.body as unknown as Array<{
    type: string
    expression?: Expression
  }>
  if (statement?.type !== "ExpressionStatement" || !statement.expression)
    return undefined
  const expression =
    statement.expression.type === "ParenthesizedExpression"
      ? (statement.expression as unknown as { expression: Expression })
          .expression
      : statement.expression
  return toValue(expression)
}

export type JsonObject = { [key: string]: JsonValue }

/** True for a plain object: not null, not an array. */
export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Writes `value` as JSON: the same bytes for the same value (spec 001, FR-021). */
export function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

/** Reads JSON written by `writeJson`, checking it against `schema`. */
export function readJson<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema
): z.infer<TSchema> {
  return schema.parse(JSON.parse(readFileSync(path, "utf8")))
}
