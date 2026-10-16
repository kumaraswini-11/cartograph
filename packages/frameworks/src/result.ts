// The detection result: what later specs read about frameworks, roles,
// entry points and routes (spec 002). The Zod schema is the one source; the
// types are inferred from it, and readDetection checks a file against it.
import { readJson, writeJson } from "@workspace/parser/json"
import { z } from "zod"

import { TIERS } from "./taxonomy.ts"

export const DETECTION_SCHEMA_VERSION = 2

/** The methods a route can carry: one each, never "any" (FR-015, FR-016). */
export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const

const packageRecord = z.object({
  /** Relative, "/"-separated; "" for the repository itself (FR-001). */
  path: z.string(),
  /** The detected framework's taxonomy name; null when none matched (FR-004). */
  framework: z.string().nullable(),
  /** Whether its routes were recovered exactly (spec 005, plan D-02). */
  routesRecovered: z.boolean(),
})

const fileRole = z.object({
  /** Every file the parser parsed, by its path. */
  path: z.string(),
  /** The path of the innermost package holding it (FR-001). */
  package: z.string(),
  /** A role of its package's taxonomy, or "Unidentified" (FR-005). */
  role: z.string(),
  /** Reached without an import (FR-006, FR-007). */
  entryPoint: z.boolean(),
})

const route = z.object({
  method: z.enum(HTTP_METHODS),
  /** The full path, in the framework's own notation (FR-015, FR-016). */
  path: z.string().startsWith("/"),
  file: z.string(),
  line: z.number().int().positive(),
})

const taxonomyEntry = z.object({
  role: z.string(),
  tier: z.enum(TIERS),
  /** Files with this role. */
  files: z.number().int().nonnegative(),
})

export const detection = z.object({
  schemaVersion: z.literal(DETECTION_SCHEMA_VERSION),
  packages: z.array(packageRecord),
  files: z.array(fileRole),
  routes: z.array(route),
  /** The analysis's one taxonomy, in reading order (FR-008, FR-009). */
  taxonomy: z.array(taxonomyEntry),
})

export type PackageRecord = z.infer<typeof packageRecord>
export type FileRole = z.infer<typeof fileRole>
export type Route = z.infer<typeof route>
export type HttpMethod = Route["method"]
export type TaxonomyEntry = z.infer<typeof taxonomyEntry>
export type Detection = z.infer<typeof detection>

/** Writes a detection as JSON: the same bytes for the same detection. */
export function writeDetection(path: string, result: Detection): void {
  writeJson(path, result)
}

/** Reads a written detection back, checking it against the schema. */
export function readDetection(path: string): Detection {
  return readJson(path, detection)
}
