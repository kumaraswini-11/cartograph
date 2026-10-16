import { readFileSync } from "node:fs"

import { parseSync } from "oxc-parser"

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

export function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
