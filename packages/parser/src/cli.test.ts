// FR-023: one command, nothing else started.
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { readResult } from "./result.ts"
import { makeRepository } from "./testing.ts"
import type { Repository } from "./testing.ts"

const CLI = join(import.meta.dirname, "cli.ts")
const run = (...args: Array<string>) =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" })

let repository: Repository | undefined
afterEach(() => repository?.remove())

// Each case starts a Node.js process; under a busy machine (the full CI
// gate runs every package at once) that outlasts the default 5 s.
describe(
  "parse <directory> [--out <file>] (FR-023)",
  { timeout: 30_000 },
  () => {
    it("prints the counts and the coverage figure", () => {
      repository = makeRepository({ "a.ts": 'import "./b"', "b.ts": "" })
      const { status, stdout } = run(repository.directory)
      expect(status).toBe(0)
      expect(stdout).toContain("Files found:   2")
      expect(stdout).toContain("Coverage: 100.0% of 1 imports resolved")
    })

    it("writes the result when asked, with the option before or after", () => {
      repository = makeRepository({ "a.ts": "" })
      const out = join(repository.directory, "result.json")
      expect(run("--out", out, repository.directory).status).toBe(0)
      expect(readResult(out)).toMatchObject({ schemaVersion: 1 })
      expect(run(repository.directory, "--out", out).status).toBe(0)
    })

    it("reports no imports found, not a figure, for an empty directory", () => {
      repository = makeRepository({})
      expect(run(repository.directory).stdout).toContain(
        "Coverage: no imports found"
      )
    })

    it("prints its usage and exits 2 when called wrongly", () => {
      for (const args of [[], ["--out"], ["a", "b"], ["--nope", "a"]]) {
        const { status, stderr } = run(...args)
        expect(status).toBe(2)
        expect(stderr).toContain("Usage: parse <directory>")
      }
    })
  }
)
