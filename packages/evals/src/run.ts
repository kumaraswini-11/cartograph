// Running the cases (spec 011, plan D-06 to D-09): each through the code
// that ships, `@workspace/ai`'s, with the cache left out, so the model is
// measured, not the cache; each source read from the unpacked archive and
// checked against the parser's hash, as production checks GitHub's.
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  answerQuestion,
  askModel,
  boxToExplain,
  explainBox,
  explainFile,
  fileToExplain,
  isUnavailable,
  pathIndex,
} from "@workspace/ai"
import type {
  AnalysisFacts,
  ChatMessage,
  ExplainDeps,
  ExplainOutcome,
  Tracing,
} from "@workspace/ai"
import type { LanguageModel, UIMessageChunk } from "ai"
import { contentHash } from "@workspace/parser"

import type { Analysis } from "./analysis.ts"
import type { Case } from "./facts.ts"
import { scoreCase } from "./score.ts"
import type { CaseScores, Output } from "./score.ts"

/** What running needs: the two models, paced, and the tracing (C-03). */
export type RunDeps = {
  /** Explanations' model (`MODEL`). */
  explainModel: LanguageModel
  /** The chat's model (`CHAT_MODEL`). */
  chatModel: LanguageModel
  traced: Tracing["traced"]
}

/** One case's result: how it ended, its scores, and how long it took. */
export type CaseResult = {
  id: string
  kind: Case["kind"]
  rule: Case["rule"]
  /** "explained", "answered", "declined", "ungrounded", "limited", "failed". */
  ended: string
  scores: CaseScores
  ms: number
}

/** An analysis as explaining reads it. */
const factsOf = (analysis: Analysis): AnalysisFacts => ({
  repository: analysis.repository,
  input: analysis.input,
  hashes: new Map(analysis.parsed.files.map((file) => [file.path, file.hash])),
  paths: pathIndex(analysis.input.files.map((file) => file.path)),
})

/**
 * A file's source from the unpacked archive, refused unless it's the bytes
 * the parser hashed (`009` plan D-04), as production's fetch is.
 */
function sourceIn(analysis: Analysis, facts: AnalysisFacts, path: string) {
  const bytes = readFileSync(join(analysis.directory, path))
  if (contentHash(bytes) !== facts.hashes.get(path)) {
    throw new Error(`${path} isn't the analysed file`)
  }
  return new TextDecoder().decode(bytes)
}

/** Every string in a lookup's output that names a file of the analysis. */
function pathsIn(value: unknown, facts: AnalysisFacts, into: Set<string>) {
  if (typeof value === "string") {
    if (facts.paths.paths.has(value)) into.add(value)
  } else if (Array.isArray(value)) {
    for (const item of value) pathsIn(item, facts, into)
  } else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) pathsIn(item, facts, into)
  }
}

/** An explanation's text, or null for anything but an explanation. */
const explained = (outcome: ExplainOutcome): Output => ({
  kind: "explanation",
  text: outcome.status === "explained" ? outcome.explanation.body : null,
})

/** A question asked as a member asks it, read from the chat's stream. */
async function ask(
  analysis: Analysis,
  facts: AnalysisFacts,
  question: string,
  deps: RunDeps
): Promise<{ output: Output; ended: string }> {
  const messages: Array<ChatMessage> = [
    { id: "q", role: "user", parts: [{ type: "text", text: question }] },
  ]
  const stream = answerQuestion(
    { input: analysis.input, index: analysis.index, paths: facts.paths },
    messages,
    {
      model: deps.chatModel,
      traced: deps.traced,
      source: (path) => Promise.resolve(sourceIn(analysis, facts, path)),
      // No cache in the evaluation (plan D-06): no explanation to read.
      explanation: () => Promise.resolve(null),
    }
  )
  const shown = new Set<string>()
  let text = ""
  let ended = "failed"
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk: UIMessageChunk = value
    if (chunk.type === "tool-output-available")
      pathsIn(chunk.output, facts, shown)
    if (chunk.type === "text-delta") text += chunk.delta
    if (chunk.type === "data-outcome") {
      ended = (chunk.data as { kind: string }).kind
    }
  }
  return {
    output: {
      kind: "answer",
      text: ended === "answered" ? text : null,
      declined: ended === "declined",
      shown,
    },
    ended,
  }
}

