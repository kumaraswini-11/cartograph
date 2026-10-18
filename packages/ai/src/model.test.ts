import { describe, expect, it } from "vitest"

import { CHAT_MODEL, MODEL, languageModel } from "./model.ts"

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
