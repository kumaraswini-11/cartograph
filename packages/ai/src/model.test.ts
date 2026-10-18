import { generateText } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { describe, expect, it } from "vitest"

import { CHAT_MODEL, MODEL, languageModel, paced } from "./model.ts"

describe("the model (spec 009, FR-012, AC-10)", () => {
  it("is named by an exact version, never an alias that moves", () => {
    // Google's aliases end in -latest and "get hot-swapped with every new
    // release"; previews change too. Neither may be pinned.
    for (const name of [MODEL, CHAT_MODEL]) {
      expect(name).not.toMatch(/latest/)
      expect(name).not.toMatch(/preview|exp/)
      expect(name).toMatch(/^gemini-\d+(?:\.\d+)?-[a-z]+(?:-[a-z]+)?$/)
    }
  })

  it("builds the client for exactly that version", () => {
    const model = languageModel("key")
    expect(typeof model === "object" && model.modelId).toBe(MODEL)
    const chat = languageModel("key", CHAT_MODEL)
    expect(typeof chat === "object" && chat.modelId).toBe(CHAT_MODEL)
  })
})

describe("pacing (spec 011, plan D-09)", () => {
  it("spaces a model's calls to stay within its requests a minute", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: () =>
        Promise.resolve({
          content: [{ type: "text", text: "ok" }],
          finishReason: { unified: "stop", raw: undefined },
          usage: {
            inputTokens: {
              total: 1,
              noCache: 1,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: { total: 1, text: 1, reasoning: undefined },
          },
          warnings: [],
        }),
    })
    // 600 a minute: one call every 100 ms.
    const slow = paced(model, 600)
    const started = Date.now()
    for (let i = 0; i < 3; i++) await generateText({ model: slow, prompt: "x" })
    expect(Date.now() - started).toBeGreaterThanOrEqual(195)
    expect(model.doGenerateCalls).toHaveLength(3)
  })
})
