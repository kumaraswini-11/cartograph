// Test helper: builds a small repository in a temporary directory.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

export type Repository = { directory: string; remove: () => void }

/** Writes each `path: content` pair under a new temporary directory. */
export function makeRepository(files: Record<string, string>): Repository {
  const directory = mkdtempSync(join(tmpdir(), "cartograph-parser-"))
  for (const [path, content] of Object.entries(files)) {
    const absolute = join(directory, path)
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, content)
  }
  return {
    directory,
    remove: () => rmSync(directory, { recursive: true, force: true }),
  }
}
