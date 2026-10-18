import { afterEach, describe, expect, it, vi } from "vitest"

import { storageClient } from "./client.ts"
import {
  modelCallTimesSince,
  modelCallWriter,
  runTimesSince,
} from "./limits.ts"

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

const SINCE = new Date("2026-10-18T10:00:00.000Z")

describe("what the limits count (spec 012, FR-006, FR-007, D-05)", () => {
  it("reads the latest runs since a moment; the policy decides whose", async () => {
    const seen = respondWith([
      { started_at: "2026-10-18T10:40:00+00:00" },
      { started_at: "2026-10-18T10:20:00+00:00" },
    ])
    expect(await runTimesSince(storage(), SINCE, 20)).toEqual([
      "2026-10-18T10:40:00+00:00",
      "2026-10-18T10:20:00+00:00",
    ])
    const params = seen[0]?.url.searchParams
    expect(seen[0]?.url.pathname).toBe("/rest/v1/runs")
    expect(params?.get("started_at")).toBe(`gte.${SINCE.toISOString()}`)
    expect(params?.get("order")).toBe("started_at.desc")
    expect(params?.get("limit")).toBe("20")
    expect(seen[0]?.url.search).not.toMatch(/organization/)
  })

  it("reads the latest model calls the same way", async () => {
    const seen = respondWith([])
    expect(await modelCallTimesSince(storage(), SINCE, 100)).toEqual([])
    expect(seen[0]?.url.pathname).toBe("/rest/v1/model_calls")
    expect(seen[0]?.url.searchParams.get("order")).toBe("called_at.desc")
    expect(seen[0]?.url.searchParams.get("limit")).toBe("100")
  })

  it("reports a refused read", async () => {
    respondWith({ message: "permission denied", code: "42501" }, 403)
    await expect(runTimesSince(storage(), SINCE, 20)).rejects.toThrow(
      /Couldn't count runs: permission denied/
    )
  })

  it("records a call with the secret key", async () => {
    const seen = respondWith(null, 201)
    await modelCallWriter({
      url: "https://ref.supabase.co",
      secretKey: "sb_secret_abc",
    }).record({ organizationId: "org_a", kind: "chat" })
    expect(seen[0]?.method).toBe("POST")
    expect(seen[0]?.url.pathname).toBe("/rest/v1/model_calls")
    expect(seen[0]?.headers.get("apikey")).toBe("sb_secret_abc")
    expect(seen[0]?.body).toEqual({ organization_id: "org_a", kind: "chat" })
  })
})
