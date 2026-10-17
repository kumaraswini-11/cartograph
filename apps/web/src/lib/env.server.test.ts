import { describe, expect, it } from "vitest"

import { ConfigError, parseConfig } from "./config"
import { serverEnvSchema } from "./env.server"

const valid = {
  VITE_CLERK_PUBLISHABLE_KEY: "pk_test_abc",
  CLERK_SECRET_KEY: "sk_test_abc",
  CLERK_WEBHOOK_SIGNING_SECRET: "whsec_abc",
  VITE_SUPABASE_URL: "https://ref.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
  SUPABASE_SECRET_KEY: "sb_secret_abc",
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
  it("accepts Clerk's keys and Supabase's address and keys", () => {
    expect(problemsOf(valid)).toEqual([])
  })

  it("names a missing value and one of the wrong kind, so the server stops", () => {
    expect(
      problemsOf({
        ...valid,
        VITE_CLERK_PUBLISHABLE_KEY: "sk_test_abc",
        CLERK_SECRET_KEY: undefined,
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc",
        CLERK_WEBHOOK_SIGNING_SECRET: " whsec_abc",
      })
    ).toEqual([
      "VITE_CLERK_PUBLISHABLE_KEY: must start with pk_test_ or pk_live_",
      "CLERK_SECRET_KEY is missing",
      "CLERK_WEBHOOK_SIGNING_SECRET: must start with whsec_",
      "VITE_SUPABASE_PUBLISHABLE_KEY: must start with sb_publishable_",
    ])
  })
})
