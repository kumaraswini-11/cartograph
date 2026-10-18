import { afterEach, describe, expect, it, vi } from "vitest"

import { storageClient } from "./client.ts"
import { explanationWriter, readExplanation } from "./explanations.ts"

afterEach(() => vi.unstubAllGlobals())

type Seen = { url: URL; method: string; body: unknown; headers: Headers }

/** Every request, answered with `body` and `status`. */
function respondWith(body: unknown, status = 200) {
  const seen: Array<Seen> = []
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL | Request, init?: RequestInit) => {
      seen.push({
        url: new URL(input instanceof Request ? input.url : input),
        method: init?.method ?? "GET",
        body: JSON.parse(typeof init?.body === "string" ? init.body : "null"),
        headers: new Headers(init?.headers),
      })
      return Promise.resolve(
        status === 201
          ? new Response(null, { status })
          : Response.json(body, { status })
      )
    })
  )
  return seen
}

const storage = () =>
  storageClient({
    url: "https://ref.supabase.co",
    publishableKey: "sb_publishable_abc",
    getToken: () => Promise.resolve("token"),
  })

const KEY = "a".repeat(64)

describe("the explanation cache (spec 009, FR-010)", () => {
  it("reads by key alone; the policy decides whose (007 C-02)", async () => {
    const seen = respondWith(null)
    expect(await readExplanation(storage(), KEY)).toBeNull()
    expect(seen[0]?.url.pathname).toBe("/rest/v1/explanations")
    expect(seen[0]?.url.searchParams.get("cache_key")).toBe(`eq.${KEY}`)
    expect(seen[0]?.url.search).not.toMatch(/organization/)
  })

  it("gives back a cached explanation", async () => {
    respondWith({
      subject: "lib/db.ts",
      kind: "file",
      body: "Data access.",
      inferred_role: "data access",
      model: "gemini-3.6-flash",
      prompt_version: 1,
      created_at: "t",
    })
    expect(await readExplanation(storage(), KEY)).toEqual({
      subject: "lib/db.ts",
      kind: "file",
      body: "Data access.",
      inferredRole: "data access",
      model: "gemini-3.6-flash",
      promptVersion: 1,
      createdAt: "t",
    })
  })

  it("writes with the secret key, keeping a key's first row (D-09)", async () => {
    const seen = respondWith(null, 201)
    await explanationWriter({
      url: "https://ref.supabase.co",
      secretKey: "sb_secret_abc",
    }).store({
      organizationId: "org_a",
      analysisId: "a1",
      cacheKey: KEY,
      subject: "src/index.ts",
      kind: "file",
      body: "The entry point.",
      inferredRole: null,
      model: "gemini-3.6-flash",
      promptVersion: 1,
    })
    const [write] = seen
    expect(write?.method).toBe("POST")
    expect(write?.url.pathname).toBe("/rest/v1/explanations")
    expect(write?.url.searchParams.get("on_conflict")).toBe(
      "organization_id,cache_key"
    )
    // Already there: left alone, not overwritten.
    expect(write?.headers.get("prefer")).toMatch(/resolution=ignore-duplicates/)
    expect(write?.headers.get("apikey")).toBe("sb_secret_abc")
    expect(write?.body).toMatchObject({
      organization_id: "org_a",
      cache_key: KEY,
      kind: "file",
    })
  })

  it("reports a refused write", async () => {
    respondWith({ message: "violates check constraint", code: "23514" }, 400)
    await expect(
      explanationWriter({
        url: "https://ref.supabase.co",
        secretKey: "sb_secret_abc",
      }).store({
        organizationId: "org_a",
        analysisId: "a1",
        cacheKey: KEY,
        subject: "app/page.tsx",
        kind: "file",
        body: "x",
        inferredRole: "page route",
        model: "gemini-3.6-flash",
        promptVersion: 1,
      })
    ).rejects.toThrow(
      /Couldn't cache the explanation of app\/page.tsx: violates check constraint/
    )
  })
})
