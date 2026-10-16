import { posix } from "node:path"

import type { PackageInput } from "./adapter.ts"
import { namedFiles } from "./manifest.ts"
import { localPath } from "./packages.ts"

const EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]

/** Configuration files a tool finds by name: `vite.config.ts`, `.eslintrc.cjs`. */
export const isConfigFile = (name: string) =>
  /\.config\.[cm]?[jt]sx?$/.test(name) || /^\.[\w-]+rc\.[cm]?js$/.test(name)

/** Test files a runner finds by name, or by a `__tests__` folder. */
export const isTestFile = (path: string) =>
  /[.-](test|spec)\.[cm]?[jt]sx?$/.test(posix.basename(path)) ||
  path.split("/").includes("__tests__")

/** The source files a manifest-named path can mean: as written, or its source. */
function candidates(path: string): Array<string> {
  const swaps: Record<string, Array<string>> = {
    ".js": [".ts", ".tsx"],
    ".jsx": [".tsx"],
    ".mjs": [".mts"],
    ".cjs": [".cts"],
  }
  const extension = posix.extname(path)
  const stem = path.slice(0, path.length - extension.length)
  return [
    path,
    ...EXTENSIONS.map((e) => `${path}${e}`),
    ...EXTENSIONS.map((e) => `${path}/index${e}`),
    ...(swaps[extension] ?? []).map((e) => `${stem}${e}`),
  ]
}

/**
 * The entry points every package has, whatever its framework (spec 002,
 * FR-007): files its manifest names or runs, configuration files and tests.
 */
export function commonEntryPoints(pkg: PackageInput): Set<string> {
  const files = new Set(pkg.files)
  const entryPoints = new Set<string>()
  for (const named of namedFiles(pkg.manifest)) {
    const local = posix.normalize(named.replace(/^\.\//, ""))
    if (local.startsWith("..")) continue
    for (const candidate of candidates(local)) {
      const path = pkg.path === "" ? candidate : `${pkg.path}/${candidate}`
      if (files.has(path)) {
        entryPoints.add(path)
        break
      }
    }
  }
  for (const file of pkg.files) {
    const local = localPath(pkg, file)
    if (isConfigFile(posix.basename(local)) || isTestFile(local)) {
      entryPoints.add(file)
    }
  }
  return entryPoints
}

/**
 * A role from the innermost folder whose name has one: `src/routes/v1/a.js`
 * is a Routes file when `routes` maps to Routes.
 */
export function roleFromFolders(
  local: string,
  roles: Readonly<Record<string, string>>
): string | undefined {
  const folders = posix.dirname(local).split("/").reverse()
  for (const folder of folders) {
    const role = roles[folder]
    if (role) return role
  }
  return undefined
}
