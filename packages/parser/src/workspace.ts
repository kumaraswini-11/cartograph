import { readFileSync } from "node:fs"
import { join, posix } from "node:path"

import { isObject, readJsonc } from "./jsonc.ts"
import type { JsonObject, JsonValue } from "./jsonc.ts"

/** A package of the repository's own workspace (spec 001, FR-012). */
export type WorkspacePackage = {
  name: string
  /** Relative to the repository root, "/"-separated. */
  directory: string
  manifest: JsonObject
}

/** Conditions an `exports` target may match, read in the target's own order. */
const CONDITIONS = new Set([
  "source",
  "types",
  "import",
  "require",
  "node",
  "default",
])

/** The `packages:` list of a pnpm-workspace.yaml (a plain YAML list). */
function pnpmPatterns(text: string): Array<string> {
  const patterns: Array<string> = []
  let inPackages = false
  for (const line of text.split(/\r?\n/)) {
    if (/^packages\s*:/.test(line)) {
      inPackages = true
      continue
    }
    if (!inPackages) continue
    if (/^\S/.test(line)) break // the next top-level key
    const item = /^\s*-\s*(['"]?)(.+?)\1\s*(#.*)?$/.exec(line)
    if (item?.[2]) patterns.push(item[2])
  }
  return patterns
}

/** Workspace globs from pnpm-workspace.yaml, or the root package.json. */
function workspacePatterns(
  root: string,
  configs: ReadonlyArray<string>
): Array<string> {
  if (configs.includes("pnpm-workspace.yaml")) {
    return pnpmPatterns(readFileSync(join(root, "pnpm-workspace.yaml"), "utf8"))
  }
  const manifest = readJsonc(join(root, "package.json"))
  if (!isObject(manifest)) return []
  const workspaces = manifest.workspaces
  const list = isObject(workspaces) ? workspaces.packages : workspaces
  return Array.isArray(list)
    ? list.filter((p): p is string => typeof p === "string")
    : []
}

/** A workspace glob as a regular expression over "/"-separated paths. */
function globToRegExp(glob: string): RegExp {
  const pattern = glob.replace(/^\.\//, "").replace(/\/+$/, "")
  const source = pattern
    .split("/")
    .map((segment) =>
      segment === "**"
        ? ".*"
        : segment.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")
    )
    .join("/")
  return new RegExp(`^${source.replace(/\/\.\*$/, "(/.*)?")}$`)
}

/** Maps each workspace package's name to it, from its manifest. */
export function findWorkspacePackages(
  root: string,
  configs: ReadonlyArray<string>
): Map<string, WorkspacePackage> {
  const patterns = workspacePatterns(root, configs)
  const include = patterns.filter((p) => !p.startsWith("!")).map(globToRegExp)
  const exclude = patterns
    .filter((p) => p.startsWith("!"))
    .map((p) => globToRegExp(p.slice(1)))

  const packages = new Map<string, WorkspacePackage>()
  for (const config of configs) {
    if (posix.basename(config) !== "package.json" || config === "package.json")
      continue
    const directory = posix.dirname(config)
    if (
      !include.some((r) => r.test(directory)) ||
      exclude.some((r) => r.test(directory))
    )
      continue
    const manifest = readJsonc(join(root, config))
    if (isObject(manifest) && typeof manifest.name === "string") {
      packages.set(manifest.name, { name: manifest.name, directory, manifest })
    }
  }
  return packages
}

/** Splits `@scope/name/sub/path` into a workspace package and its subpath. */
export function matchWorkspacePackage(
  specifier: string,
  packages: ReadonlyMap<string, WorkspacePackage>
): { pkg: WorkspacePackage; subpath: string } | undefined {
  const parts = specifier.split("/")
  const nameLength = specifier.startsWith("@") ? 2 : 1
  const pkg = packages.get(parts.slice(0, nameLength).join("/"))
  if (!pkg) return undefined
  const rest = parts.slice(nameLength).join("/")
  return { pkg, subpath: rest === "" ? "." : `./${rest}` }
}

/** The paths an `exports` target names, with `*` replaced. */
function targetPaths(
  target: JsonValue | undefined,
  star: string
): Array<string> | null {
  if (typeof target === "string") return [target.replace(/\*/g, star)]
  if (Array.isArray(target)) {
    return target.flatMap((t) => targetPaths(t, star) ?? [])
  }
  if (isObject(target)) {
    for (const [condition, value] of Object.entries(target)) {
      if (CONDITIONS.has(condition)) return targetPaths(value, star)
    }
    return []
  }
  return null // `null` blocks the subpath
}

export type WorkspaceTarget =
  { paths: Array<string> } | { reason: "not exported" }

/**
 * The files a workspace import points at, relative to the repository root:
 * through the package's `exports` (exact keys, then `*` patterns, longest
 * prefix first, conditions in the target's own order), or its `module` and
 * `main` fields when it has no `exports`.
 */
export function workspaceTargets(
  pkg: WorkspacePackage,
  subpath: string
): WorkspaceTarget {
  const inPackage = (path: string) =>
    posix.normalize(posix.join(pkg.directory, path))
  const { exports, module, main } = pkg.manifest

  if (exports === undefined) {
    if (subpath !== ".") return { paths: [inPackage(subpath)] }
    const entry =
      typeof module === "string"
        ? module
        : typeof main === "string"
          ? main
          : "index"
    return { paths: [inPackage(entry)] }
  }

  const map: JsonObject =
    isObject(exports) && Object.keys(exports).some((key) => key.startsWith("."))
      ? exports
      : { ".": exports }

  let paths: Array<string> | null | undefined
  if (subpath in map) {
    paths = targetPaths(map[subpath], "")
  } else {
    const patterns = Object.keys(map)
      .filter((key) => key.includes("*"))
      .sort((a, b) => b.indexOf("*") - a.indexOf("*"))
    for (const key of patterns) {
      const [prefix = "", suffix = ""] = key.split("*")
      if (
        subpath.startsWith(prefix) &&
        subpath.endsWith(suffix) &&
        subpath.length >= key.length - 1
      ) {
        paths = targetPaths(
          map[key],
          subpath.slice(prefix.length, subpath.length - suffix.length)
        )
        break
      }
    }
  }
  if (!paths || paths.length === 0) return { reason: "not exported" }
  return { paths: paths.map(inPackage) }
}

/**
 * Where a build-output path comes from in source, through the package's
 * tsconfig `outDir` → `rootDir` (plan D-02). Both must be set: the parser
 * maps only what the configuration states, never a guess.
 */
export function sourceCandidates(
  pkg: WorkspacePackage,
  path: string,
  root: string
): Array<string> {
  const tsconfig = readJsonc(join(root, pkg.directory, "tsconfig.json"))
  const options = isObject(tsconfig) ? tsconfig.compilerOptions : undefined
  if (!isObject(options)) return []
  const { outDir, rootDir } = options
  if (typeof outDir !== "string" || typeof rootDir !== "string") return []

  const out = posix.normalize(posix.join(pkg.directory, outDir))
  if (!path.startsWith(`${out}/`)) return []
  const inSource = posix.join(
    posix.normalize(posix.join(pkg.directory, rootDir)),
    path.slice(out.length + 1)
  )

  const swaps: Array<[RegExp, Array<string>]> = [
    [/\.d\.ts$/, [".ts", ".tsx"]],
    [/\.d\.mts$/, [".mts"]],
    [/\.d\.cts$/, [".cts"]],
    [/\.js$/, [".ts", ".tsx", ".js", ".jsx"]],
    [/\.mjs$/, [".mts", ".mjs"]],
    [/\.cjs$/, [".cts", ".cjs"]],
  ]
  for (const [pattern, extensions] of swaps) {
    if (pattern.test(inSource))
      return extensions.map((e) => inSource.replace(pattern, e))
  }
  return [inSource]
}
