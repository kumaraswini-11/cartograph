import { describe, expect, it } from "vitest"

import { MODEL, languageModel } from "./model.ts"

describe("the model (spec 009, FR-012, AC-10)", () => {
  it("is named by an exact version, never an alias that moves", () => {
    // Google's aliases end in -latest and "get hot-swapped with every new
    // release"; previews change too. Neither may be pinned.
    expect(MODEL).not.toMatch(/latest/)
    expect(MODEL).not.toMatch(/preview|exp/)
    expect(MODEL).toMatch(/^gemini-\d+(?:\.\d+)?-[a-z]+(?:-[a-z]+)?$/)
  })

  it("builds the client for exactly that version", () => {
    const model = languageModel("key")
    expect(typeof model === "object" && model.modelId).toBe(MODEL)
  })
})
