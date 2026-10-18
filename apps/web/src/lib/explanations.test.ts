import { createHash } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  modelCallTimesSince,
  readAnalysis,
  readExplanation,
  readResult,
} from "@workspace/database"
import { detectFrameworks } from "@workspace/frameworks"
import { GitHubError, defaultBranchHead, fileAtCommit } from "@workspace/github"
import { isTooLarge, parseRepository } from "@workspace/parser"
import { makeRepository } from "@workspace/parser/testing"

import type * as Ai from "@workspace/ai"
import type * as GitHub from "@workspace/github"

import { explainSelection, stalenessOf } from "./explanations.server"
import { MODEL_CALL_LIMIT } from "./limits"

vi.mock("@tanstack/react-start/server-only", () => ({}))
vi.mock("./analyses.server", () => ({
  currentMember: () =>
    Promise.resolve({ userId: "user_1", organizationId: "org_session" }),
}))
vi.mock("./background.server", () => ({ runAfterResponse: vi.fn() }))
vi.mock("./telemetry.server", () => ({ track: vi.fn(), reportError: vi.fn() }))
vi.mock("./storage.server", () => ({
  requestStorage: () => Promise.resolve({}),
}))
vi.mock("./env.server", () => ({
  getServerEnv: () => ({
    GEMINI_API_KEY: "key",
    VITE_SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_SECRET_KEY: "sb_secret_abc",
  }),
}))
const store = vi.fn((_: unknown) => Promise.resolve())
const record = vi.fn((_: unknown) => Promise.resolve())
vi.mock("@workspace/database", () => ({
  readAnalysis: vi.fn(),
  readResult: vi.fn(),
  readExplanation: vi.fn(),
  explanationWriter: () => ({ store }),
  modelCallTimesSince: vi.fn(),
  modelCallWriter: () => ({ record }),
}))
vi.mock("@workspace/github", async (actual) => ({
  ...(await actual<typeof GitHub>()),
  fileAtCommit: vi.fn(),
  defaultBranchHead: vi.fn(),
}))
const ask = vi.fn()
vi.mock("@workspace/ai", async (actual) => ({
  ...(await actual<typeof Ai>()),
  askModel: () => ask,
  languageModel: () => ({}),
}))

// A real repository, parsed and detected, stored as a run stores it.
const SOURCES = {
  "package.json": '{ "name": "demo" }',
  "index.js": "require('./lib/app.js')\n",
  "lib/app.js": "module.exports = function app() {}\n",
}
const repository = makeRepository(SOURCES)
const parsed = parseRepository(repository.directory)
if (isTooLarge(parsed)) throw new Error("tiny repository is too large")
const stored = {
  commit: "c".repeat(40),
  parsed,
  detection: detectFrameworks(repository.directory, parsed),
  storedAt: "t",
}
afterAll(() => repository.remove())

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readAnalysis).mockResolvedValue({
    id: "a1",
    repository: "owner/demo",
    latestRun: null,
  })
  vi.mocked(readResult).mockResolvedValue(stored)
  vi.mocked(readExplanation).mockResolvedValue(null)
  vi.mocked(modelCallTimesSince).mockResolvedValue([])
})

const bytes = (text: string) => new TextEncoder().encode(text)

describe("explaining a selection (spec 009, plan Approach)", () => {
  it("refuses a source that isn't the analysed file, before any model call", async () => {
    vi.mocked(fileAtCommit).mockResolvedValue(bytes("// tampered\n"))
    const result = await explainSelection("a1", {
      kind: "file",
      path: "lib/app.js",
    })
    expect(result).toMatchObject({ status: "failed" })
    expect(result.status === "failed" && result.message).toMatch(
      /doesn't match what was analysed/
    )
    expect(ask).not.toHaveBeenCalled()
    expect(store).not.toHaveBeenCalled()
  })

  it("explains from the stored neighbours, and caches for the session's organization", async () => {
    const source = SOURCES["lib/app.js"]
    expect(createHash("sha256").update(source).digest("hex")).toBe(
      parsed.files.find((f) => f.path === "lib/app.js")?.hash
    )
    vi.mocked(fileAtCommit).mockResolvedValue(bytes(source))
    ask.mockResolvedValue({
      body: "The app, imported by `index.js`.",
      inferredRole: "service",
    })

    const result = await explainSelection("a1", {
      kind: "file",
      path: "lib/app.js",
    })
    expect(result).toMatchObject({
      status: "explained",
      cached: false,
      traced: false,
      // No convention identified it, as `002` really says so (FR-009).
      explanation: { inferredRole: "service" },
    })
    expect(ask.mock.calls[0]?.[0].system).toMatch(/No convention identified/)
    // Fetched at the analysed commit, not the branch's head.
    expect(vi.mocked(fileAtCommit).mock.calls[0]?.slice(0, 3)).toEqual([
      "owner/demo",
      "c".repeat(40),
      "lib/app.js",
    ])
    // The neighbours come from the stored result, never the request.
    expect(ask.mock.calls[0]?.[0].prompt).toContain(
      "It is imported by (complete):\n- `index.js`"
    )
    expect(store).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_session",
        analysisId: "a1",
        subject: "lib/app.js",
        kind: "file",
      })
    )
  })

  it("says so when the analysis has no such file", async () => {
    const result = await explainSelection("a1", {
      kind: "file",
      path: "lib/ghost.js",
    })
    expect(result).toMatchObject({ status: "failed" })
    expect(ask).not.toHaveBeenCalled()
  })

  it("explains the map's own box, from its files and the edges across it, with no fetch", async () => {
    ask.mockResolvedValue({
      body: "The app's folder, imported by `index.js`.",
      inferredRole: null,
    })
    const result = await explainSelection("a1", { kind: "box", path: "" })
    expect(result).toMatchObject({ status: "explained", cached: false })
    expect(fileAtCommit).not.toHaveBeenCalled()
    // Three files fold into the root's box: the map's folding, not a guess.
    const prompt: string = ask.mock.calls[0]?.[0].prompt
    expect(prompt).toContain("Box: (the repository's root)")
    // `lib` folds into the root, as on the map.
    expect(prompt).toContain("Folders in it: (the repository's root), `lib`")
    expect(prompt).toContain("Files: 2")
    expect(prompt).toContain("Imports into it, from files outside:\nnone")
    expect(store).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "", kind: "box" })
    )
  })

  it("says so when the map has no such box", async () => {
    const result = await explainSelection("a1", { kind: "box", path: "lib" })
    expect(result).toMatchObject({ status: "failed" })
    expect(ask).not.toHaveBeenCalled()
  })
})

