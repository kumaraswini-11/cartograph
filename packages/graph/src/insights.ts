import { UNIDENTIFIED } from "@workspace/frameworks/taxonomy"
import { compareText } from "@workspace/parser/paths"

import { countOf } from "./boxes.ts"
import { HEAVY_FAN_IN, OVERSIZED_LINES } from "./limits.ts"
import type { MapEdge, MapFile } from "./input.ts"

/**
 * A fact about the edges, never a score or a verdict (CONTEXT.md: Insight;
 * spec 005). A cycle's files are in order, its first-sorting file first.
 */
export type Insight =
  | { kind: "unimported"; file: string }
  | { kind: "heavily imported"; file: string; fanIn: number }
  | { kind: "cycle"; files: Array<string> }
  | { kind: "oversized"; file: string; lines: number }

/** A piece of a fixed sentence: words, or a file someone can choose. */
export type SentencePart = string | { file: string }

const byPath = (a: MapFile, b: MapFile) => compareText(a.path, b.path)

/**
 * Every insight (FR-001 to FR-007): unimported files, heavily imported
 * files, cycles, then oversized files, each kind in path order. Computed
 * from the files and edges alone, the same every time (C-01).
 */
export function insights(input: {
  files: ReadonlyArray<MapFile>
  edges: ReadonlyArray<MapEdge>
}): Array<Insight> {
  const files = [...input.files].sort(byPath)
  return [
    // A file no convention identifies is reached by tools as often as not,
    // so that nothing imports it says nothing about it (C-02).
    ...files
      .filter((f) => f.fanIn === 0 && !f.entryPoint && f.role !== UNIDENTIFIED)
      .map((f): Insight => ({ kind: "unimported", file: f.path })),
    ...files
      .filter((f) => f.fanIn >= HEAVY_FAN_IN)
      .map((f): Insight => ({
        kind: "heavily imported",
        file: f.path,
        fanIn: f.fanIn,
      })),
    ...cycles(input.edges).map((c): Insight => ({ kind: "cycle", files: c })),
    ...files
      .filter((f) => f.lines >= OVERSIZED_LINES)
      .map((f): Insight => ({
        kind: "oversized",
        file: f.path,
        lines: f.lines,
      })),
  ]
}

/**
 * The cycles of runtime edges (FR-005, plan D-03): in each strongly
 * connected group, shortest cycles until every file of the group is on
 * one, each listed from its first-sorting file and named once; a file that
 * imports itself is a cycle of one. Type-only edges don't count. Iterative
 * throughout, so no repository is deep enough to overflow the call stack
 * (C-03). Ordered by their files.
 */
export function cycles(edges: ReadonlyArray<MapEdge>): Array<Array<string>> {
  const next = new Map<string, Array<string>>()
  for (const { from, to, typeOnly } of edges) {
    if (typeOnly) continue
    const list = next.get(from)
    if (list) list.push(to)
    else next.set(from, [to])
  }
  for (const list of next.values()) list.sort(compareText)

  const found = new Map<string, Array<string>>()
  for (const group of stronglyConnected(next)) {
    const members = [...group].sort(compareText)
    const [only] = members
    if (members.length === 1) {
      if (only !== undefined && (next.get(only) ?? []).includes(only)) {
        found.set(only, [only])
      }
      continue
    }
    // Until every file of the group is on a cycle named: the shortest
    // cycle through the first file not yet on one, from its first file.
    const named = new Set<string>()
    for (const file of members) {
      if (named.has(file)) continue
      const cycle = shortestCycle(file, group, next)
      if (!cycle) continue
      const from = cycle.indexOf([...cycle].sort(compareText)[0] ?? file)
      const listed = [...cycle.slice(from), ...cycle.slice(0, from)]
      found.set(listed.join("\0"), listed)
      for (const member of cycle) named.add(member)
    }
  }
  return [...found.values()].sort((a, b) =>
    compareText(a.join("\0"), b.join("\0"))
  )
}

