import { existsSync, rmSync } from "node:fs"
import { join } from "node:path"

import { checkout } from "@workspace/golden"
import { describe, expect, it } from "vitest"

import { PINS, archiveOf } from "./analysis.ts"

// Test files run in parallel processes, and each unpacks the archives it
// needs. Two unpacking the same one at once must both get it whole.
describe("unpacking a pinned archive (spec 011, plan D-03)", () => {
  it("survives several unpacking the same archive at once", async () => {
    const pin = PINS[0]
    if (pin === undefined) throw new Error("no pin")
    // A name of its own, so no other test's cache entry is touched.
    const repository = `concurrent/check-${process.pid.toString()}`
    const directories = await Promise.all(
      Array.from({ length: 4 }, () =>
        checkout(repository, pin.commit, { archive: archiveOf(pin) })
      )
    )
    try {
      expect(new Set(directories).size).toBe(1)
      const [directory] = directories
      expect(existsSync(join(directory ?? "", "package.json"))).toBe(true)
    } finally {
      for (const directory of new Set(directories)) {
        rmSync(directory, { recursive: true, force: true })
      }
    }
  }, 120_000)
})
