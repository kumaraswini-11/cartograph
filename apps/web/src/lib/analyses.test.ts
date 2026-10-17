import { beforeEach, describe, expect, it, vi } from "vitest"

import { REFUSALS } from "@workspace/github/address"

import { submitAddress } from "./analyses.server"
import { runAfterResponse } from "./background.server"
import { readSession } from "./session.server"
import { serverRunWriter } from "./storage.server"

vi.mock("@tanstack/react-start/server-only", () => ({}))
vi.mock("./session.server", () => ({ readSession: vi.fn() }))
vi.mock("./storage.server", () => ({
  serverRunWriter: vi.fn(),
  requestStorage: vi.fn(),
}))
vi.mock("./background.server", () => ({ runAfterResponse: vi.fn() }))
vi.mock("./run.server", () => ({
  runAnalysis: vi.fn(() => Promise.resolve()),
  runDeps: vi.fn(),
}))

const startAnalysis = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readSession).mockResolvedValue({
    signedIn: true,
    userId: "user_1",
    organization: { id: "org_session", name: "Acme", admin: false },
  })
  vi.mocked(serverRunWriter).mockReturnValue({
    startAnalysis,
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
    expect(runAfterResponse).toHaveBeenCalledOnce()
  })

  it("goes to the analysis the organization already has, starting no run", async () => {
    startAnalysis.mockResolvedValue({ analysisId: "a", runId: null })
    expect(await submitAddress("facebook/react")).toEqual({ analysisId: "a" })
    expect(runAfterResponse).not.toHaveBeenCalled()
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
