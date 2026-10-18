// The cases and their facts (spec 011, FR-001, FR-002, plan D-04): each
// subject chosen by a rule and each fact derived from the pinned analysis's
// edges, never written by hand. Pure: the same analyses give the same
// cases, so a test derives them again and compares (AC-06).
import { buildBoxes, cycles, walk } from "@workspace/graph"
import { compareText } from "@workspace/parser/paths"

import type { Analysis, Pin } from "./analysis.ts"

/** The most facts an explanation can be asked to hold (plan Thresholds). */
export const EXPLANATION_FACTS_MAX = 4

/** The most facts a question's answer can be asked to hold. */
export const QUESTION_FACTS_MAX = 6

/** How a case's facts were derived: the rule, named. */
export type Rule =
  | "neighbours"
  | "importers"
  | "blast_radius"
  | "dependency_chain"
  | "dependents"
  | "route"
  | "cycles"
  | "declined"

export type Case = Pin & { id: string; facts: Array<string>; rule: Rule } & (
    | { kind: "file"; path: string }
    | { kind: "box"; folder: string }
    | { kind: "question"; question: string }
  )

const sorted = (paths: Iterable<string>) =>
  [...new Set(paths)].sort(compareText)

/** `count` of `items`, spread evenly through them, so picks don't cluster. */
function spread<TItem>(
  items: ReadonlyArray<TItem>,
  count: number
): Array<TItem> {
  if (items.length <= count) return [...items]
  return Array.from(
    { length: count },
    (_, i) => items[Math.floor((i * items.length) / count)] as TItem
  )
}

/** What a rule's subject needs: between `min` and `max` facts. */
const fits = (facts: ReadonlyArray<string>, min: number, max: number) =>
  facts.length >= min && facts.length <= max

/** A file's neighbours, both ways: what its explanation should name. */
const neighbours = (analysis: Analysis, path: string) =>
  sorted([
    ...(analysis.index.dependencies.get(path) ?? []),
    ...(analysis.index.dependents.get(path) ?? []),
  ])

/** Files the analysis has, in path order. */
const paths = (analysis: Analysis) =>
  analysis.input.files.map((file) => file.path).sort(compareText)

/** File cases: subjects with 2 to `EXPLANATION_FACTS_MAX` neighbours. */
function fileCases(analysis: Analysis, count: number): Array<Case> {
  const eligible = paths(analysis).filter((path) =>
    fits(neighbours(analysis, path), 2, EXPLANATION_FACTS_MAX)
  )
  return spread(eligible, count).map((path) => ({
    ...pinOf(analysis),
    id: `${analysis.repository}:file:${path}`,
    kind: "file",
    path,
    facts: neighbours(analysis, path),
    rule: "neighbours",
  }))
}

/** A box's importers: files outside it with an edge to a file in it. */
function importers(analysis: Analysis, files: ReadonlyArray<string>) {
  const inBox = new Set(files)
  return sorted(
    analysis.input.edges
      .filter((edge) => inBox.has(edge.to) && !inBox.has(edge.from))
      .map((edge) => edge.from)
  )
}

/** Box cases: the map's own boxes, not the root, with 1 to 4 importers. */
function boxCases(analysis: Analysis, count: number): Array<Case> {
  const eligible = buildBoxes(analysis.input.files, analysis.input.edges)
    .boxes.filter((box) => box.id !== "")
    .filter((box) =>
      fits(importers(analysis, box.files), 1, EXPLANATION_FACTS_MAX)
    )
    .sort((a, b) => compareText(a.id, b.id))
  return spread(eligible, count).map((box) => ({
    ...pinOf(analysis),
    id: `${analysis.repository}:box:${box.id}`,
    kind: "box",
    folder: box.id,
    facts: importers(analysis, box.files),
    rule: "importers",
  }))
}

/** A question, its facts, and the rule behind them. */
function question(
  analysis: Analysis,
  rule: Rule,
  text: string,
  facts: Array<string>
): Case {
  return {
    ...pinOf(analysis),
    id: `${analysis.repository}:${rule}:${text}`,
    kind: "question",
    question: text,
    facts,
    rule,
  }
}

/** Questions about a file whose walk has 2 to `QUESTION_FACTS_MAX` files. */
function walkQuestions(
  analysis: Analysis,
  rule: "blast_radius" | "dependency_chain" | "dependents",
  count: number
): Array<Case> {
  const factsOf = (path: string) =>
    rule === "dependents"
      ? sorted(analysis.index.dependents.get(path) ?? [])
      : sorted(
          walk(
            analysis.index,
            path,
            rule === "blast_radius" ? "dependents" : "dependencies"
          ).flat()
        )
  const text = (path: string) =>
    rule === "blast_radius"
      ? `What breaks if \`${path}\` changes?`
      : rule === "dependency_chain"
        ? `What does \`${path}\` depend on, all the way down?`
        : `Which files import \`${path}\`?`
  const eligible = paths(analysis).filter((path) =>
    fits(factsOf(path), 2, QUESTION_FACTS_MAX)
  )
  return spread(eligible, count).map((path) =>
    question(analysis, rule, text(path), factsOf(path))
  )
}

/** Questions about a route: the file that handles it is the fact. */
function routeQuestions(analysis: Analysis, count: number): Array<Case> {
  const routes = [...analysis.input.routes].sort(
    (a, b) => compareText(a.path, b.path) || compareText(a.method, b.method)
  )
  return spread(routes, count).map((route) =>
    question(
      analysis,
      "route",
      `Which file handles \`${route.method} ${route.path}\`?`,
      [route.file]
    )
  )
}

/** The cycles question, when the files on cycles fit an answer. */
function cycleQuestions(analysis: Analysis): Array<Case> {
  const files = sorted(cycles(analysis.input.edges).flat())
  return fits(files, 2, QUESTION_FACTS_MAX)
    ? [
        question(
          analysis,
          "cycles",
          "Are there any import cycles in this repository?",
          files
        ),
      ]
    : []
}

/** Questions about nothing in the repository: the answer is to decline. */
const OFF_TOPIC = [
  "What is a closure in JavaScript?",
  "Write me a short poem about the sea.",
]

const pinOf = ({ repository, commit }: Analysis): Pin => ({
  repository,
  commit,
})

/**
 * The case set (spec 011, FR-001): 6 files and 2 boxes to explain, and 20
 * questions, drawn from the three analyses in `PINS` order.
 */
export function deriveCases(
  analyses: readonly [Analysis, Analysis, Analysis]
): Array<Case> {
  const [express, commerce, nest] = analyses
  return [
    ...analyses.flatMap((analysis) => fileCases(analysis, 2)),
    ...boxCases(express, 1),
    ...boxCases(commerce, 1),
    ...walkQuestions(express, "blast_radius", 2),
    ...walkQuestions(commerce, "blast_radius", 3),
    ...walkQuestions(nest, "blast_radius", 3),
    ...analyses.flatMap((analysis) =>
      walkQuestions(analysis, "dependency_chain", 1)
    ),
    ...analyses.flatMap((analysis) => walkQuestions(analysis, "dependents", 1)),
    ...routeQuestions(commerce, 1),
    ...routeQuestions(nest, 2),
    ...cycleQuestions(nest),
    question(express, "declined", OFF_TOPIC[0] ?? "", []),
    question(commerce, "declined", OFF_TOPIC[1] ?? "", []),
  ]
}
