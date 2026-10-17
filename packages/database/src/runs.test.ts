import { afterEach, describe, expect, it, vi } from "vitest"

import { runWriter } from "./runs.ts"

afterEach(() => vi.unstubAllGlobals())

const access = { url: "https://ref.supabase.co", secretKey: "sb_secret_abc" }

type Seen = { url: URL; body: unknown; headers: Headers }

/** Every request, answered with `body` and `status`. */
function respondWith(body: unknown, status = 200) {
  const seen: Array<Seen> = []
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string | URL | Request, init?: RequestInit) => {
      seen.push({
        url: new URL(input instanceof Request ? input.url : input),
        body: JSON.parse(typeof init?.body === "string" ? init.body : "null"),
        headers: new Headers(init?.headers),
      })
      return Promise.resolve(Response.json(body, { status }))
    })
  )
  return seen
}

describe("a run's writes, with the secret key (spec 008, plan D-06)", () => {
  it("starts an analysis through its function, for the organization named", async () => {
    const seen = respondWith({ analysis_id: "a", run_id: "r" })
    expect(
      await runWriter(access).startAnalysis({
        organizationId: "org_a",
        repository: "facebook/react",
        message: "Reading facebook/react",
      })
    ).toEqual({ analysisId: "a", runId: "r" })
    expect(seen[0]?.url.pathname).toBe("/rest/v1/rpc/start_analysis")
    expect(seen[0]?.body).toEqual({
      organization: "org_a",
      repository: "facebook/react",
      message: "Reading facebook/react",
    })
    expect(seen[0]?.headers.get("apikey")).toBe("sb_secret_abc")
  })

  it("gives no run for an analysis the organization already has (FR-002)", async () => {
    respondWith({ analysis_id: "a", run_id: null })
    expect(
      await runWriter(access).startAnalysis({
        organizationId: "org_a",
        repository: "facebook/react",
        message: "x",
      })
    ).toEqual({ analysisId: "a", runId: null })
  })

  it("re-runs an analysis, saying whether the run is new (FR-003, FR-004)", async () => {
    const seen = respondWith({ run_id: "r", started: false })
    expect(
      await runWriter(access).rerunAnalysis({
        organizationId: "org_a",
        analysisId: "a",
        message: "x",
        stopped: "Stopped without finishing.",
      })
    ).toEqual({ runId: "r", started: false })
    expect(seen[0]?.url.pathname).toBe("/rest/v1/rpc/rerun_analysis")
    expect(seen[0]?.body).toEqual({
      organization: "org_a",
      analysis: "a",
      message: "x",
      stopped: "Stopped without finishing.",
    })
  })

  it("moves a run on, sending the commit only once it's known", async () => {
    const seen = respondWith(true)
    const writer = runWriter(access)
    expect(
      await writer.advanceRun("r", { stage: "fetching", message: "x" })
    ).toBe(true)
    await writer.advanceRun("r", {
      stage: "parsing",
      message: "y",
      commit: "c".repeat(40),
    })
    expect(seen.map((s) => s.body)).toEqual([
      { run: "r", stage: "fetching", message: "x" },
      { run: "r", stage: "parsing", message: "y", commit: "c".repeat(40) },
    ])
  })

  it("fails and finishes a run through their functions", async () => {
    const seen = respondWith(true)
    const writer = runWriter(access)
    await writer.failRun("r", "why")
    expect(
      await writer.finishRun("r", {
        parsed: { files: [] },
        detection: { files: [] },
        message: "Done",
      })
    ).toBe(true)
    expect(seen.map((s) => s.url.pathname)).toEqual([
      "/rest/v1/rpc/fail_run",
      "/rest/v1/rpc/finish_run",
    ])
    expect(seen[1]?.body).toEqual({
      run: "r",
      parsed: { files: [] },
      detection: { files: [] },
      message: "Done",
    })
  })

  it("reports a refusal rather than carrying on", async () => {
    respondWith({ message: "permission denied", code: "42501" }, 403)
    await expect(runWriter(access).failRun("r", "why")).rejects.toThrow(
      /Couldn't record run r as failed: permission denied/
    )
  })
})
