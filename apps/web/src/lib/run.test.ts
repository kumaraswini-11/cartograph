import { afterEach, describe, expect, it, vi } from "vitest"

import type { RunWriter } from "@workspace/database"
import { GitHubError, MAX_ARCHIVE_BYTES } from "@workspace/github"
import type { ParsedRepository } from "@workspace/parser"
import type { Detection } from "@workspace/frameworks"

import { runAnalysis } from "./run.server"
import type { RunDeps } from "./run.server"

vi.mock("@tanstack/react-start/server-only", () => ({}))

const COMMIT = "5ba419aa7350389a275ab45fde2e849ed1f02449"
const RUN = { runId: "run-1", repository: "expressjs/express" }

const parsed = {
  files: [{ path: "index.js" }, { path: "lib/app.js" }],
} as unknown as ParsedRepository
const detection = { files: [] } as unknown as Detection

/** Every call the run makes to storage, in order, as one line each. */
function recordingWriter(ended = new Set<string>()) {
  const calls: Array<string> = []
  const writer: RunWriter = {
    startAnalysis: () => Promise.reject(new Error("not used")),
    rerunAnalysis: () => Promise.reject(new Error("not used")),
    advanceRun: (_run, { stage, message, commit }) => {
      calls.push(
        `${stage}: ${message}${commit ? ` @ ${commit.slice(0, 7)}` : ""}`
      )
      return Promise.resolve(!ended.has(stage))
    },
    failRun: (_run, message) => {
      calls.push(`failed: ${message}`)
      return Promise.resolve()
    },
    finishRun: (_run, { message }) => {
      calls.push(`done: ${message}`)
      return Promise.resolve(true)
    },
  }
  return { writer, calls }
}

function deps(writer: RunWriter, overrides: Partial<RunDeps> = {}) {
  const removed: Array<string> = []
  const all: RunDeps = {
    writer,
    head: () => Promise.resolve({ branch: "master", commit: COMMIT }),
    extract: () => Promise.resolve(),
    parse: () => Promise.resolve({ parsed, detection }),
    workspace: () => "/tmp/run-1",
    remove: (directory) => removed.push(directory),
    ...overrides,
  }
  return { all, removed }
}

afterEach(() => vi.restoreAllMocks())

describe("a run (spec 008, FR-005 to FR-009)", () => {
  it("passes through each stage by name, then stores its results", async () => {
    const { writer, calls } = recordingWriter()
    const { all, removed } = deps(writer)
    await runAnalysis(RUN, all)
    expect(calls).toEqual([
      "fetching: Downloading expressjs/express at 5ba419a @ 5ba419a",
      "parsing: Parsing the JavaScript and TypeScript in expressjs/express",
      "storing: Storing the map of 2 files",
      "done: Mapped 2 files at 5ba419a",
    ])
    expect(removed).toEqual(["/tmp/run-1"])
  })

  it("extracts the commit it read, into the run's own folder", async () => {
    const { writer } = recordingWriter()
    const extract = vi.fn(() => Promise.resolve())
    await runAnalysis(RUN, deps(writer, { extract }).all)
    expect(extract).toHaveBeenCalledWith(
      "expressjs/express",
      COMMIT,
      "/tmp/run-1"
    )
  })

  it("fails at fetching when the repository doesn't exist (FR-008, AC-03)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const { writer, calls } = recordingWriter()
    const { all, removed } = deps(writer, {
      head: () =>
        Promise.reject(
          new GitHubError({ kind: "not found", repository: RUN.repository })
        ),
    })
    await runAnalysis(RUN, all)
    expect(calls).toEqual([
      "failed: expressjs/express doesn't exist or isn't public.",
    ])
    expect(removed).toEqual(["/tmp/run-1"])
  })

  it("fails naming the limit when the archive is too large (FR-009, AC-12)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const { writer, calls } = recordingWriter()
    await runAnalysis(
      RUN,
      deps(writer, {
        extract: () =>
          Promise.reject(
            new GitHubError({
              kind: "too large",
              repository: RUN.repository,
              limit: "archive",
              bytes: MAX_ARCHIVE_BYTES,
            })
          ),
      }).all
    )
    expect(calls.at(-1)).toBe(
      "failed: expressjs/express's archive is over 100 MB, the most Cartograph downloads."
    )
  })

  it("fails naming the parser's limit when there are too many files (FR-009)", async () => {
    const { writer, calls } = recordingWriter()
    await runAnalysis(
      RUN,
      deps(writer, {
        parse: () =>
          Promise.resolve({
            parsed: {
              schemaVersion: 1,
              tooLarge: { files: 7_000, maxFiles: 5_000 },
            },
            detection: null,
          }),
      }).all
    )
    expect(calls.at(-1)).toBe(
      "failed: expressjs/express has 7,000 JavaScript and TypeScript files, over the 5,000 Cartograph maps."
    )
  })

  it("records a failure in the stage it happened in, with a sentence (FR-007)", async () => {
    const logged = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    const { writer, calls } = recordingWriter()
    const { all, removed } = deps(writer, {
      parse: () => Promise.resolve({ error: "out of memory" }),
    })
    await runAnalysis(RUN, all)
    expect(calls.at(-1)).toBe(
      "failed: Something went wrong while parsing expressjs/express. Try running it again."
    )
    // The cause is logged for whoever runs the server, not shown.
    expect(String(logged.mock.calls[0]?.[1])).toMatch(/out of memory/)
    expect(removed).toEqual(["/tmp/run-1"])
  })

  it("stops without writing more once the run has been ended", async () => {
    // A re-run ended this run as stale while it was still going.
    const { writer, calls } = recordingWriter(new Set(["parsing"]))
    const parse = vi.fn(() => Promise.resolve({ parsed, detection }))
    const { all, removed } = deps(writer, { parse })
    await runAnalysis(RUN, all)
    expect(calls).toEqual([
      "fetching: Downloading expressjs/express at 5ba419a @ 5ba419a",
      "parsing: Parsing the JavaScript and TypeScript in expressjs/express",
    ])
    expect(parse).not.toHaveBeenCalled()
    expect(removed).toEqual(["/tmp/run-1"])
  })
})
