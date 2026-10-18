import { APICallError } from "ai"
import type { UIMessageChunk } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { afterAll, describe, expect, it } from "vitest"

import { detectFrameworks } from "@workspace/frameworks"
import { edgeIndex, toMapInput, walk } from "@workspace/graph"
import { isTooLarge, parseRepository } from "@workspace/parser"
import { makeRepository } from "@workspace/parser/testing"

import { pathIndex } from "../grounding.ts"
import { answerQuestion } from "./answer.ts"
import type { ChatDeps, ChatMessage } from "./answer.ts"
import { MAX_LOOKUPS, MODEL_LIST_LIMIT } from "./limits.ts"
import { forModel } from "./lookups.ts"
import type { ChatAnalysis } from "./lookups.ts"

// A real analysis: parsed and detected, as a run stores it.
const repository = makeRepository({
  "package.json": JSON.stringify({ dependencies: { next: "1" } }),
  "app/page.tsx": 'import { b } from "../lib/b"',
  "lib/b.ts": 'import { c } from "./c"\nexport const b = c',
  "lib/c.ts": "export const c = 1",
})
const parsed = parseRepository(repository.directory)
if (isTooLarge(parsed)) throw new Error("too large")
const input = toMapInput(
  { repository: "o/r", commit: "c" },
  parsed,
  detectFrameworks(repository.directory, parsed)
)
const analysis: ChatAnalysis = {
  input,
  index: edgeIndex(input.edges),
  paths: pathIndex(input.files.map((file) => file.path)),
}
afterAll(() => repository.remove())

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}
let calls = 0
/** A model turn asking for lookups. */
const lookups = (...wanted: Array<[string, object]>) => ({
  content: wanted.map(([toolName, args]) => ({
    type: "tool-call" as const,
    toolCallId: `call-${++calls}`,
    toolName,
    input: JSON.stringify(args),
  })),
  finishReason: { unified: "tool-calls" as const, raw: undefined },
  usage,
  warnings: [],
})
/** A model turn answering. */
const says = (text: string) => ({
  content: [{ type: "text" as const, text }],
  finishReason: { unified: "stop" as const, raw: undefined },
  usage,
  warnings: [],
})

const question = (text: string): Array<ChatMessage> => [
  { id: "q1", role: "user", parts: [{ type: "text", text }] },
]

/** Runs a question to its end; what streamed, the model, and the traces. */
async function run(
  turns: Array<ReturnType<typeof says> | ReturnType<typeof lookups> | Error>,
  overrides: Partial<ChatDeps> = {}
) {
  const traced: Array<string> = []
  const model = new MockLanguageModelV4({
    doGenerate: () => {
      const next = turns.shift()
      if (next === undefined) throw new Error("no more turns")
      if (next instanceof Error) throw next
      return Promise.resolve(next)
    },
  })
  const stream = answerQuestion(analysis, question("What breaks?"), {
    model,
    traced: (name, fn) => {
      traced.push(name)
      return fn
    },
    source: () => Promise.resolve("export const c = 1\n"),
    explanation: () => Promise.resolve(null),
    ...overrides,
  })
  const chunks: Array<UIMessageChunk> = []
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const outcome = chunks.find((chunk) => chunk.type === "data-outcome")
  const text = chunks.flatMap((chunk) =>
    chunk.type === "text-delta" ? [chunk.delta] : []
  )
  return { chunks, outcome, text: text.join(""), model, traced }
}