describe("the model call limit (spec 012, FR-007)", () => {
  /** The organization's latest calls: as many as the limit, all at `at`. */
  const atLimit = (at: string) =>
    vi
      .mocked(modelCallTimesSince)
      .mockResolvedValue(Array<string>(MODEL_CALL_LIMIT).fill(at))

  it("counts each call for the session's organization before it's made", async () => {
    ask.mockResolvedValue({ body: "The root.", inferredRole: null })
    await explainSelection("a1", { kind: "box", path: "" })
    expect(record).toHaveBeenCalledWith({
      organizationId: "org_session",
      kind: "explanation",
    })
    expect(record.mock.invocationCallOrder[0]).toBeLessThan(
      ask.mock.invocationCallOrder[0]!
    )
  })

  it("at the limit, refuses with when explanations resume, asking nothing (AC-12)", async () => {
    atLimit("2026-10-18T09:30:00.000Z")
    const result = await explainSelection("a1", { kind: "box", path: "" })
    expect(result).toEqual({
      traced: false,
      status: "paused",
      resumesAt: "2026-10-19T09:30:00.000Z",
    })
    expect(ask).not.toHaveBeenCalled()
    expect(record).not.toHaveBeenCalled()
    expect(store).not.toHaveBeenCalled()
  })

  it("still shows a cached explanation at the limit: it asks nothing", async () => {
    atLimit("2026-10-18T09:30:00.000Z")
    vi.mocked(readExplanation).mockResolvedValue({
      body: "Cached.",
      inferredRole: null,
    } as Awaited<ReturnType<typeof readExplanation>>)
    const result = await explainSelection("a1", { kind: "box", path: "" })
    expect(result).toMatchObject({ status: "explained", cached: true })
    expect(modelCallTimesSince).not.toHaveBeenCalled()
  })
})

describe("staleness (spec 009, FR-014, FR-015, plan D-10)", () => {
  const app = { kind: "file", path: "lib/app.js" } as const
  const moved = "d".repeat(40)
  const headAt = (commit: string) =>
    vi.mocked(defaultBranchHead).mockResolvedValue({ branch: "main", commit })

  it("is current while the branch is at the analysed commit, with no fetch", async () => {
    headAt(stored.commit)
    expect(await stalenessOf("a1", app)).toEqual({ status: "current" })
    expect(fileAtCommit).not.toHaveBeenCalled()
  })

  it("says the repository moved when the file itself is unchanged", async () => {
    headAt(moved)
    vi.mocked(fileAtCommit).mockResolvedValue(bytes(SOURCES["lib/app.js"]))
    expect(await stalenessOf("a1", app)).toEqual({ status: "moved" })
    // Read at the branch's new commit, not the analysed one.
    expect(vi.mocked(fileAtCommit).mock.calls[0]?.[1]).toBe(moved)
  })

  it("says the file changed when its bytes differ", async () => {
    headAt(moved)
    vi.mocked(fileAtCommit).mockResolvedValue(bytes("// rewritten\n"))
    expect(await stalenessOf("a1", app)).toEqual({ status: "changed" })
  })

  it("says the file changed when it's gone", async () => {
    headAt(moved)
    vi.mocked(fileAtCommit).mockRejectedValue(
      new GitHubError({ kind: "not found", repository: "owner/demo" })
    )
    expect(await stalenessOf("a1", app)).toEqual({ status: "changed" })
  })

  it("holds a box to the branch alone, reading none of its files", async () => {
    headAt(moved)
    expect(await stalenessOf("a1", { kind: "box", path: "" })).toEqual({
      status: "moved",
    })
    expect(fileAtCommit).not.toHaveBeenCalled()
  })

  it("says nothing when GitHub doesn't answer", async () => {
    vi.mocked(defaultBranchHead).mockRejectedValue(
      new GitHubError({
        kind: "unavailable",
        repository: "owner/demo",
        status: 503,
      })
    )
    expect(await stalenessOf("a1", app)).toEqual({ status: "unknown" })
  })
})
