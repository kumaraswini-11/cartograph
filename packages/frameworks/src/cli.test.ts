// `detect <directory> [--out <file>]`: one command, nothing else started.
import { spawnSync } from "node:child_process"
import { join } from "node:path"

import { makeRepository } from "@workspace/parser/testing"
import type { Repository } from "@workspace/parser/testing"
import { afterEach, describe, expect, it } from "vitest"

import { readDetection } from "./result.ts"
import { manifest } from "./testing.ts"

const CLI = join(import.meta.dirname, "cli.ts")
const run = (...args: Array<string>) =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" })

let repository: Repository | undefined
afterEach(() => repository?.remove())

// Each case starts a Node.js process; under a busy machine (the full CI
// gate runs every package at once) that outlasts the default 5 s.
describe("detect <directory> [--out <file>]", { timeout: 30_000 }, () => {
  it("prints each package, the roles in order, and the routes", () => {
    repository = makeRepository({
      "package.json": manifest(["next"]),
      "app/page.tsx": "",
      "app/api/route.ts": "export function GET() {}",
    })
    const { status, stdout } = run(repository.directory)
    expect(status).toBe(0)
    expect(stdout).toContain("(root): Next.js")
    expect(stdout).toMatch(/Page routes\s+1\s+surface/)
    expect(stdout).toContain("GET     /api  app/api/route.ts:1")
  })

  it("writes the detection when asked, schema-checked on read", () => {
    repository = makeRepository({ "a.ts": "" })
    const out = join(repository.directory, "detection.json")
    expect(run(repository.directory, "--out", out).status).toBe(0)
    expect(readDetection(out)).toMatchObject({ schemaVersion: 2 })
  })

  it("prints its usage and exits 2 when called wrongly", () => {
    for (const args of [[], ["--out"], ["a", "b"], ["--nope", "a"]]) {
      const { status, stderr } = run(...args)
      expect(status).toBe(2)
      expect(stderr).toContain("Usage: detect <directory>")
    }
  })
})
