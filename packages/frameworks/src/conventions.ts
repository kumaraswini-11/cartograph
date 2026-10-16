import { posix } from "node:path"

import {
  SOURCE_EXTENSION_PATTERN,
  SOURCE_FOR,
  fileName,
  folderOf,
  withSourceExtensions,
} from "@workspace/parser/paths"

import type { PackageInput } from "./adapter.ts"
import { namedFiles } from "./manifest.ts"
import { localPath } from "./packages.ts"

const TOOL_CONFIG = new RegExp(`\\.config${SOURCE_EXTENSION_PATTERN}$`)
const TEST_FILE = new RegExp(`[.-](test|spec)${SOURCE_EXTENSION_PATTERN}$`)

/** A file's name without its last extension: `users.controller.ts` → `users.controller`. */
export function stemOf(path: string): string {
  const name = fileName(path)
  const dot = name.lastIndexOf(".")
  return dot <= 0 ? name : name.slice(0, dot)
}

/** A hook's file name: `useCart`, `use-cart`. */
export const isHookName = (stem: string) => /^use[A-Z-]/.test(stem)

/** Configuration files a tool finds by name: `vite.config.ts`, `.eslintrc.cjs`. */
export const isToolConfig = (name: string) =>
  TOOL_CONFIG.test(name) || /^\.[\w-]+rc\.[cm]?js$/.test(name)

/** Test files a runner finds by name, or by a `__tests__` folder. */
export const isTestFile = (path: string) =>
  TEST_FILE.test(fileName(path)) || path.split("/").includes("__tests__")

/**
 * The source files a manifest-named path can mean: as written (with an
 * extension or as a folder's index), or the source it's compiled from.
 */
function candidates(path: string): Array<string> {
  const extension = posix.extname(path)
  const stem = path.slice(0, path.length - extension.length)
  return [
    ...withSourceExtensions(path),
    ...(SOURCE_FOR[extension] ?? []).map((e) => `${stem}${e}`),
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
    if (isToolConfig(fileName(local)) || isTestFile(local)) {
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
  const folders = folderOf(local).split("/").reverse()
  for (const folder of folders) {
    const role = roles[folder]
    if (role) return role
  }
  return undefined
}
