import { existsSync } from "node:fs"
import { isAbsolute, join, posix, relative, sep } from "node:path"

import { ResolverFactory } from "oxc-resolver"
import type { NapiResolveOptions } from "oxc-resolver"

import { isObject, readJsonc } from "./jsonc.ts"
import type { UnresolvedReason } from "./result.ts"
import { SOURCE_EXTENSIONS } from "./walk.ts"
import {
  findWorkspacePackages,
  matchWorkspacePackage,
  sourceCandidates,
  workspaceTargets,
} from "./workspace.ts"
import type { WorkspacePackage } from "./workspace.ts"

export type Resolution =
  | { resolution: "resolved"; to: string }
  | { resolution: "external" }
  | { resolution: "excluded" }
  | { resolution: "unresolved"; reason: UnresolvedReason }

export type ResolverInput = {
  /** Absolute path of the directory being parsed. */
  root: string
  /** Every parsed file, relative. */
  files: ReadonlySet<string>
  /** Files found but not parsed (too large, parse errors), relative. */
  skipped: ReadonlySet<string>
  /** Excluded directories and links, relative. */
  excluded: ReadonlyArray<string>
  /** Configuration files the walk found, relative. */
  configs: ReadonlyArray<string>
}

/** A bare specifier that names an npm package: `react`, `@scope/pkg/sub`. */
const PACKAGE_NAME = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(\/.*)?$/i

const isRelative = (s: string) =>
  s.startsWith("./") || s.startsWith("../") || s === "." || s === ".."

/**
 * tsconfig/jsconfig `paths` keys, following `extends` that is relative or
 * names a workspace package (plan D-02).
 */
function pathAliases(
  root: string,
  configs: ReadonlyArray<string>,
  packages: ReadonlyMap<string, WorkspacePackage>
): Array<RegExp> {
  const keys = new Set<string>()
  const withJson = (path: string) =>
    path.endsWith(".json") ? path : `${path}.json`
  const parentConfigs = (absolute: string, parent: string): Array<string> => {
    if (isRelative(parent)) return [withJson(join(absolute, "..", parent))]
    const match = matchWorkspacePackage(parent, packages)
    if (!match) return []
    const target = workspaceTargets(match.pkg, match.subpath)
    return "paths" in target
      ? target.paths.map((path) => withJson(join(root, path)))
      : []
  }
  const read = (absolute: string, seen: Set<string>) => {
    if (seen.has(absolute)) return
    seen.add(absolute)
    const config = readJsonc(absolute)
    if (!isObject(config)) return
    const options = config.compilerOptions
    if (isObject(options) && isObject(options.paths)) {
      for (const key of Object.keys(options.paths)) keys.add(key)
    }
    const parents = Array.isArray(config.extends)
      ? config.extends
      : [config.extends]
    for (const parent of parents) {
      if (typeof parent !== "string") continue
      for (const target of parentConfigs(absolute, parent)) read(target, seen)
    }
  }
  for (const config of configs) {
    if (/(^|\/)(ts|js)config(\..+)?\.json$/.test(config))
      read(join(root, config), new Set())
  }
  return [...keys].map((key) => {
    const [prefix = "", suffix = ""] = key.split("*")
    const escape = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    return key.includes("*")
      ? new RegExp(`^${escape(prefix)}.*${escape(suffix)}$`)
      : new RegExp(`^${escape(key)}$`)
  })
}

/**
 * Builds the resolver for one repository (spec 001, FR-011 to FR-014). It
 * never looks in node_modules or NODE_PATH, so a repository resolves the same
 * whether or not its packages are installed (FR-022).
 */
