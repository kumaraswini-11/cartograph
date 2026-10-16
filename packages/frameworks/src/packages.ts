import { existsSync } from "node:fs"
import { join, posix } from "node:path"

import { readManifest } from "./manifest.ts"
import type { Manifest } from "./manifest.ts"

export type Package = {
  path: string
  manifest: Manifest | undefined
  files: Array<string>
}

/** A file's path relative to its package. */
export const localPath = (pkg: { path: string }, file: string) =>
  pkg.path === "" ? file : file.slice(pkg.path.length + 1)

const folderOf = (path: string) => {
  const folder = posix.dirname(path)
  return folder === "." ? "" : folder
}

/**
 * The repository's packages (spec 002, FR-001; plan D-03): the repository
 * itself, and each folder above a parsed file that holds a package.json.
 * Each file belongs to the innermost one. Sorted by path.
 */
export function findPackages(
  directory: string,
  files: ReadonlyArray<string>
): Array<Package> {
  const isPackage = new Map<string, boolean>([["", true]])
  const check = (folder: string) => {
    let known = isPackage.get(folder)
    if (known === undefined) {
      known = existsSync(join(directory, folder, "package.json"))
      isPackage.set(folder, known)
    }
    return known
  }

  const byPath = new Map<string, Package>()
  for (const file of files) {
    let folder = folderOf(file)
    while (folder !== "" && !check(folder)) folder = folderOf(folder)
    let pkg = byPath.get(folder)
    if (!pkg) {
      pkg = {
        path: folder,
        manifest: readManifest(join(directory, folder, "package.json")),
        files: [],
      }
      byPath.set(folder, pkg)
    }
    pkg.files.push(file)
  }
  if (!byPath.has("")) {
    byPath.set("", {
      path: "",
      manifest: readManifest(join(directory, "package.json")),
      files: [],
    })
  }
  return [...byPath.values()].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0
  )
}
