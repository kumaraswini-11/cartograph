import { describe, expect, it } from "vitest"

import { fileAtCommit } from "./file.ts"
import { fakeFetch } from "./testing.ts"

const COMMIT = "5ba419aa7350389a275ab45fde2e849ed1f02449"

describe("fileAtCommit (spec 009, plan D-04)", () => {
  it("reads one file at the analysed commit, with no token", async () => {
    const fetch = fakeFetch(() => new Response("module.exports = {}\n"))
    const bytes = await fileAtCommit(
      "expressjs/express",
      COMMIT,
      "lib/my app/index.js",
      { maxBytes: 1_000_000, fetch }
    )
    expect(new TextDecoder().decode(bytes)).toBe("module.exports = {}\n")
    // Each segment escaped, the slashes kept.
    expect(fetch.urls).toEqual([
      `https://raw.githubusercontent.com/expressjs/express/${COMMIT}/lib/my%20app/index.js`,
    ])
  })

  it("refuses a file over the limit rather than cutting it", async () => {
    const fetch = fakeFetch(() => new Response("x".repeat(20)))
    await expect(
      fileAtCommit("expressjs/express", COMMIT, "big.js", {
        maxBytes: 10,
        fetch,
      })
    ).rejects.toMatchObject({ failure: { kind: "too large", bytes: 10 } })
  })

  it("stops reading a file once it passes the limit", async () => {
    let pulled = 0
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1
        controller.enqueue(new Uint8Array(4))
      },
    })
    const fetch = fakeFetch(() => new Response(endless))
    await expect(
      fileAtCommit("expressjs/express", COMMIT, "big.js", {
        maxBytes: 10,
        fetch,
      })
    ).rejects.toMatchObject({ failure: { kind: "too large" } })
    // Three chunks pass the limit; the stream is cancelled, not drained.
    expect(pulled).toBeLessThan(6)
  })

  it("reads 404 as a file that isn't there", async () => {
    const fetch = fakeFetch(() => new Response("", { status: 404 }))
    await expect(
      fileAtCommit("expressjs/express", COMMIT, "gone.js", {
        maxBytes: 10,
        fetch,
      })
    ).rejects.toMatchObject({ failure: { kind: "not found" } })
  })
})
