import { describe, expect, it } from "vitest"
import { z } from "zod"

import { ConfigError, parseConfig } from "./config"

const schema = z.object({
  DATABASE_URL: z.url(),
  API_KEY: z.string(),
})

const valid = {
  DATABASE_URL: "postgres://localhost:5432/cartograph",
  API_KEY: "key",
}

function problemsOf(source: Record<string, string | undefined>) {
  try {
    parseConfig(schema, source)
  } catch (error) {
    if (error instanceof ConfigError) return error.problems
    throw error
  }
  throw new Error("expected parseConfig to throw")
}

describe("parseConfig", () => {
  it("returns the typed values when everything is present", () => {
    expect(parseConfig(schema, valid)).toEqual(valid)
  })

  it("names a missing value", () => {
    expect(problemsOf({ ...valid, API_KEY: undefined })).toEqual([
      "API_KEY is missing",
    ])
  })

  it("treats an empty or blank value as missing", () => {
    expect(problemsOf({ ...valid, API_KEY: "" })).toEqual([
      "API_KEY is missing",
    ])
    expect(problemsOf({ ...valid, API_KEY: "   " })).toEqual([
      "API_KEY is missing",
    ])
  })

  it("names every problem at once, missing and invalid alike", () => {
    expect(problemsOf({ DATABASE_URL: "not a url" })).toEqual([
      expect.stringMatching(/^DATABASE_URL: /),
      "API_KEY is missing",
    ])
  })

  it("puts every problem in the error message", () => {
    expect(() => parseConfig(schema, {})).toThrow(
      /DATABASE_URL is missing[\s\S]*API_KEY is missing/
    )
  })
})
