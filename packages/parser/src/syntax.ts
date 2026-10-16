// Reading syntax the way the parser does: one language rule, one line count,
// one meaning of a literal. Exported at `@workspace/parser/syntax` so later
// readers of the same files (spec 002) agree with the parser.
import { parseSync } from "oxc-parser"

export type AstNode = { type: string; start: number }
export type Literalish = AstNode & {
  value?: unknown
  quasis?: Array<{ value: { cooked?: string | null; raw: string } }>
  expressions?: Array<unknown>
}

/** Parses one file with oxc's parser, choosing its language by extension. */
export function parseSource(path: string, source: string) {
  // .js, .mjs and .cjs files often hold JSX, so they're parsed as JSX,
  // which accepts every valid JavaScript program as well.
  const lang = /\.(c|m)?js$/.test(path) ? "jsx" : undefined
  return parseSync(path, source, lang ? { lang } : {})
}

/** The string a literal or an expression-free template holds, if any. */
export function literalValue(node: Literalish | undefined): string | undefined {
  if (node?.type === "Literal" && typeof node.value === "string")
    return node.value
  if (node?.type === "TemplateLiteral" && node.expressions?.length === 0) {
    const quasi = node.quasis?.[0]?.value
    return quasi?.cooked ?? quasi?.raw
  }
  return undefined
}

/** Maps a UTF-16 offset (oxc's spans) to a 1-based line number. */
export function lineFinder(source: string): (offset: number) => number {
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
