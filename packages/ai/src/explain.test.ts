import { APICallError } from "ai"
import { describe, expect, it, vi } from "vitest"

import { UNIDENTIFIED } from "@workspace/frameworks/taxonomy"

import {
  answerSchema,
  boxCacheKey,
  boxPrompt,
  explainBox,
  explainFile,
  fileCacheKey,
  filePrompt,
} from "./explain.ts"
import type {
  Ask,
  BoxToExplain,
  Explained,
  FileExplainDeps,
  FileToExplain,
} from "./explain.ts"
import { pathIndex } from "./grounding.ts"
import { EXPLAIN_MAX_LINES } from "./source.ts"

const FILE: FileToExplain = {
  repository: "expressjs/express",
  path: "lib/application.js",
  hash: "f".repeat(64),
  // The role `002` really gives, from its one source.
  detectedRole: UNIDENTIFIED,
  dependencies: ["lib/router/index.js"],
  dependents: ["index.js"],
  analysisPaths: pathIndex([
    "lib/application.js",
    "lib/router/index.js",
    "index.js",
  ]),
}

/** Deps with an empty cache, a short source and the answers given, in turn. */
function deps(answers: Array<unknown>, cache = new Map<string, Explained>()) {
  const asked: Array<{ system: string; prompt: string }> = []
  const ask: Ask = (request) => {
    asked.push(request)
    const next = answers.shift()
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
  }
  const all: FileExplainDeps = {
    traced: (_name, fn) => fn,
    read: (key) => Promise.resolve(cache.get(key) ?? null),
    write: (key, explanation) => {
      cache.set(key, explanation)
      return Promise.resolve()
    },
    source: vi.fn(() => Promise.resolve("module.exports = createApp\n")),
    ask,
  }
  return { all, asked, cache }
}

describe("explaining a file (spec 009)", () => {
  it("writes from the real neighbours and caches the answer (FR-001, FR-010)", async () => {
    const { all, asked, cache } = deps([
      {
        body: "Creates the app; routes come from `lib/router/index.js`.",
        inferredRole: "service",
      },
    ])
    expect(await explainFile(FILE, all)).toEqual({
      status: "explained",
      cached: false,
      explanation: {
        body: "Creates the app; routes come from `lib/router/index.js`.",
        inferredRole: "service",
      },
    })
    expect(cache.size).toBe(1)
    // The neighbours are handed over; the model never looks for them (C-01).
    expect(asked[0]?.prompt).toContain("- `lib/router/index.js`")
    expect(asked[0]?.prompt).toContain("- `index.js`")
    expect(asked[0]?.system).toMatch(/complete and exact/)
  })

  it("serves a hit from the cache with no model call and no fetch (FR-011)", async () => {
    const cached: Explained = { body: "From the cache.", inferredRole: null }
    const { all, asked } = deps([], new Map([[fileCacheKey(FILE), cached]]))
    expect(await explainFile(FILE, all)).toEqual({
      status: "explained",
      cached: true,
      explanation: cached,
    })
    expect(asked).toEqual([])
    expect(all.source).not.toHaveBeenCalled()
  })

  // AC-05, FR-006: an answer naming an absent file is asked for once more,
  // then refused, and nothing is cached.
  it("asks once more when an answer names an absent file", async () => {
    const { all, asked } = deps([
      { body: "See `lib/ghost.js`.", inferredRole: null },
      { body: "See `lib/router/index.js`.", inferredRole: null },
    ])
    expect(await explainFile(FILE, all)).toMatchObject({
      status: "explained",
      explanation: { body: "See `lib/router/index.js`." },
    })
    expect(asked[1]?.prompt).toMatch(
      /aren't in this repository: lib\/ghost\.js/
    )
  })

  it("refuses a second ungrounded answer and caches nothing (AC-05)", async () => {
    const { all, cache } = deps([
      { body: "See `lib/ghost.js`.", inferredRole: null },
      { body: "See `lib/phantom.js`.", inferredRole: null },
    ])
    expect(await explainFile(FILE, all)).toEqual({ status: "ungrounded" })
    expect(cache.size).toBe(0)
  })

  // AC-07, C-02: an inferred role is one of the fixed ones, never a surface
  // role, whatever the model returns.
  it("never accepts a surface role", async () => {
    expect(
      answerSchema.safeParse({ body: "x", inferredRole: "page route" }).success
    ).toBe(false)
    const { all, cache } = deps([{ body: "x", inferredRole: "page route" }])
    await expect(explainFile(FILE, all)).rejects.toThrow()
    expect(cache.size).toBe(0)
  })

  it("keeps an inferred role only for a file no convention identified", async () => {
    const { all, asked } = deps([
      { body: "A page.", inferredRole: "component" },
    ])
    const outcome = await explainFile({ ...FILE, detectedRole: "page" }, all)
    expect(outcome).toMatchObject({ explanation: { inferredRole: null } })
    expect(asked[0]?.system).toMatch(/Set inferredRole to null/)
  })

  it("says the limit is reached, without retrying or caching", async () => {
    const limit = new APICallError({
      message: "quota",
      url: "u",
      requestBodyValues: {},
      statusCode: 429,
    })
    const { all, asked, cache } = deps([limit])
    expect(await explainFile(FILE, all)).toEqual({ status: "limited" })
    expect(asked).toHaveLength(1)
    expect(cache.size).toBe(0)
  })

  it("misses the cache when a neighbour changes, in any order otherwise", () => {
    const key = fileCacheKey(FILE)
    expect(fileCacheKey({ ...FILE, dependencies: ["lib/other.js"] })).not.toBe(
      key
    )
    expect(
      fileCacheKey({
        ...FILE,
        dependents: [...FILE.dependents].reverse(),
      })
    ).toBe(key)
    expect(fileCacheKey({ ...FILE, hash: "e".repeat(64) })).not.toBe(key)
    // Everything the prompt states: an answer can name any of it.
    expect(fileCacheKey({ ...FILE, path: "lib/app.js" })).not.toBe(key)
    expect(fileCacheKey({ ...FILE, repository: "fork/express" })).not.toBe(key)
    expect(fileCacheKey({ ...FILE, detectedRole: "page" })).not.toBe(key)
  })
})