describe("the chat (spec 010)", () => {
  it("shows the lookup first, from the detail pane's walk, then the answer (FR-004, AC-04)", async () => {
    const { chunks, outcome, text } = await run([
      lookups(["blast_radius", { path: "lib/c.ts" }]),
      says("Changing it breaks `lib/b.ts` and `app/page.tsx`."),
    ])
    const types = chunks.map((chunk) => chunk.type)
    expect(types.indexOf("tool-output-available")).toBeLessThan(
      types.indexOf("text-start")
    )
    // Named as its tool is: the browser's part is `tool-blast_radius`.
    expect(
      chunks.find((chunk) => chunk.type === "tool-input-available")
    ).toMatchObject({ toolName: "blast_radius" })
    const output = chunks.find(
      (chunk) => chunk.type === "tool-output-available"
    )
    // The same walk, every level, as the detail pane's (AC-04, C-01).
    expect(output).toMatchObject({
      output: { levels: walk(analysis.index, "lib/c.ts", "dependents") },
    })
    expect(text).toBe("Changing it breaks `lib/b.ts` and `app/page.tsx`.")
    expect(outcome).toMatchObject({
      data: { kind: "answered", stopped: false },
    })
  })

  // AC-08, FR-007, C-04: with no lookup behind it, nothing is answered.
  it("gives no answer when no lookup was made", async () => {
    const { outcome, text, chunks } = await run([
      says("A closure is a function with its scope."),
    ])
    expect(text).toBe("")
    expect(chunks.some((chunk) => chunk.type.startsWith("tool-"))).toBe(false)
    expect(outcome).toMatchObject({ data: { kind: "declined" } })
  })

  // AC-02, FR-006: an answer naming an absent file is never shown.
  it("asks once more when an answer names an absent file, with no lookups offered", async () => {
    const { text, model } = await run([
      lookups(["neighbours", { path: "lib/b.ts" }]),
      says("It uses `lib/ghost.ts`."),
      says("It uses `lib/c.ts`."),
    ])
    expect(text).toBe("It uses `lib/c.ts`.")
    expect(model.doGenerateCalls[2]?.tools ?? []).toEqual([])
  })

  it("refuses a second ungrounded answer, and shows neither", async () => {
    const { text, outcome } = await run([
      lookups(["neighbours", { path: "lib/b.ts" }]),
      says("It uses `lib/ghost.ts`."),
      says("It uses `lib/phantom.ts`."),
    ])
    expect(text).toBe("")
    expect(outcome).toMatchObject({ data: { kind: "ungrounded" } })
  })

  // AC-05, FR-005: past the limit, lookups stop and the answer says so.
  it("stops at MAX_LOOKUPS, offers no more, and says it stopped", async () => {
    const many = Array.from(
      { length: MAX_LOOKUPS + 1 },
      (): [string, object] => ["find_files", { query: "lib" }]
    )
    const { chunks, outcome, model } = await run([
      lookups(...many),
      says("From `lib/b.ts`, as far as I got."),
    ])
    const shown = chunks.filter(
      (chunk) => chunk.type === "tool-input-available"
    )
    expect(shown).toHaveLength(MAX_LOOKUPS)
    expect(model.doGenerateCalls[1]?.tools ?? []).toEqual([])
    expect(outcome).toMatchObject({ data: { kind: "answered", stopped: true } })
  })

  // AC-03, FR-010: every lookup the answer relied on is its own traced run.
  it("traces the question and each lookup", async () => {
    const { traced } = await run([
      lookups(
        ["find_files", { query: "b.ts" }],
        ["dependency_chain", { path: "lib/b.ts" }]
      ),
      says("`lib/b.ts` depends on `lib/c.ts`."),
    ])
    expect(traced).toContain("chat-question")
    expect(traced).toContain("lookup:find_files")
    expect(traced).toContain("lookup:dependency_chain")
  })

  it("says the request limit is reached, keeping what was shown", async () => {
    const limit = new APICallError({
      message: "quota",
      url: "u",
      requestBodyValues: {},
      statusCode: 429,
    })
    const { outcome, text } = await run([limit])
    expect(text).toBe("")
    expect(outcome).toMatchObject({ data: { kind: "limited" } })
  })

  it("shows a failed lookup as failed, and the model is told", async () => {
    const { chunks, outcome } = await run(
      [
        lookups(["source", { path: "lib/c.ts" }]),
        says("I couldn't read `lib/c.ts`."),
      ],
      { source: () => Promise.reject(new Error("GitHub is down")) }
    )
    expect(chunks.some((chunk) => chunk.type === "tool-output-error")).toBe(
      true
    )
    expect(outcome).toMatchObject({ data: { kind: "answered" } })
  })

  it("hands the model a file's source fenced off as data (C-03)", async () => {
    const { model } = await run([
      lookups(["source", { path: "c.ts" }]),
      says("`lib/c.ts` exports a constant."),
    ])
    expect(JSON.stringify(model.doGenerateCalls[1]?.prompt)).toContain(
      "<<<SOURCE\\nexport const c = 1\\n\\nSOURCE>>>"
    )
  })
})

describe("what the model is handed (plan D-05)", () => {
  it("cuts each long list to its first paths and a count", () => {
    const paths = Array.from({ length: 60 }, (_, i) => `f${i}.ts`)
    expect(forModel({ levels: [paths] })).toEqual({
      levels: [[...paths.slice(0, MODEL_LIST_LIMIT), "…and 10 more"]],
    })
    expect(forModel({ files: ["a.ts"] })).toEqual({ files: ["a.ts"] })
  })
})
