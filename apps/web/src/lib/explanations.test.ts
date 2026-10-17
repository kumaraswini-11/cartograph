import { createHash } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import { readAnalysis, readExplanation, readResult } from "@workspace/database"
import { detectFrameworks } from "@workspace/frameworks"
import { fileAtCommit } from "@workspace/github"
import { isTooLarge, parseRepository } from "@workspace/parser"
import { makeRepository } from "@workspace/parser/testing"

import type * as Ai from "@workspace/ai"
import type * as GitHub from "@workspace/github"

import { explainSelection } from "./explanations.server"

vi.mock("@tanstack/react-start/server-only", () => ({}))
vi.mock("./analyses.server", () => ({
  currentOrganization: () => Promise.resolve("org_session"),
}))
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
vi.mock("@workspace/database", () => ({
  readAnalysis: vi.fn(),
  readResult: vi.fn(),
  readExplanation: vi.fn(),
  explanationWriter: () => ({ store }),
}))
vi.mock("@workspace/github", async (actual) => ({
  ...(await actual<typeof GitHub>()),
  fileAtCommit: vi.fn(),
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