describe("the prompt (spec 009, C-05)", () => {
  it("fences the source off as data, and shortens a long file", () => {
    const long = Array.from({ length: 600 }, (_, i) => `line ${i + 1}`).join(
      "\n"
    )
    const { prompt, shortened } = filePrompt(FILE, long)
    expect(shortened).toBe(true)
    expect(prompt).toContain(
      `shortened to the first ${EXPLAIN_MAX_LINES} of 600 lines`
    )
    expect(prompt).toContain("line 500")
    expect(prompt).not.toContain("line 501")
    expect(prompt).toMatch(/<<<SOURCE\n[\s\S]*\nSOURCE>>>$/)
  })
})

const BOX: BoxToExplain = {
  repository: "expressjs/express",
  folder: "lib/router",
  folders: ["lib/router"],
  files: [
    { path: "lib/router/route.js", hash: "a".repeat(64), role: UNIDENTIFIED },
    { path: "lib/router/index.js", hash: "b".repeat(64), role: UNIDENTIFIED },
  ],
  incoming: [{ from: "lib/application.js", to: "lib/router/index.js" }],
  outgoing: [],
  analysisPaths: pathIndex([
    "lib/application.js",
    "lib/router/index.js",
    "lib/router/route.js",
  ]),
}

describe("explaining a box (spec 009, FR-002)", () => {
  it("writes about the folder from its files and the imports across its edge", async () => {
    const { all, asked, cache } = deps([
      {
        body: "Routing; `lib/application.js` uses `lib/router/index.js`.",
        inferredRole: "service",
      },
    ])
    expect(await explainBox(BOX, all)).toMatchObject({
      status: "explained",
      cached: false,
      // A box has no role to infer.
      explanation: { inferredRole: null },
    })
    expect(cache.size).toBe(1)
    // Its facts only: no source is fetched for a box.
    expect(all.source).not.toHaveBeenCalled()
    expect(asked[0]?.system).toMatch(/one box/)
    expect(asked[0]?.prompt).toContain("Folders in it: `lib/router`")
    expect(asked[0]?.prompt).toContain(
      "- `lib/application.js` imports `lib/router/index.js`"
    )
    expect(asked[0]?.prompt).toContain(
      "Imports out of it, to files outside:\nnone"
    )
  })

  it("refuses an answer naming a file outside the analysis (FR-006)", async () => {
    const { all, cache } = deps([
      { body: "See `lib/ghost.js`.", inferredRole: null },
      { body: "See `lib/phantom.js`.", inferredRole: null },
    ])
    expect(await explainBox(BOX, all)).toEqual({ status: "ungrounded" })
    expect(cache.size).toBe(0)
  })

  it("misses the cache when a file or an edge changes, and never matches a file's key", () => {
    const key = boxCacheKey(BOX)
    expect(boxCacheKey({ ...BOX, files: [...BOX.files].reverse() })).toBe(key)
    expect(
      boxCacheKey({
        ...BOX,
        files: [{ ...BOX.files[0]!, hash: "c".repeat(64) }, BOX.files[1]!],
      })
    ).not.toBe(key)
    expect(boxCacheKey({ ...BOX, incoming: [] })).not.toBe(key)
    expect(
      boxCacheKey({
        ...BOX,
        files: [{ ...BOX.files[0]!, role: "page" }, BOX.files[1]!],
      })
    ).not.toBe(key)
    expect(boxCacheKey({ ...BOX, folders: ["lib/router", "lib/x"] })).not.toBe(
      key
    )
    expect(key).not.toBe(fileCacheKey(FILE))
  })

  it("names at most the limit of each list, and counts the rest", () => {
    const files = Array.from({ length: 70 }, (_, i) => ({
      path: `src/f${String(i).padStart(2, "0")}.js`,
      hash: "d".repeat(64),
      role: "component",
    }))
    const prompt = boxPrompt({
      ...BOX,
      folder: "",
      folders: ["", "src"],
      files,
    })
    expect(prompt).toContain("Box: (the repository's root)")
    expect(prompt).toContain("Folders in it: (the repository's root), `src`")
    expect(prompt).toContain("Files: 70, by role: component 70")
    expect(prompt).toContain("src/f59.js")
    expect(prompt).not.toContain("src/f60.js")
    expect(prompt).toContain("…and 10 more")
  })
})
