import { MockLanguageModelV4 } from "ai/test"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import { readAnalysis, readExplanation, readResult } from "@workspace/database"
import { detectFrameworks } from "@workspace/frameworks"
import { isTooLarge, parseRepository } from "@workspace/parser"
import { makeRepository } from "@workspace/parser/testing"

import type * as Ai from "@workspace/ai"

import { MAX_CHAT_BODY, handleChat } from "./chat.server"
import { readSession } from "./session.server"

vi.mock("@tanstack/react-start/server-only", () => ({}))
vi.mock("./session.server", () => ({ readSession: vi.fn() }))
vi.mock("./storage.server", () => ({
  requestStorage: () => Promise.resolve({}),
}))
vi.mock("./env.server", () => ({
  getServerEnv: () => ({ GEMINI_API_KEY: "key" }),
}))
vi.mock("@workspace/database", () => ({
  readAnalysis: vi.fn(),
  readResult: vi.fn(),
  readExplanation: vi.fn(),
}))
const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}
const model = new MockLanguageModelV4({
  doGenerate: [
    {
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "explanation",
          input: JSON.stringify({ path: "lib/app.js" }),
        },
      ],
      finishReason: { unified: "tool-calls", raw: undefined },
      usage,
      warnings: [],
    },
    {
      content: [{ type: "text", text: "`lib/app.js` makes the app." }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    },
  ],
})
vi.mock("@workspace/ai", async (actual) => ({
  ...(await actual<typeof Ai>()),
  languageModel: () => model,
}))

// A real repository, parsed and detected, stored as a run stores it.
const repository = makeRepository({
  "package.json": '{ "name": "demo" }',
  "index.js": "require('./lib/app.js')\n",
  "lib/app.js": "module.exports = function app() {}\n",
})
const parsed = parseRepository(repository.directory)
if (isTooLarge(parsed)) throw new Error("tiny repository is too large")
afterAll(() => repository.remove())

const ANALYSIS = "0d7e8a3e-5f63-4a39-9b4e-2f3c1d1e9a10"
const ask = (body: string, analysisId = ANALYSIS) =>
  handleChat(
    new Request(`https://cartograph.test/api/analyses/${analysisId}/chat`, {
      method: "POST",
      body,
    }),
    analysisId
  )
const conversation = JSON.stringify({
  messages: [
    {
      id: "q1",
      role: "user",
      parts: [{ type: "text", text: "What is lib/app.js?" }],
    },
  ],
})

beforeEach(() => {
  vi.mocked(readSession).mockResolvedValue({
    signedIn: true,
    userId: "user_1",
    organization: { id: "org_session", name: "Acme", admin: false },
  })
  vi.mocked(readAnalysis).mockResolvedValue({
    id: ANALYSIS,
    repository: "owner/demo",
    latestRun: null,
  })
  vi.mocked(readResult).mockResolvedValue({
    commit: "c".repeat(40),
    parsed,
    detection: detectFrameworks(repository.directory, parsed),
    storedAt: "t",
  })
  vi.mocked(readExplanation).mockResolvedValue({
    body: "Exports the app.",
  } as Awaited<ReturnType<typeof readExplanation>>)
})

describe("the chat route (spec 010, plan D-02, D-03)", () => {
  it("answers as a stream, from lookups in the stored analysis", async () => {
    const response = await ask(conversation)
    expect(response.status).toBe(200)
    const text = await response.text()
    // The lookup, then the answer, then how it ended.
    expect(text.indexOf("tool-output-available")).toBeLessThan(
      text.indexOf("`lib/app.js` makes the app.")
    )
    expect(text).toContain("Exports the app.")
    expect(text).toContain('"kind":"answered"')
  })

  it("refuses someone signed out", async () => {
    vi.mocked(readSession).mockResolvedValue({ signedIn: false })
    expect((await ask(conversation)).status).toBe(401)
  })

  // C-02 of 007: another organization's analysis is simply not there.
  it("finds no analysis the member's token can't read", async () => {
    vi.mocked(readAnalysis).mockResolvedValue(null)
    expect((await ask(conversation)).status).toBe(404)
    expect((await ask(conversation, "not-a-uuid")).status).toBe(404)
  })

  it("refuses what isn't a conversation, or is too long", async () => {
    expect((await ask("{")).status).toBe(400)
    expect((await ask(JSON.stringify({ messages: [] }))).status).toBe(400)
    expect((await ask("x".repeat(MAX_CHAT_BODY + 1))).status).toBe(413)
  })
})
