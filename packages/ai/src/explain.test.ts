import { APICallError } from "ai"
import { describe, expect, it, vi } from "vitest"

import {
  EXPLAIN_MAX_LINES,
  answerSchema,
  explainFile,
  fileCacheKey,
  filePrompt,
} from "./explain.ts"
import type { Ask, ExplainDeps, Explained, FileToExplain } from "./explain.ts"
import { pathIndex } from "./grounding.ts"

const FILE: FileToExplain = {
  repository: "expressjs/express",
  path: "lib/application.js",
  hash: "f".repeat(64),
  detectedRole: "unidentified",
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
  const all: ExplainDeps = {
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
