// One session's product events (spec 012, AC-08, AC-11, plan D-02): a
// member signs in, submits an analysis whose run finishes, explains a file
// and asks a question, through the real server modules. Only PostHog's
// client is replaced, by one that records what it's given.
import { MockLanguageModelV4 } from "ai/test"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { readAnalysis, readExplanation, readResult } from "@workspace/database"
import { detectFrameworks } from "@workspace/frameworks"
import { isTooLarge, parseRepository } from "@workspace/parser"
import { makeRepository } from "@workspace/parser/testing"

import type * as Ai from "@workspace/ai"

import type * as Limits from "./limits.server"

import { submitAddress } from "./analyses.server"
import { handleChat } from "./chat.server"
import { clerkWebhookActions } from "./clerk-webhook.server"
import { explainSelection } from "./explanations.server"
import { PRODUCT_EVENTS } from "./telemetry"

const captured: Array<{
  distinctId: string
  event: string
  properties: Record<string, unknown>
}> = []
vi.mock("posthog-node", () => ({
  PostHog: class {
    captureImmediate(message: (typeof captured)[number]) {
      captured.push(message)
      return Promise.resolve()
    }
    captureExceptionImmediate() {
      return Promise.resolve()
    }
  },
}))

vi.mock("@tanstack/react-start/server-only", () => ({}))
const pending: Array<Promise<unknown>> = []
vi.mock("./background.server", () => ({
  runAfterResponse: (work: Promise<unknown>) => pending.push(work),
}))
vi.mock("./session.server", () => ({
  readSession: () =>
    Promise.resolve({
      signedIn: true,
      userId: "user_1",
      organization: { id: "org_a", name: "Acme", admin: true },
    }),
}))
vi.mock("./env.server", () => ({
  getServerEnv: () => ({
    VITE_POSTHOG_KEY: "phc_test",
    VITE_POSTHOG_HOST: "https://us.i.posthog.com",
    VITE_SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_SECRET_KEY: "sb_secret_abc",
    CLERK_WEBHOOK_SIGNING_SECRET: "whsec_abc",
    GEMINI_API_KEY: "key",
  }),
}))
const ANALYSIS = "0d7e8a3e-5f63-4a39-9b4e-2f3c1d1e9a10"
vi.mock("./storage.server", () => ({
  requestStorage: () => Promise.resolve({}),
  serverRunWriter: () => ({
    startAnalysis: () =>
      Promise.resolve({ analysisId: ANALYSIS, runId: "run_1" }),
  }),
}))
vi.mock("./run.server", () => ({
  runAnalysis: () => Promise.resolve("done"),
  runDeps: () => ({}),
}))
vi.mock("./limits.server", async (actual) => ({
  ...(await actual<typeof Limits>()),
  runLimitLiftsAt: () => Promise.resolve(null),
  spendModelCall: () => Promise.resolve(),
}))
vi.mock("@workspace/database", () => ({
  readAnalysis: vi.fn(),
  readResult: vi.fn(),
  readExplanation: vi.fn(),
  explanationWriter: () => ({ store: () => Promise.resolve() }),
  deleteOrganization: () => Promise.resolve(),
}))

const EXPLANATION = "Exports the app, imported by `index.js`."
const ANSWER = "`lib/app.js` makes the app."
const QUESTION = "What is lib/app.js?"
const SOURCE = "module.exports = function app() {}\n"
const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
}
vi.mock("@workspace/ai", async (actual) => ({
  ...(await actual<typeof Ai>()),
  languageModel: () =>
    new MockLanguageModelV4({
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
          content: [{ type: "text", text: ANSWER }],
          finishReason: { unified: "stop", raw: undefined },
          usage,
          warnings: [],
        },
      ],
    }),
}))

const repository = makeRepository({
  "package.json": '{ "name": "demo" }',
  "index.js": "require('./lib/app.js')\n",
  "lib/app.js": SOURCE,
})
const parsed = parseRepository(repository.directory)
if (isTooLarge(parsed)) throw new Error("tiny repository is too large")
afterAll(() => repository.remove())

beforeAll(async () => {
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
  // Cached, so the explanation asks no model and fetches no source.
  vi.mocked(readExplanation).mockResolvedValue({
    body: EXPLANATION,
    inferredRole: null,
  } as Awaited<ReturnType<typeof readExplanation>>)

  // The session.
  await clerkWebhookActions().signedIn({
    userId: "user_1",
    organizationId: "org_a",
  })
  await submitAddress("owner/demo")
  await explainSelection(ANALYSIS, { kind: "file", path: "lib/app.js" })
  const reply = await handleChat(
    new Request(`https://cartograph.test/api/analyses/${ANALYSIS}/chat`, {
      method: "POST",
      body: JSON.stringify({
        messages: [
          { id: "q1", role: "user", parts: [{ type: "text", text: QUESTION }] },
        ],
      }),
    }),
    ANALYSIS
  )
  await reply.text()
  await Promise.all(pending)
})

describe("one session's events (spec 012, FR-002, FR-003)", () => {
  it("holds each of the five (AC-11)", () => {
    expect(captured.map((c) => c.event).sort()).toEqual(
      [...PRODUCT_EVENTS].sort()
    )
  })

  it("are the member's, by user id, with the release and no person profile", () => {
    for (const { distinctId, properties } of captured) {
      expect(distinctId).toBe("user_1")
      expect(properties).toMatchObject({
        release: "test",
        $process_person_profile: false,
      })
    }
  })

  it("hold no source, explanation or chat text, and no email (AC-08)", () => {
    const sent = JSON.stringify(captured)
    expect(sent).not.toContain(SOURCE.trim())
    expect(sent).not.toContain(EXPLANATION)
    expect(sent).not.toContain(ANSWER)
    expect(sent).not.toContain(QUESTION)
    expect(sent).not.toMatch(/[^\s@"]+@[^\s@"]+\.[a-z]+/i)
  })

  it("say how each ended, never what was said", () => {
    const of = (event: string) =>
      captured.find((c) => c.event === event)?.properties
    expect(of("analysis_submitted")).toMatchObject({ started: true })
    expect(of("run_finished")).toMatchObject({
      outcome: "done",
      runId: "run_1",
    })
    expect(of("explanation_requested")).toMatchObject({
      kind: "file",
      outcome: "explained",
      cached: true,
    })
    expect(of("chat_question_asked")).toMatchObject({ answered: true })
  })
})
