import { afterEach, describe, expect, it, vi } from "vitest"

import { listAnalyses } from "./analyses.ts"
import { storageClient } from "./client.ts"

afterEach(() => vi.unstubAllGlobals())

/** Answers every request with `body`, keeping each request's URL. */
function respondWith(body: unknown) {
  const urls: Array<URL> = []
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL | Request) => {
      urls.push(new URL(input instanceof Request ? input.url : input))
      return Promise.resolve(Response.json(body))
    })
  )
  return urls
}

const storage = () =>
  storageClient({
    url: "https://ref.supabase.co",
    publishableKey: "sb_publishable_abc",
    getToken: () => Promise.resolve("token"),
  })

describe("listing analyses (spec 007, FR-006, C-02)", () => {
  it("asks for each analysis with its newest run, and names no organization", async () => {
    const urls = respondWith([])
    await listAnalyses(storage())
    expect(urls).toHaveLength(1)
    const url = urls[0]
    expect(url?.pathname).toBe("/rest/v1/analyses")
    expect(url?.searchParams.get("select")).toBe(
      "id,repository,runs(state,started_at)"
    )
    expect(url?.searchParams.get("runs.order")).toBe("started_at.desc")
    expect(url?.searchParams.get("runs.limit")).toBe("1")
    // The policies decide whose rows come back; the query never says (C-02).
    expect(url?.search).not.toMatch(/organization/)
  })

  it("gives each analysis its latest run's state, or none", async () => {
    respondWith([
      {
        id: "a",
        repository: "owner/a",
        runs: [{ state: "done", started_at: "t" }],
      },
      { id: "b", repository: "owner/b", runs: [] },
    ])
    expect(await listAnalyses(storage())).toEqual([
      { id: "a", repository: "owner/a", latestRun: "done" },
      { id: "b", repository: "owner/b", latestRun: null },
    ])
  })

  it("refuses a state it doesn't know, rather than show a wrong one", async () => {
    respondWith([
      {
        id: "a",
        repository: "owner/a",
        runs: [{ state: "queued", started_at: "t" }],
      },
    ])
    await expect(listAnalyses(storage())).rejects.toThrow(/unknown run state/)
  })
})