export function createResolver(input: ResolverInput) {
  const { root, files, skipped, excluded, configs } = input
  const options: NapiResolveOptions = {
    modules: [],
    nodePath: false,
    builtinModules: true,
    symlinks: false,
    extensions: [
      ...SOURCE_EXTENSIONS.slice(0, 2),
      ".d.ts",
      ...SOURCE_EXTENSIONS.slice(2),
      ".json",
    ],
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".jsx": [".tsx", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    },
    mainFields: ["module", "main"],
    conditionNames: ["import", "require", "node", "default"],
  }
  const oxc = new ResolverFactory({ ...options, tsconfig: "auto" })
  // A tsconfig that `extends` a package can't load without node_modules, and
  // oxc then fails the whole import. TypeScript keeps the config's own
  // options instead; so does this, by resolving that import without it.
  const withoutTsconfig = new ResolverFactory(options)
  const resolveFile = (from: string, request: string) => {
    const result = oxc.resolveFileSync(join(root, from), request)
    return result.error?.startsWith("Tsconfig")
      ? withoutTsconfig.resolveFileSync(join(root, from), request)
      : result
  }
  const packages = findWorkspacePackages(root, configs)
  const aliases = pathAliases(root, configs, packages)
  const lowerCaseFiles = new Map([...files].map((f) => [f.toLowerCase(), f]))

  /** A path inside the root, relative and "/"-separated; undefined outside. */
  const inRoot = (absolute: string): string | undefined => {
    const path = relative(root, absolute).split(sep).join("/")
    return path.startsWith("..") || isAbsolute(path) ? undefined : path
  }

  /** Classifies a file that exists on disk (plan D-03). */
  const classify = (path: string): Resolution => {
    if (files.has(path)) return { resolution: "resolved", to: path }
    if (lowerCaseFiles.has(path.toLowerCase())) {
      return { resolution: "unresolved", reason: "case mismatch" }
    }
    if (skipped.has(path)) return { resolution: "excluded" }
    if (excluded.some((e) => path === e || path.startsWith(`${e}/`)))
      return { resolution: "excluded" }
    const isSource = SOURCE_EXTENSIONS.some((e) => path.endsWith(e))
    return isSource
      ? { resolution: "unresolved", reason: "not found" }
      : { resolution: "excluded" }
  }

  /** An import of a workspace package, through its manifest (plan D-02). */
  const resolveWorkspace = (specifier: string): Resolution | undefined => {
    const match = matchWorkspacePackage(specifier, packages)
    if (!match) return undefined
    const target = workspaceTargets(match.pkg, match.subpath)
    if ("reason" in target)
      return { resolution: "unresolved", reason: target.reason }
    for (const path of target.paths) {
      const found = withoutTsconfig.sync(
        join(root, posix.dirname(path)),
        `./${posix.basename(path)}`
      )
      const foundPath = found.path ? inRoot(found.path) : undefined
      if (foundPath !== undefined) return classify(foundPath)
      for (const source of sourceCandidates(match.pkg, path, root)) {
        if (files.has(source)) return { resolution: "resolved", to: source }
      }
    }
    return { resolution: "unresolved", reason: "points at build output" }
  }

  return (from: string, specifier: string, literal: boolean): Resolution => {
    if (!literal) return { resolution: "unresolved", reason: "not a literal" }
    // Bundler suffixes (`?url`, `?raw`) and fragments aren't part of the path.
    const request = specifier.replace(/(.)[?#].*$/, "$1")

    const result = resolveFile(from, request)
    if (result.builtin) return { resolution: "external" }
    if (result.path) {
      const path = inRoot(result.path)
      return path === undefined ? { resolution: "external" } : classify(path)
    }

    const workspace = resolveWorkspace(request)
    if (workspace) return workspace

    const bare =
      !isRelative(request) &&
      !request.startsWith("/") &&
      !request.startsWith("#")
    if (
      bare &&
      PACKAGE_NAME.test(request) &&
      !aliases.some((a) => a.test(request))
    ) {
      return { resolution: "external" }
    }
    if (isRelative(request)) {
      const target = posix.normalize(posix.join(posix.dirname(from), request))
      if (existsSync(join(root, target))) return classify(target)
      // Found only by ignoring case: Windows and macOS resolve it, Linux
      // doesn't. Report it the same everywhere (FR-022).
      const candidates = [
        target,
        ...SOURCE_EXTENSIONS.map((e) => `${target}${e}`),
        ...SOURCE_EXTENSIONS.map((e) => `${target}/index${e}`),
      ]
      const differsInCase = (c: string) => {
        const actual = lowerCaseFiles.get(c.toLowerCase())
        return actual !== undefined && actual !== c
      }
      if (candidates.some(differsInCase)) {
        return { resolution: "unresolved", reason: "case mismatch" }
      }
    }
    return { resolution: "unresolved", reason: "not found" }
  }
}
