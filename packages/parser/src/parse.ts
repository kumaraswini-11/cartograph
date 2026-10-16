import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

import { extractImports } from "./extract.ts"
import type { ExtractedImport } from "./extract.ts"
import { measureCoverage } from "./coverage.ts"
import { folderOf } from "./paths.ts"
import { buildEdges, fanCounts } from "./graph.ts"
import { COVERAGE_EXAMPLES, MAX_FILES, MAX_FILE_BYTES } from "./limits.ts"
import { SCHEMA_VERSION } from "./result.ts"
import type {
  FileRecord,
  ImportRecord,
  ParseResult,
  SkippedFile,
} from "./result.ts"
import { createResolver } from "./resolve.ts"
import { walk } from "./walk.ts"

export type ParseOptions = {
  /** Defaults to MAX_FILES; tests pass a smaller one. */
  maxFiles?: number
  /** Defaults to MAX_FILE_BYTES; tests pass a smaller one. */
  maxFileBytes?: number
}

/** Lines in `text`; a final newline doesn't start another line. */
export function countLines(text: string): number {
  if (text === "") return 0
  const breaks = text.split("\n").length - 1
  return text.endsWith("\n") ? breaks : breaks + 1
}

/**
 * Parses the JavaScript and TypeScript in `directory` (spec 001). Reads only
 * that directory and fetches nothing (FR-001).
 */
export function parseRepository(
  directory: string,
  options: ParseOptions = {}
): ParseResult {
  const maxFiles = options.maxFiles ?? MAX_FILES
  const maxFileBytes = options.maxFileBytes ?? MAX_FILE_BYTES

  const walked = walk(directory, { maxFiles })
  if ("tooLarge" in walked) {
    return {
      schemaVersion: SCHEMA_VERSION,
      tooLarge: { files: walked.tooLarge.files, maxFiles },
    }
  }

  const files: Array<Omit<FileRecord, "fanIn" | "fanOut">> = []
  const skipped: Array<SkippedFile> = []
  const extracted: Array<ExtractedImport & { from: string }> = []
  for (const file of walked.files) {
    if (file.bytes > maxFileBytes) {
      skipped.push({ path: file.path, reason: "too large" })
      continue
    }
    const bytes = readFileSync(file.absolutePath)
    const text = bytes.toString("utf8")
    const extraction = extractImports(file.path, text)
    if ("error" in extraction) {
      skipped.push({
        path: file.path,
        reason: `parse error: ${extraction.error}`,
      })
      continue
    }
    files.push({
      path: file.path,
      folder: folderOf(file.path),
      lines: countLines(text),
      hash: createHash("sha256").update(bytes).digest("hex"),
    })
    for (const found of extraction.imports)
      extracted.push({ from: file.path, ...found })
  }

  const resolve = createResolver({
    root: directory,
    files: new Set(files.map((f) => f.path)),
    skipped: new Set(skipped.map((s) => s.path)),
    excluded: walked.excluded.map((e) => e.path),
    configs: walked.configs,
  })
  const imports: Array<ImportRecord> = extracted.map(
    ({ literal, ...found }) => ({
      ...found,
      ...resolve(found.from, found.specifier, literal),
    })
  )

  const edges = buildEdges(imports)
  const fans = fanCounts(edges)

  return {
    schemaVersion: SCHEMA_VERSION,
    files: files.map((f) => ({
      ...f,
      ...(fans.get(f.path) ?? { fanIn: 0, fanOut: 0 }),
    })),
    skipped,
    excluded: walked.excluded,
    imports,
    edges,
    coverage: {
      filesFound: walked.files.length,
      filesParsed: files.length,
      filesSkipped: skipped.length,
      ...measureCoverage(imports, COVERAGE_EXAMPLES),
    },
  }
}
