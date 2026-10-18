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
  GEMINI_API_KEY: "gemini-key",
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
  it("accepts Clerk's keys, Supabase's address and keys, and the model's key", () => {
    expect(problemsOf(valid)).toEqual([])
  })

  it("runs without tracing, and with it once its key is there (spec 009, FR-013)", () => {
    expect(problemsOf({ ...valid, GEMINI_API_KEY: undefined })).toEqual([
      "GEMINI_API_KEY is missing",
    ])
    // Empty counts as missing, so no request is sent with an empty key.
    expect(problemsOf({ ...valid, GEMINI_API_KEY: " " })).toEqual([
      "GEMINI_API_KEY is missing",
    ])
    expect(
      problemsOf({
        ...valid,
        LANGSMITH_TRACING: "true",
        LANGSMITH_API_KEY: "lsv2_sk_abc",
        LANGSMITH_ENDPOINT: "https://apac.api.smith.langchain.com",
        LANGSMITH_PROJECT: "cartograph-development",
      })
    ).toEqual([])
    expect(problemsOf({ ...valid, LANGSMITH_TRACING: "true" })).toEqual([
      "LANGSMITH_API_KEY is missing",
    ])
    expect(
      problemsOf({
        ...valid,
        LANGSMITH_API_KEY: "sk-abc",
        LANGSMITH_TRACING: "yes",
        LANGSMITH_ENDPOINT: "http://api.smith.langchain.com",
      })
    ).toEqual([
      'LANGSMITH_TRACING: Invalid option: expected one of "true"|"false"',
      "LANGSMITH_API_KEY: must start with lsv2_",
      "LANGSMITH_ENDPOINT: must be an https:// address",
    ])
  })

  it("runs without PostHog, and with it once its host is there (spec 012)", () => {
    expect(
      problemsOf({
        ...valid,
        VITE_POSTHOG_KEY: "phc_abc",
        VITE_POSTHOG_HOST: "https://us.i.posthog.com",
      })
    ).toEqual([])
    expect(problemsOf({ ...valid, VITE_POSTHOG_KEY: "phc_abc" })).toEqual([
      "VITE_POSTHOG_HOST is missing",
    ])
    expect(
      problemsOf({
        ...valid,
        VITE_POSTHOG_KEY: "abc",
        VITE_POSTHOG_HOST: "http://us.i.posthog.com",
      })
    ).toEqual([
      "VITE_POSTHOG_KEY: must start with phc_",
      "VITE_POSTHOG_HOST: must be an https:// address",
    ])
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