/** Tarjan's strongly connected groups, with an explicit stack (C-03). */
function stronglyConnected(
  next: ReadonlyMap<string, ReadonlyArray<string>>
): Array<Set<string>> {
  const nodes = [
    ...new Set([...next.keys(), ...[...next.values()].flat()]),
  ].sort(compareText)
  const order = new Map<string, number>()
  const low = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: Array<string> = []
  const groups: Array<Set<string>> = []
  let counter = 0

  for (const root of nodes) {
    if (order.has(root)) continue
    // Each frame: a node and how many of its successors it has visited.
    const work: Array<[string, number]> = [[root, 0]]
    order.set(root, counter)
    low.set(root, counter)
    counter++
    stack.push(root)
    onStack.add(root)
    while (work.length > 0) {
      const frame = work[work.length - 1]
      if (!frame) break
      const [node, i] = frame
      const successor = (next.get(node) ?? [])[i]
      if (successor !== undefined) {
        frame[1] = i + 1
        if (!order.has(successor)) {
          order.set(successor, counter)
          low.set(successor, counter)
          counter++
          stack.push(successor)
          onStack.add(successor)
          work.push([successor, 0])
        } else if (onStack.has(successor)) {
          low.set(node, Math.min(low.get(node) ?? 0, order.get(successor) ?? 0))
        }
        continue
      }
      work.pop()
      const parent = work[work.length - 1]
      if (parent) {
        low.set(
          parent[0],
          Math.min(low.get(parent[0]) ?? 0, low.get(node) ?? 0)
        )
      }
      if (low.get(node) === order.get(node)) {
        const group = new Set<string>()
        let member: string | undefined
        do {
          member = stack.pop()
          if (member === undefined) break
          onStack.delete(member)
          group.add(member)
        } while (member !== node)
        groups.push(group)
      }
    }
  }
  return groups
}

/** The shortest cycle from `start` back to it, inside its group (BFS). */
function shortestCycle(
  start: string,
  group: ReadonlySet<string>,
  next: ReadonlyMap<string, ReadonlyArray<string>>
): Array<string> | undefined {
  const parent = new Map<string, string>()
  const queue = [start]
  // An array's iterator also visits what's pushed while it runs: a queue.
  for (const node of queue) {
    for (const successor of next.get(node) ?? []) {
      if (!group.has(successor)) continue
      if (successor === start) {
        const cycle = [node]
        for (let at = node; at !== start;) {
          const previous = parent.get(at)
          if (previous === undefined) break
          cycle.push(previous)
          at = previous
        }
        return cycle.reverse()
      }
      if (parent.has(successor)) continue
      parent.set(successor, node)
      queue.push(successor)
    }
  }
  return undefined
}

/**
 * An insight's fixed sentence (FR-006), as parts: words, and the files
 * named in it, which the detail pane lets someone choose (FR-009). The
 * parts joined are exactly the spec's sentence.
 */
export function sentenceOf(insight: Insight): Array<SentencePart> {
  switch (insight.kind) {
    case "unimported":
      return [
        "No file imports ",
        { file: insight.file },
        ", and it isn't an entry point.",
      ]
    case "heavily imported":
      return [
        `${countOf(insight.fanIn, "file", "files")} import `,
        { file: insight.file },
        ".",
      ]
    case "cycle": {
      const [first] = insight.files
      const loop =
        first === undefined ? insight.files : [...insight.files, first]
      return [
        `A cycle of ${countOf(insight.files.length, "file", "files")}: `,
        ...loop.flatMap((file, i): Array<SentencePart> =>
          i === 0 ? [{ file }] : [" → ", { file }]
        ),
        ".",
      ]
    }
    case "oversized":
      return [
        { file: insight.file },
        ` has ${countOf(insight.lines, "line", "lines")}.`,
      ]
  }
}

/** A sentence as plain text, files as their paths. */
export const sentenceText = (parts: ReadonlyArray<SentencePart>) =>
  parts.map((part) => (typeof part === "string" ? part : part.file)).join("")
