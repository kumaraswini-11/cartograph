import { afterEach, describe, expect, it, vi } from "vitest"

import { NO_TOKEN, storageClient } from "./client.ts"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Every request the client makes, by its headers; nothing leaves the test. */
function recordRequests() {
  const seen: Array<Headers> = []
  vi.stubGlobal(
    "fetch",
    vi.fn((_input: string | URL | Request, init?: RequestInit) => {
      seen.push(new Headers(init?.headers))
      return Promise.resolve(Response.json([]))
    })
  )
  return seen
}

const access = (token: string | null) => ({
  url: "https://ref.supabase.co",
  publishableKey: "sb_publishable_abc",
  getToken: () => Promise.resolve(token),
})

describe("the storage client (spec 006, FR-013, AC-09)", () => {
  it("sends the signed-in person's token with a request", async () => {
    const seen = recordRequests()
    await storageClient(access("token-of-a-member")).from("analyses").select()
    expect(seen).toHaveLength(1)
    expect(seen[0]?.get("Authorization")).toBe("Bearer token-of-a-member")
    expect(seen[0]?.get("apikey")).toBe("sb_publishable_abc")
  })

  it("asks for the token again on each request, never keeping an old one", async () => {
    const seen = recordRequests()
    let token = "first"
    const client = storageClient({
      ...access(null),
      getToken: () => Promise.resolve(token),
    })
    await client.from("analyses").select()
    token = "second"
    await client.from("analyses").select()
    expect(seen.map((h) => h.get("Authorization"))).toEqual([
      "Bearer first",
      "Bearer second",
    ])
  })

  it("sends nothing without a token, rather than ask as no one (C-04)", async () => {
    const seen = recordRequests()
    // Supabase's realtime part warns of the missing token as it starts.
    vi.spyOn(console, "warn").mockImplementation(() => {})
    // A failed read is retried with backoff; fake time runs through it.
    vi.useFakeTimers()
    const pending = Promise.resolve(
      storageClient(access(null)).from("analyses").select()
    )
    await vi.runAllTimersAsync()
    const result = await pending
    vi.useRealTimers()
    expect(result.error?.message).toContain(NO_TOKEN)
    expect(seen).toHaveLength(0)
  })

  it("has no sign-in of its own: one session system (C-03)", () => {
    expect(() => storageClient(access("token")).auth.getSession()).toThrow()
  })
})
