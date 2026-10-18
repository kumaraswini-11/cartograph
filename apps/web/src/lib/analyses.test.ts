import { beforeEach, describe, expect, it, vi } from "vitest"

import { listAnalyses, readAnalysis } from "@workspace/database"
import { REFUSALS } from "@workspace/github/address"

import type * as Database from "@workspace/database"

import { rerun, submitAddress } from "./analyses.server"
import { runAnalysis } from "./run.server"
import { runLimitLiftsAt } from "./limits.server"
import { readSession } from "./session.server"
import { serverRunWriter } from "./storage.server"

vi.mock("@tanstack/react-start/server-only", () => ({}))
vi.mock("./session.server", () => ({ readSession: vi.fn() }))
vi.mock("./storage.server", () => ({
  serverRunWriter: vi.fn(),
  requestStorage: vi.fn(),
}))
vi.mock("./background.server", () => ({ runAfterResponse: vi.fn() }))
vi.mock("./telemetry.server", () => ({ track: vi.fn(), reportError: vi.fn() }))
vi.mock("./limits.server", () => ({ runLimitLiftsAt: vi.fn() }))
vi.mock("@workspace/database", async (actual) => ({
  ...(await actual<typeof Database>()),
  listAnalyses: vi.fn(),
  readAnalysis: vi.fn(),
}))
vi.mock("./run.server", () => ({
  runAnalysis: vi.fn(() => Promise.resolve()),
  runDeps: vi.fn(),
}))

const startAnalysis = vi.fn()
const rerunAnalysis = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readSession).mockResolvedValue({
    signedIn: true,
    userId: "user_1",
    organization: { id: "org_session", name: "Acme", admin: false },
  })
  vi.mocked(runLimitLiftsAt).mockResolvedValue(null)
  vi.mocked(serverRunWriter).mockReturnValue({
    startAnalysis,
    rerunAnalysis,
  } as unknown as ReturnType<typeof serverRunWriter>)
})

describe("submitting an address (spec 008, FR-001, FR-002, plan D-06)", () => {
  it("starts the analysis for the session's organization, then runs it after the response", async () => {
    startAnalysis.mockResolvedValue({ analysisId: "a", runId: "r" })
    expect(
      await submitAddress("https://github.com/facebook/react/tree/main")
    ).toEqual({ analysisId: "a" })
    expect(startAnalysis).toHaveBeenCalledWith({
      organizationId: "org_session",
      repository: "facebook/react",
      message: "Reading facebook/react's default branch",
    })
    expect(runAnalysis).toHaveBeenCalledOnce()
  })

  it("goes to the analysis the organization already has, starting no run", async () => {
    startAnalysis.mockResolvedValue({ analysisId: "a", runId: null })
    expect(await submitAddress("facebook/react")).toEqual({ analysisId: "a" })
    expect(runAnalysis).not.toHaveBeenCalled()
  })

  it("refuses an address that isn't a GitHub repository, writing nothing (AC-09)", async () => {
    expect(await submitAddress("https://gitlab.com/gitlab-org/gitlab")).toEqual(
      {
        refusal: REFUSALS.notGitHub,
      }
    )
    expect(startAnalysis).not.toHaveBeenCalled()
  })

  it("acts for no organization when signed out", async () => {
    vi.mocked(readSession).mockResolvedValue({ signedIn: false })
    await expect(submitAddress("facebook/react")).rejects.toThrow(/Signed out/)
    expect(startAnalysis).not.toHaveBeenCalled()
  })
})

describe("the run limit (spec 012, FR-006, AC-10)", () => {
  const LIFTS_AT = "2026-10-18T12:40:00.000Z"

  it("refuses a new analysis at the limit, with when a run can start", async () => {
    vi.mocked(runLimitLiftsAt).mockResolvedValue(LIFTS_AT)
    vi.mocked(listAnalyses).mockResolvedValue([])
    expect(await submitAddress("facebook/react")).toEqual({
      runsResumeAt: LIFTS_AT,
    })
    expect(startAnalysis).not.toHaveBeenCalled()
    expect(runAnalysis).not.toHaveBeenCalled()
  })

  it("still opens an analysis the organization has, starting no run", async () => {
    vi.mocked(runLimitLiftsAt).mockResolvedValue(LIFTS_AT)
    vi.mocked(listAnalyses).mockResolvedValue([
      { id: "a", repository: "Facebook/React", latestRun: null },
    ])
    expect(await submitAddress("facebook/react")).toEqual({ analysisId: "a" })
    expect(startAnalysis).not.toHaveBeenCalled()
  })

  it("refuses a re-run at the limit, with when one can start", async () => {
    vi.mocked(runLimitLiftsAt).mockResolvedValue(LIFTS_AT)
    vi.mocked(readAnalysis).mockResolvedValue({
      id: "a",
      repository: "facebook/react",
      latestRun: null,
    })
    expect(await rerun("a")).toEqual({ runsResumeAt: LIFTS_AT })
    expect(rerunAnalysis).not.toHaveBeenCalled()
  })

  it("re-runs under the limit", async () => {
    vi.mocked(readAnalysis).mockResolvedValue({
      id: "a",
      repository: "facebook/react",
      latestRun: null,
    })
    rerunAnalysis.mockResolvedValue({ runId: "r", started: true })
    expect(await rerun("a")).toBeNull()
    expect(runAnalysis).toHaveBeenCalledOnce()
  })
})
