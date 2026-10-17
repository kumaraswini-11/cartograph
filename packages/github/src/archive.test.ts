import { randomBytes } from "node:crypto"
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { extractArchive, staysInside } from "./archive.ts"
import { GitHubError } from "./errors.ts"
import { MAX_ARCHIVE_BYTES } from "./limits.ts"
import { fakeFetch, tarball } from "./testing.ts"
import type { TarEntry } from "./testing.ts"

const COMMIT = "5ba419aa7350389a275ab45fde2e849ed1f02449"
const PREFIX = `express-${COMMIT}`

let root: string
let directory: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "github-archive-"))
  directory = join(root, "repository")
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

/** A fetch that answers with an archive of `entries` under GitHub's prefix. */
function serving(entries: ReadonlyArray<TarEntry>) {
  const archive = tarball(
    entries.map((e) => ({ ...e, path: `${PREFIX}/${e.path}` }))
  )
  return fakeFetch(() => new Response(archive))
}

const isSource = (path: string) => /\.(?:ts|js)$/.test(path)

describe("extractArchive", () => {
  it("writes every path, with contents only where they're read", async () => {
    const fetch = serving([
      { path: "", type: "directory" },
      { path: "src/", type: "directory" },
      { path: "src/index.ts", type: "file", content: "export {}\n" },
      { path: "src/logo.png", type: "file", content: "png" },
      { path: "assets/", type: "directory" },
      { path: "assets/logo.svg", type: "file", content: "<svg/>" },
      { path: "empty/", type: "directory" },
    ])
    const extracted = await extractArchive(
      "expressjs/express",
      COMMIT,
      directory,
      { fetch, contents: isSource }
    )

    expect(fetch.urls).toEqual([
      `https://codeload.github.com/expressjs/express/tar.gz/${COMMIT}`,
    ])
    expect(readFileSync(join(directory, "src", "index.ts"), "utf8")).toBe(
      "export {}\n"
    )
    // A checkout's every path is there, so a check that a file exists
    // answers as it would on a checkout; unread contents take no space.
    expect(readFileSync(join(directory, "src", "logo.png"), "utf8")).toBe("")
    expect(readFileSync(join(directory, "assets", "logo.svg"), "utf8")).toBe("")
    expect(readdirSync(join(directory, "empty"))).toEqual([])
    expect(extracted).toEqual({ files: 3, bytes: 10, links: 0 })
  })

  it("writes every file's contents by default", async () => {
    const fetch = serving([
      { path: "logo.svg", type: "file", content: "<svg/>" },
    ])
    await extractArchive("expressjs/express", COMMIT, directory, { fetch })
    expect(readFileSync(join(directory, "logo.svg"), "utf8")).toBe("<svg/>")
  })

  it("writes each link as a link to itself, which leads nowhere", async () => {
    const fetch = serving([
      { path: "src/", type: "directory" },
      { path: "src/index.ts", type: "file", content: "export {}\n" },
      { path: "src/secrets.ts", type: "symlink", target: "/etc/passwd" },
      { path: "src/up.ts", type: "symlink", target: "../../outside.ts" },
      {
        path: "src/same.ts",
        type: "hardlink",
        target: `${PREFIX}/src/index.ts`,
      },
    ])
    const extracted = await extractArchive(
      "expressjs/express",
      COMMIT,
      directory,
      { fetch, contents: isSource }
    )

    expect(extracted.links).toBe(3)
    for (const name of ["secrets.ts", "up.ts", "same.ts"]) {
      const path = join(directory, "src", name)
      // A reader listing the folder sees a link (spec 001 records it)...
      expect(lstatSync(path).isSymbolicLink()).toBe(true)
      // ...and anything that follows it reaches nothing.
      expect(existsSync(path)).toBe(false)
      expect(() => readFileSync(path)).toThrow(/ELOOP/)
    }
    expect(existsSync(join(root, "outside.ts"))).toBe(false)
  })

  it("refuses a path that leaves the folder", async () => {
    const fetch = serving([
      { path: "../escaped.ts", type: "file", content: "export {}\n" },
    ])
    await expect(
      extractArchive("expressjs/express", COMMIT, directory, { fetch })
    ).rejects.toThrow()
    expect(existsSync(join(root, "escaped.ts"))).toBe(false)
  })

  it.each(["../outside.ts", "a/../../outside.ts", "/etc/outside.ts"])(
    "refuses a link at %s, outside the folder",
    async (path) => {
      const archive = tarball([
        { path: `${PREFIX}/${path}`, type: "symlink", target: "x" },
      ])
      await expect(
        extractArchive("someone/hostile", COMMIT, directory, {
          fetch: fakeFetch(() => new Response(archive)),
        })
      ).rejects.toThrow(/a link outside its folder/)
      expect(existsSync(join(root, "outside.ts"))).toBe(false)
      expect(existsSync(join(root, "a"))).toBe(false)
    }
  )

  it("keeps a link's path inside the folder", () => {
    expect(staysInside("src/link.ts")).toBe(true)
    for (const path of [
      "",
      "../a",
      "a/../b",
      "/a",
      "a//b",
      "./a",
      "C:/a",
      "a\\b",
    ]) {
      expect(staysInside(path)).toBe(false)
    }
  })

  // AC-12: over MAX_ARCHIVE_BYTES, the download stops and the error names
  // the limit.
  it("stops an archive past its limit, naming the limit", async () => {
    let sent = 0
    const archive = tarball([
      {
        path: `${PREFIX}/big.ts`,
        type: "file",
        content: randomBytes(2_000_000),
      },
    ])
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= archive.length) return controller.close()
        controller.enqueue(archive.subarray(sent, sent + 16_384))
        sent += 16_384
      },
    })
    const fetch = fakeFetch(() => new Response(body))

    const error = await extractArchive("vercel/next.js", COMMIT, directory, {
      fetch,
      maxArchiveBytes: 50_000,
    }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(GitHubError)
    expect((error as GitHubError).failure).toEqual({
      kind: "too large",
      repository: "vercel/next.js",
      limit: "archive",
      bytes: 50_000,
    })
    // Stopped near the limit, never the whole archive: the streams read a
    // few chunks ahead of the count, and no more.
    expect(sent).toBeLessThan(archive.length)
    expect(sent).toBeLessThan(50_000 + 10 * 16_384)
  })

  it("names the limit in megabytes", () => {
    const error = new GitHubError({
      kind: "too large",
      repository: "vercel/next.js",
      limit: "archive",
      bytes: MAX_ARCHIVE_BYTES,
    })
    expect(error.message).toBe(
      "vercel/next.js's archive exceeds 100 MB, the most read"
    )
  })

  it("stops writing past the most an archive may unpack to", async () => {
    const fetch = serving([
      { path: "a.ts", type: "file", content: "a".repeat(600) },
      { path: "b.ts", type: "file", content: "b".repeat(600) },
    ])
    await expect(
      extractArchive("someone/bomb", COMMIT, directory, {
        fetch,
        maxExtractedBytes: 1000,
      })
    ).rejects.toMatchObject({
      failure: { kind: "too large", limit: "extracted", bytes: 1000 },
    })
    expect(existsSync(join(directory, "b.ts"))).toBe(false)
  })

  it("reads 404 as a repository that doesn't exist or isn't public", async () => {
    const fetch = fakeFetch(() => new Response("", { status: 404 }))
    await expect(
      extractArchive("someone/missing", COMMIT, directory, { fetch })
    ).rejects.toMatchObject({ failure: { kind: "not found" } })
  })

  it("reads any other refusal as GitHub being unavailable", async () => {
    const fetch = fakeFetch(() => new Response("", { status: 502 }))
    await expect(
      extractArchive("expressjs/express", COMMIT, directory, { fetch })
    ).rejects.toMatchObject({ failure: { kind: "unavailable", status: 502 } })
  })
})
