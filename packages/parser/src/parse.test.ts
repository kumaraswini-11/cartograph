import { createHash } from "node:crypto"
import { symlinkSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { countLines, folderOf, parseRepository } from "./parse.ts"
import { isTooLarge } from "./result.ts"
import type { ParsedRepository } from "./result.ts"
import { makeRepository } from "./testing.ts"
import type { Repository } from "./testing.ts"

let repository: Repository | undefined
afterEach(() => repository?.remove())

function parsed(files: Record<string, string>, options = {}): ParsedRepository {
  repository = makeRepository(files)
  const result = parseRepository(repository.directory, options)
  if (isTooLarge(result)) throw new Error("unexpectedly too large")
  return result
}

describe("folders (AC-02)", () => {
  it("gives each file the directory that holds it", () => {
    const result = parsed({ "a.ts": "", "a/b.ts": "", "a/b/c/d.ts": "" })
    expect(result.files.map((f) => [f.path, f.folder])).toEqual([
      ["a.ts", ""],
      ["a/b.ts", "a"],
      ["a/b/c/d.ts", "a/b/c"],
    ])
  })
})

describe("exclusions (AC-10)", () => {
  it("records installed packages, build output and version control as excluded, unparsed", () => {
    const result = parsed({
      "src/app.ts": "",
      "node_modules/react/index.js": "",
      "dist/app.js": "",
      ".git/hooks/pre-commit.js": "",
    })
    expect(result.files.map((f) => f.path)).toEqual(["src/app.ts"])
    expect(result.excluded).toEqual([
      { path: ".git", reason: "version control" },
      { path: "dist", reason: "build output" },
      { path: "node_modules", reason: "installed packages" },
    ])
  })

  it("treats dist, build, out and coverage as build output only at a package root", () => {
    const result = parsed({
      "build/app.js": "",
      "packages/ui/package.json": "{}",
      "packages/ui/dist/index.js": "",
      "scripts/build/run.ts": "",
      "src/out/view.ts": "",
    })
    expect(result.files.map((f) => f.path)).toEqual([
      "scripts/build/run.ts",
      "src/out/view.ts",
    ])
    expect(result.excluded).toEqual([
      { path: "build", reason: "build output" },
      { path: "packages/ui/dist", reason: "build output" },
    ])
  })

  it("never follows a symbolic link", () => {
    repository = makeRepository({ "src/app.ts": "" })
    symlinkSync(
      join(repository.directory, "src"),
      join(repository.directory, "linked"),
      "junction"
    )
    const result = parseRepository(repository.directory)
    if (isTooLarge(result)) throw new Error("unexpectedly too large")
    expect(result.files.map((f) => f.path)).toEqual(["src/app.ts"])
    expect(result.excluded).toEqual([
      { path: "linked", reason: "symbolic link" },
    ])
  })

  it("ignores files that aren't JavaScript or TypeScript", () => {
    const result = parsed({
      "a.ts": "",
      "styles.css": "",
      "data.json": "{}",
      "b.mjs": "",
    })
    expect(result.files.map((f) => f.path)).toEqual(["a.ts", "b.mjs"])
  })
})

describe("limits", () => {
  it("over the file limit, reports the count and parses nothing (AC-08)", () => {
    repository = makeRepository({ "a.ts": "", "b.ts": "", "c.ts": "" })
    expect(parseRepository(repository.directory, { maxFiles: 2 })).toEqual({
      schemaVersion: 1,
      tooLarge: { files: 3, maxFiles: 2 },
    })
  })

  it("skips a file over the byte limit as too large, unread", () => {
    const result = parsed(
      { "small.ts": "x", "big.ts": "x".repeat(11) },
      { maxFileBytes: 10 }
    )
    expect(result.files.map((f) => f.path)).toEqual(["small.ts"])
    expect(result.skipped).toEqual([{ path: "big.ts", reason: "too large" }])
  })
})

describe("file records", () => {
  it("records lines and the SHA-256 of the bytes", () => {
    const content = "const a = 1\nconst b = 2\n"
    const [file] = parsed({ "a.ts": content }).files
    expect(file?.lines).toBe(2)
    expect(file?.hash).toBe(createHash("sha256").update(content).digest("hex"))
  })

  it("counts found, parsed and skipped files (FR-018)", () => {
    const result = parsed(
      { "a.ts": "", "b.ts": "x".repeat(20) },
      { maxFileBytes: 10 }
    )
    expect(result.coverage).toMatchObject({
      filesFound: 2,
      filesParsed: 1,
      filesSkipped: 1,
    })
  })

  it("lists files by code unit, the same on every run and every OS", () => {
    // "Z" sorts before "a" by code unit; a locale-aware sort would swap them.
    // (No names differing only by case: macOS and Windows treat them as one.)
    const files = { "b.ts": "", "a/z.ts": "", "Z.ts": "", "a.ts": "" }
    const first = parsed(files).files.map((f) => f.path)
    repository?.remove()
    expect(parsed(files).files.map((f) => f.path)).toEqual(first)
    expect(first).toEqual(["Z.ts", "a.ts", "a/z.ts", "b.ts"])
  })
})

describe("helpers", () => {
  it("counts lines without counting a final newline", () => {
    expect(countLines("")).toBe(0)
    expect(countLines("a")).toBe(1)
    expect(countLines("a\n")).toBe(1)
    expect(countLines("a\nb")).toBe(2)
  })

  it("gives the root folder as an empty string", () => {
    expect(folderOf("a.ts")).toBe("")
    expect(folderOf("a/b/c.ts")).toBe("a/b")
  })
})
