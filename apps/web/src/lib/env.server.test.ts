import { describe, expect, it } from "vitest"

import { ConfigError, parseConfig } from "./config"
import { serverEnvSchema } from "./env.server"

const valid = {
  VITE_CLERK_PUBLISHABLE_KEY: "pk_test_abc",
  CLERK_SECRET_KEY: "sk_test_abc",
  SUPABASE_URL: "https://ref.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
}

const problemsOf = (source: Record<string, string | undefined>) => {
  try {
    parseConfig(serverEnvSchema, source)
  } catch (error) {
    if (error instanceof ConfigError) return error.problems
    throw error
  }
  return []
}

describe("the server's configuration (spec 000 FR-011, spec 006)", () => {
  it("accepts Clerk's two keys and Supabase's address and key", () => {
    expect(problemsOf(valid)).toEqual([])
  })

  it("names a missing value and one of the wrong kind, so the server stops", () => {
    expect(
      problemsOf({
        ...valid,
        VITE_CLERK_PUBLISHABLE_KEY: "sk_test_abc",
        CLERK_SECRET_KEY: undefined,
        SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc",
      })
    ).toEqual([
      "VITE_CLERK_PUBLISHABLE_KEY: must start with pk_test_ or pk_live_",
      "CLERK_SECRET_KEY is missing",
      "SUPABASE_PUBLISHABLE_KEY: must start with sb_publishable_",
    ])
  })
})
