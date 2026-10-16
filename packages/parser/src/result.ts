// The parser's result: the contract every later spec reads (spec 001, C-05).
// The Zod schema is the one source; the types are inferred from it, and
// readResult checks a result against it.
import { z } from "zod"

import { readJson, writeJson } from "./jsonc.ts"

export const SCHEMA_VERSION = 1

export const importKind = z.enum(["static", "re-export", "dynamic", "require"])
export type ImportKind = z.infer<typeof importKind>

export const unresolvedReason = z.enum([
  "not a literal",
  "not found",
  "points at build output",
  "not exported",
  "case mismatch",
])
export type UnresolvedReason = z.infer<typeof unresolvedReason>

const resolution = z.enum(["resolved", "external", "excluded", "unresolved"])

const fileRecord = z.object({
  /** Relative to the directory parsed, "/"-separated. */
  path: z.string(),
  /** The directory that holds the file, relative; "" for the root (FR-007). */
  folder: z.string(),
  lines: z.number().int().nonnegative(),
  /** SHA-256 of the file's bytes, hex. */
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  /** Files with an edge to this one (FR-017). */
  fanIn: z.number().int().nonnegative(),
  /** Files this one has an edge to (FR-017). */
  fanOut: z.number().int().nonnegative(),
})

const pathWithReason = z.object({ path: z.string(), reason: z.string() })

const importRecord = z.object({
  from: z.string(),
  line: z.number().int().positive(),
  /** The module as written; "" when the argument isn't a literal. */
  specifier: z.string(),
  kind: importKind,
  /** Exists only at compile time (FR-010). */
  typeOnly: z.boolean(),
  resolution,
  /** The file it resolved to, when resolved. */
  to: z.string().optional(),
  /** Why it leads nowhere, when unresolved (FR-013). */
  reason: unresolvedReason.optional(),
})

const edge = z.object({
  from: z.string(),
  to: z.string(),
  /** Every kind of import behind the edge (FR-016). */
  kinds: z.array(importKind).nonempty(),
  /** True only if every import behind the edge is type-only. */
  typeOnly: z.boolean(),
})

const coverage = z.object({
  filesFound: z.number().int().nonnegative(),
  filesParsed: z.number().int().nonnegative(),
  filesSkipped: z.number().int().nonnegative(),
  imports: z.record(resolution, z.number().int().nonnegative()),
  unresolvedByReason: z.array(
    z.object({
      reason: unresolvedReason,
      count: z.number().int().positive(),
      examples: z.array(
        z.object({
          file: z.string(),
          line: z.number().int().positive(),
          specifier: z.string(),
        })
      ),
    })
  ),
  /** resolved / (resolved + unresolved); null with none (FR-020). */
  figure: z.number().min(0).max(1).nullable(),
})

export const parsedRepository = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  files: z.array(fileRecord),
  /** Found but not parsed, each with its reason (FR-018). */
  skipped: z.array(pathWithReason),
  /** Directories and links never walked, each with its reason (FR-002). */
  excluded: z.array(pathWithReason),
  imports: z.array(importRecord),
  edges: z.array(edge),
  coverage,
})

export const tooLargeRepository = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  /** Over MAX_FILES: nothing was parsed (FR-005). */
  tooLarge: z.object({
    files: z.number().int().positive(),
    maxFiles: z.number().int().positive(),
  }),
})

export const parseResult = z.union([parsedRepository, tooLargeRepository])

export type FileRecord = z.infer<typeof fileRecord>
export type SkippedFile = z.infer<typeof pathWithReason>
export type ExcludedPath = z.infer<typeof pathWithReason>
export type ImportRecord = z.infer<typeof importRecord>
export type Edge = z.infer<typeof edge>
export type Coverage = z.infer<typeof coverage>
export type ParsedRepository = z.infer<typeof parsedRepository>
export type TooLargeRepository = z.infer<typeof tooLargeRepository>
export type ParseResult = z.infer<typeof parseResult>

export function isTooLarge(result: ParseResult): result is TooLargeRepository {
  return "tooLarge" in result
}

/** Writes a result as JSON: the same bytes for the same result (FR-021, FR-022). */
export function writeResult(path: string, result: ParseResult): void {
  writeJson(path, result)
}

/** Reads a written result back, checking it against the schema (FR-021). */
export function readResult(path: string): ParseResult {
  return readJson(path, parseResult)
}
