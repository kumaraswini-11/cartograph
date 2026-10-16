import type { Edge, ImportKind, ImportRecord } from "./result.ts"

/** The kinds in a fixed order, so an edge's list reads the same every time. */
const KIND_ORDER: ReadonlyArray<ImportKind> = [
  "static",
  "re-export",
  "dynamic",
  "require",
]

type ResolvedImport = Pick<ImportRecord, "from" | "to" | "kind" | "typeOnly">

/**
 * One edge per ordered pair of files, from imports that resolved to a file
 * (FR-015, FR-016). Sorted by `from`, then `to`.
 */
export function buildEdges(
  imports: ReadonlyArray<ResolvedImport>
): Array<Edge> {
  const byPair = new Map<
    string,
    { from: string; to: string; kinds: Set<ImportKind>; typeOnly: boolean }
  >()
  for (const i of imports) {
    if (i.to === undefined) continue
    const key = `${i.from}\0${i.to}`
    const edge = byPair.get(key)
    if (edge) {
      edge.kinds.add(i.kind)
      edge.typeOnly &&= i.typeOnly
    } else {
      byPair.set(key, {
        from: i.from,
        to: i.to,
        kinds: new Set([i.kind]),
        typeOnly: i.typeOnly,
      })
    }
  }
  return [...byPair.values()]
    .map((e): Edge => {
      const [first, ...rest] = KIND_ORDER.filter((k) => e.kinds.has(k))
      if (first === undefined) throw new Error("an edge has at least one kind")
      return {
        from: e.from,
        to: e.to,
        kinds: [first, ...rest],
        typeOnly: e.typeOnly,
      }
    })
    .sort((a, b) =>
      a.from !== b.from
        ? a.from < b.from
          ? -1
          : 1
        : a.to < b.to
          ? -1
          : a.to > b.to
            ? 1
            : 0
    )
}

/** Each file's fan-in (dependents) and fan-out (dependencies), from edges (FR-017). */
export function fanCounts(
  edges: ReadonlyArray<Edge>
): Map<string, { fanIn: number; fanOut: number }> {
  const counts = new Map<string, { fanIn: number; fanOut: number }>()
  const of = (path: string) => {
    let entry = counts.get(path)
    if (!entry) counts.set(path, (entry = { fanIn: 0, fanOut: 0 }))
    return entry
  }
  for (const edge of edges) {
    of(edge.from).fanOut += 1
    of(edge.to).fanIn += 1
  }
  return counts
}
