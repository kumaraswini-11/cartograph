import { afterEach, describe, expect, it, vi } from "vitest"

import { deleteOrganization } from "./organizations.ts"

afterEach(() => vi.unstubAllGlobals())

const access = { url: "https://ref.supabase.co", secretKey: "sb_secret_abc" }

/** Every request, by method, URL and headers; answered with `status`. */
function record(status = 204) {
  const seen: Array<{ method: string; url: URL; headers: Headers }> = []
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL | Request, init?: RequestInit) => {
      seen.push({
        method: init?.method ?? "GET",
        url: new URL(input instanceof Request ? input.url : input),
        headers: new Headers(init?.headers),
      })
      return Promise.resolve(
        status === 204
          ? new Response(null, { status })
          : Response.json({ message: "no" }, { status })
      )
    })
  )
  return seen
}

describe("deleting an organization (spec 007, FR-002, plan D-07)", () => {
  it("deletes that organization's row, with the secret key and no person's token", async () => {
    const seen = record()
    await deleteOrganization(access, "org_gone")
    expect(seen).toHaveLength(1)
    const [request] = seen
    expect(request?.method).toBe("DELETE")
    expect(request?.url.pathname).toBe("/rest/v1/organizations")
    expect(request?.url.searchParams.get("id")).toBe("eq.org_gone")
    expect(request?.headers.get("apikey")).toBe("sb_secret_abc")
  })

  it("reports a refusal, so the notice is delivered again", async () => {
    record(500)
    await expect(deleteOrganization(access, "org_gone")).rejects.toThrow(
      /Couldn't delete organization org_gone/
    )
  })
})
