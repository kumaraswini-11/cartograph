import { readFileSync } from "node:fs"

/** A package manifest as read: a plain JSON object. */
export type Manifest = { readonly [key: string]: unknown }

/** The manifest at `path`, or undefined when it's missing or not JSON. */
export function readManifest(path: string): Manifest | undefined {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"))
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Manifest)
      : undefined
  } catch {
    return undefined
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** The packages a manifest declares, in any of its four lists (plan D-04). */
export function declaredPackages(manifest: Manifest | undefined): Set<string> {
  const declared = new Set<string>()
  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    const list = manifest?.[field]
    if (isRecord(list)) for (const name of Object.keys(list)) declared.add(name)
  }
  return declared
}

/** Every string an `exports` or `bin` value holds, at any depth. */
function strings(value: unknown): Array<string> {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (isRecord(value)) return Object.values(value).flatMap(strings)
  return []
}

/** A source file path inside a script command: `node scripts/seed.js`. */
const SCRIPT_FILE = /^(\.\/)?[\w@.-][\w@./-]*\.[cm]?[jt]sx?$/

/**
 * The files a manifest names (spec 002, FR-007), relative to its package:
 * its main, module, browser and types files, every `exports` and `bin`
 * target, and each file path in its scripts.
 */
export function namedFiles(manifest: Manifest | undefined): Array<string> {
  if (!manifest) return []
  const named = [
    ...["main", "module", "browser", "types", "typings"].flatMap((field) =>
      typeof manifest[field] === "string" ? [manifest[field]] : []
    ),
    ...strings(manifest.exports),
    ...strings(manifest.bin),
  ]
  const scripts = manifest.scripts
  if (isRecord(scripts)) {
    for (const command of Object.values(scripts)) {
      if (typeof command !== "string") continue
      for (const token of command.split(/[\s"'=]+|&&|\|\|?|;/)) {
        if (SCRIPT_FILE.test(token)) named.push(token)
      }
    }
  }
  return named
}