/**
 * One case, run and scored. Anything that goes wrong scores zero, not
 * skipped (the spec's edge case), and says so in `ended`.
 */
export async function runCase(
  c: Case,
  analysis: Analysis,
  deps: RunDeps
): Promise<CaseResult> {
  const started = performance.now()
  const facts = factsOf(analysis)
  const explainDeps: ExplainDeps = {
    traced: deps.traced,
    // No cache (plan D-06): every explanation is the model's, now.
    read: () => Promise.resolve(null),
    write: () => Promise.resolve(),
    ask: askModel(deps.explainModel),
  }
  let output: Output
  let ended: string
  try {
    if (c.kind === "question") {
      ;({ output, ended } = await ask(analysis, facts, c.question, deps))
    } else {
      const outcome =
        c.kind === "file"
          ? await explainOne(c.path, analysis, facts, explainDeps)
          : await explainBoxOf(c.folder, facts, explainDeps)
      output = explained(outcome)
      ended = outcome.status
    }
  } catch (error) {
    // A busy or failing server is said apart, so the run can try again.
    ended = isUnavailable(error) ? "unavailable" : "failed"
    if (ended === "failed") console.error(`${c.id} failed:`, error)
    output =
      c.kind === "question"
        ? { kind: "answer", text: null, declined: false, shown: new Set() }
        : { kind: "explanation", text: null }
  }
  return {
    id: c.id,
    kind: c.kind,
    rule: c.rule,
    ended,
    scores: scoreCase(output, c.facts, c.rule === "declined", facts.paths),
    ms: Math.round(performance.now() - started),
  }
}

function explainOne(
  path: string,
  analysis: Analysis,
  facts: AnalysisFacts,
  deps: ExplainDeps
): Promise<ExplainOutcome> {
  const file = fileToExplain(facts, path)
  if (file === null) throw new Error(`${path} isn't in the analysis`)
  return explainFile(file, {
    ...deps,
    source: () => Promise.resolve(sourceIn(analysis, facts, path)),
  })
}

function explainBoxOf(
  folder: string,
  facts: AnalysisFacts,
  deps: ExplainDeps
): Promise<ExplainOutcome> {
  const box = boxToExplain(facts, folder)
  if (box === null) throw new Error(`${folder} isn't a box of the analysis`)
  return explainBox(box, deps)
}

/** How often a case is tried again while the model is unavailable. */
export const UNAVAILABLE_RETRIES = 3

/** The first wait before trying again; each after is twice as long. */
const FIRST_WAIT_MS = 15_000

/**
 * The wait before the `attempt`th try again: exponential, with jitter, as
 * Google advises for transient errors (Gemini API: troubleshooting), so a
 * busy model gets 15, 30, then 60 seconds, give or take a fifth.
 */
export const backoff = (attempt: number) =>
  FIRST_WAIT_MS * 2 ** (attempt - 1) * (0.8 + Math.random() * 0.4)

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Every case, one after another: the models are paced, not raced. A case
 * the model was unavailable for is tried again, up to
 * `UNAVAILABLE_RETRIES` times; still unavailable, it scores zero as the
 * spec says, marked so.
 */
export async function runCases(
  cases: ReadonlyArray<Case>,
  analyses: ReadonlyArray<Analysis>,
  deps: RunDeps,
  onCase: (result: CaseResult) => void = () => undefined,
  wait: (ms: number) => Promise<void> = sleep
): Promise<Array<CaseResult>> {
  const byRepository = new Map(analyses.map((a) => [a.repository, a]))
  const results: Array<CaseResult> = []
  for (const c of cases) {
    const analysis = byRepository.get(c.repository)
    if (analysis === undefined) {
      throw new Error(`No analysis of ${c.repository}`)
    }
    let result = await runCase(c, analysis, deps)
    for (
      let attempt = 1;
      result.ended === "unavailable" && attempt <= UNAVAILABLE_RETRIES;
      attempt++
    ) {
      await wait(backoff(attempt))
      result = await runCase(c, analysis, deps)
    }
    onCase(result)
    results.push(result)
  }
  return results
}
