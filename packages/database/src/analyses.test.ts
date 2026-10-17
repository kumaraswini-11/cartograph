import { afterEach, describe, expect, it, vi } from "vitest"

import { listAnalyses, readAnalysis, readResult } from "./analyses.ts"
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
      "id,repository,runs(state,stale,started_at)"
    )
    expect(url?.searchParams.get("runs.order")).toBe("started_at.desc")
    expect(url?.searchParams.get("runs.limit")).toBe("1")
    // The policies decide whose rows come back; the query never says (C-02).
    expect(url?.search).not.toMatch(/organization/)
  })

  it("gives each analysis its latest run's state and staleness, or none", async () => {
    respondWith([
      {
        id: "a",
        repository: "owner/a",
        runs: [{ state: "done", stale: false, started_at: "t" }],
      },
      {
        id: "b",
        repository: "owner/b",
        runs: [{ state: "parsing", stale: true, started_at: "t" }],
      },
      { id: "c", repository: "owner/c", runs: [] },
    ])
    expect(await listAnalyses(storage())).toEqual([
      {
        id: "a",
        repository: "owner/a",
        latestRun: { state: "done", stale: false },
      },
      {
        id: "b",
        repository: "owner/b",
        latestRun: { state: "parsing", stale: true },
      },
      { id: "c", repository: "owner/c", latestRun: null },
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

describe("reading an analysis (spec 008, FR-010, FR-014)", () => {
  it("asks for that analysis with its newest run, and names no organization", async () => {
    const urls = respondWith(null)
    expect(await readAnalysis(storage(), "a")).toBeNull()
    const url = urls[0]
    expect(url?.pathname).toBe("/rest/v1/analyses")
    expect(url?.searchParams.get("id")).toBe("eq.a")
    expect(url?.searchParams.get("runs.order")).toBe("started_at.desc")
    expect(url?.searchParams.get("runs.limit")).toBe("1")
    expect(url?.search).not.toMatch(/organization/)
  })

  it("gives the run's stage, sentence, failure and commit", async () => {
    respondWith({
      id: "a",
      repository: "owner/a",
      runs: [
        {
          id: "r",
          state: "failed",
          stale: false,
          message: "owner/a doesn't exist or isn't public",
          failed_stage: "fetching",
          commit: null,
          started_at: "t0",
          finished_at: "t1",
        },
      ],
    })
    expect(await readAnalysis(storage(), "a")).toEqual({
      id: "a",
      repository: "owner/a",
      latestRun: {
        id: "r",
        state: "failed",
        stale: false,
        message: "owner/a doesn't exist or isn't public",
        failedStage: "fetching",
        commit: null,
        startedAt: "t0",
        finishedAt: "t1",
      },
    })
  })

  it("reads an analysis's stored results, or none before its first", async () => {
    const urls = respondWith(null)
    expect(await readResult(storage(), "a")).toBeNull()
    expect(urls[0]?.pathname).toBe("/rest/v1/results")
    expect(urls[0]?.searchParams.get("analysis_id")).toBe("eq.a")

    respondWith({
      commit: "c",
      parsed: { files: [] },
      detection: {},
      stored_at: "t",
    })
    expect(await readResult(storage(), "a")).toEqual({
      commit: "c",
      parsed: { files: [] },
      detection: {},
      storedAt: "t",
    })
  })
})
