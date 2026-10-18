import { APICallError } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it } from "vitest"

import { PINS, analyse } from "./analysis.ts"
import { committedCases } from "./cases.ts"
import type { Case } from "./facts.ts"
import { UNAVAILABLE_RETRIES, runCase, runCases } from "./run.ts"

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}
const says = (text: string) => ({
  content: [{ type: "text" as const, text }],
  finishReason: { unified: "stop" as const, raw: undefined },
  usage,
  warnings: [],
})
const calls = (toolName: string, input: object) => ({
  content: [
    {
      type: "tool-call" as const,
      toolCallId: "call-1",
      toolName,
      input: JSON.stringify(input),
    },
  ],
  finishReason: { unified: "tool-calls" as const, raw: undefined },
  usage,
  warnings: [],
})

/** A mock model that answers in turn, the way the real one is called. */
const model = (
  turns: Array<ReturnType<typeof says> | ReturnType<typeof calls>>
) =>
  new MockLanguageModelV4({
    doGenerate: () => {
      const next = turns.shift()
      if (next === undefined) throw new Error("no more turns")
      return Promise.resolve(next)
    },
  })

const traced = <TArgs extends Array<unknown>, TResult>(
  _name: string,
  fn: (...args: TArgs) => TResult
) => fn

const naming = (paths: ReadonlyArray<string>) =>
  paths.map((path) => `\`${path}\``).join(", ")

const express = PINS[0]
const first = <TKind extends Case["kind"]>(kind: TKind, rule?: Case["rule"]) =>
  committedCases().find(
    (c): c is Extract<Case, { kind: TKind }> =>
      c.kind === kind &&
      c.repository === express?.repository &&
      (rule === undefined || c.rule === rule)
  )

describe("running the cases (spec 011, plan D-06)", () => {
  it("explains a file through the shipping code, and scores it", async () => {
    if (express === undefined) throw new Error("no pin")
    const analysis = await analyse(express)
    const c = first("file")
    if (c === undefined) throw new Error("no file case")
    const answer = JSON.stringify({
      body: `Used by ${naming(c.facts)}.`,
      inferredRole: null,
    })
    const result = await runCase(c, analysis, {
      explainModel: model([says(answer)]),
      chatModel: model([]),
      traced,
    })
    expect(result).toMatchObject({
      ended: "explained",
      scores: { grounded: 1, coverage: 1 },
    })
  }, 60_000)

  it("asks a question, reads its lookups from the stream, and scores it", async () => {
    if (express === undefined) throw new Error("no pin")
    const analysis = await analyse(express)
    const c = first("question", "blast_radius")
    if (c === undefined) throw new Error("no question case")
    const subject = /`([^`]+)`/.exec(c.question)?.[1] ?? ""
    const result = await runCase(c, analysis, {
      explainModel: model([]),
      chatModel: model([
        calls("blast_radius", { path: subject }),
        says(`It breaks ${naming(c.facts)}.`),
      ]),
      traced,
    })
    expect(result).toMatchObject({
      ended: "answered",
      scores: { grounded: 1, coverage: 1, lookupUse: 1 },
    })
  }, 60_000)

  // Plan D-05: the chat refused both answers, so no invented file was
  // shown; the refusal covers nothing, so it still costs.
  it("scores a refused answer as grounded, covering nothing", async () => {
    if (express === undefined) throw new Error("no pin")
    const analysis = await analyse(express)
    const c = first("question", "blast_radius")
    if (c === undefined) throw new Error("no question case")
    const subject = /`([^`]+)`/.exec(c.question)?.[1] ?? ""
    // Two answers naming a ghost: the chat refuses both (`010` FR-006).
    const result = await runCase(c, analysis, {
      explainModel: model([]),
      chatModel: model([
        calls("blast_radius", { path: subject }),
        says("It breaks `lib/ghost.js`."),
        says("It breaks `lib/phantom.js`."),
      ]),
      traced,
    })
    expect(result).toMatchObject({
      ended: "ungrounded",
      scores: { grounded: 1, coverage: 0, lookupUse: 0 },
    })
  }, 60_000)

  // Google: retry transient errors (408, 5xx) with backoff; a 503 is the
  // model's server being busy, not an answer, so the case is tried again.
  it("tries a case again when the model is unavailable, then scores it", async () => {
    if (express === undefined) throw new Error("no pin")
    const analysis = await analyse(express)
    const c = first("file")
    if (c === undefined) throw new Error("no file case")
    const answer = JSON.stringify({
      body: `Used by ${naming(c.facts)}.`,
      inferredRole: null,
    })
    let tries = 0
    const flaky = new MockLanguageModelV4({
      doGenerate: () => {
        tries += 1
        if (tries === 1) {
          throw new APICallError({
            message: "This model is currently experiencing high demand.",
            url: "u",
            requestBodyValues: {},
            statusCode: 503,
          })
        }
        return Promise.resolve(says(answer))
      },
    })
    const waits: Array<number> = []
    const [result] = await runCases(
      [c],
      [analysis],
      { explainModel: flaky, chatModel: model([]), traced },
      undefined,
      (ms) => {
        waits.push(ms)
        return Promise.resolve()
      }
    )
    expect(result).toMatchObject({
      ended: "explained",
      scores: { coverage: 1 },
    })
    expect(waits).toHaveLength(1)
    expect(waits[0]).toBeGreaterThanOrEqual(12_000)
    expect(UNAVAILABLE_RETRIES).toBe(3)
  }, 60_000)
})
