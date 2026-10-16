import { compareText } from "@workspace/parser/paths"

import type { MapEdge } from "./input.ts"

/**
 * Which way a walk follows the edges: to a file's dependents, for its blast
 * radius, or to its dependencies, for its dependency chain (spec 004).
 */
export type Direction = "dependents" | "dependencies"

/** Each file's dependencies and dependents, one edge away, by path. */
export type EdgeIndex = Record<
  Direction,
  ReadonlyMap<string, ReadonlyArray<string>>
>

/** Files reached by a walk, by level: `levels[0]` is one edge away. */
export type Levels = Array<Array<string>>

/**
 * Indexes the edges both ways, once per map, so a walk costs only the files
 * it reaches. Type-only edges count like any other (C-05).
 */
export function edgeIndex(edges: ReadonlyArray<MapEdge>): EdgeIndex {
  const dependencies = new Map<string, Array<string>>()
  const dependents = new Map<string, Array<string>>()
  const add = (index: Map<string, Array<string>>, key: string, to: string) => {
    const list = index.get(key)
    if (list) list.push(to)
    else index.set(key, [to])
  }
  for (const { from, to } of edges) {
    add(dependencies, from, to)
    add(dependents, to, from)
  }
  for (const list of [...dependencies.values(), ...dependents.values()]) {
    list.sort(compareText)
  }
  return { dependencies, dependents }
}

/**
 * Blast radius and dependency chain, as one walk (FR-017, C-03): breadth
 * first from `start` in `direction`, through every level unless `depth`
 * stops it. Each file is listed once, at the first level it's reached, so a
 * cycle ends when every file in it has been seen, and `start` never appears
 * (FR-018). Each level is in path order.
 */
export function walk(
  index: EdgeIndex,
  start: string,
  direction: Direction,
  depth = Infinity
): Levels {
  const next = index[direction]
  const seen = new Set([start])
  const levels: Levels = []
  let frontier = [start]
  while (levels.length < depth) {
    const level: Array<string> = []
    for (const file of frontier) {
      for (const reached of next.get(file) ?? []) {
        if (seen.has(reached)) continue
        seen.add(reached)
        level.push(reached)
      }
    }
    if (level.length === 0) break
    levels.push(level.sort(compareText))
    frontier = level
  }
  return levels
}
