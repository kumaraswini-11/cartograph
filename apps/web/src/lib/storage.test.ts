import { afterEach, describe, expect, it, vi } from "vitest"

import { storageClient } from "./storage"

afterEach(() => vi.unstubAllGlobals())

/** Every request the client makes, by its headers; nothing leaves the test. */
function recordRequests() {
  const seen: Array<Headers> = []
  vi.stubGlobal(
    "fetch",
    vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
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
    await storageClient(access("token-of-a-member")).from("anything").select()
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
    await client.from("anything").select()
    token = "second"
    await client.from("anything").select()
    expect(seen.map((h) => h.get("Authorization"))).toEqual([
      "Bearer first",
      "Bearer second",
    ])
  })

  it("has no sign-in of its own: one session system (C-03)", () => {
    expect(() => storageClient(access(null)).auth.getSession()).toThrow()
  })
})
