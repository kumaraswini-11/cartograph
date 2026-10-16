import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { byPath, compareText, isSourceFile } from "./paths.ts"

/** Directories never parsed, by name, with the reason recorded for each. */
const EXCLUDED_DIRECTORIES: ReadonlyMap<string, string> = new Map([
  ["node_modules", "installed packages"],
  ["bower_components", "installed packages"],
  ["jspm_packages", "installed packages"],
  [".pnpm-store", "installed packages"],
  [".git", "version control"],
  [".hg", "version control"],
  [".svn", "version control"],
  ["dist", "build output"],
  ["build", "build output"],
  ["out", "build output"],
  [".output", "build output"],
  [".next", "build output"],
  [".nuxt", "build output"],
  [".svelte-kit", "build output"],
  [".vercel", "build output"],
  ["coverage", "build output"],
  [".turbo", "tool cache"],
  [".cache", "tool cache"],
  [".nitro", "tool cache"],
  [".tanstack", "tool cache"],
  [".vinxi", "tool cache"],
  [".wrangler", "tool cache"],
])

/**
 * Plain words a repository also uses for its own source (`scripts/build/`):
 * build output only at a package root, where tools write it.
 */
const PACKAGE_ROOT_ONLY: ReadonlySet<string> = new Set([
  "dist",
  "build",
  "out",
  "coverage",
])

export type WalkedFile = {
  /** Relative to the directory walked, "/"-separated. */
  path: string
  absolutePath: string
  bytes: number
}

export type Excluded = { path: string; reason: string }

export type Walk =
  | { tooLarge: { files: number } }
  | {
      files: Array<WalkedFile>
      excluded: Array<Excluded>
      /** package.json, pnpm-workspace.yaml and tsconfig/jsconfig files. */
      configs: Array<string>
    }

export type WalkOptions = { maxFiles: number }

/** A project's TypeScript settings: `tsconfig.json`, `jsconfig.app.json`. */
export function isTsConfig(name: string): boolean {
  return /^(ts|js)config(\..+)?\.json$/.test(name)
}

/** Configuration files resolution reads (workspaces, tsconfig paths). */
export function isConfigFile(name: string): boolean {
  return (
    name === "package.json" ||
    name === "pnpm-workspace.yaml" ||
    isTsConfig(name)
  )
}

/**
 * Lists every source file under `directory`, skipping excluded directories
 * and symbolic links (each recorded with its reason). Over `maxFiles` files,
 * it returns `tooLarge` with the count and nothing else (spec 001, FR-005).
 */
export function walk(directory: string, options: WalkOptions): Walk {
  const files: Array<WalkedFile> = []
  const excluded: Array<Excluded> = []
  const configs: Array<string> = []
  const pending: Array<string> = [""]

  // Iterative, not recursive: a deep tree mustn't exhaust the call stack.
  for (
    let relative = pending.pop();
    relative !== undefined;
    relative = pending.pop()
  ) {
    const absolute = join(directory, relative)
    const entries = readdirSync(absolute, { withFileTypes: true })
    const isPackageRoot =
      relative === "" ||
      entries.some((e) => e.isFile() && e.name === "package.json")
    for (const entry of entries) {
      const path = relative === "" ? entry.name : `${relative}/${entry.name}`
      if (entry.isSymbolicLink()) {
        excluded.push({ path, reason: "symbolic link" })
      } else if (entry.isDirectory()) {
        const reason =
          PACKAGE_ROOT_ONLY.has(entry.name) && !isPackageRoot
            ? undefined
            : EXCLUDED_DIRECTORIES.get(entry.name)
        if (reason === undefined) pending.push(path)
        else excluded.push({ path, reason })
      } else if (entry.isFile() && isConfigFile(entry.name)) {
        configs.push(path)
      } else if (entry.isFile() && isSourceFile(entry.name)) {
        const absolutePath = join(absolute, entry.name)
        files.push({ path, absolutePath, bytes: statSync(absolutePath).size })
      }
    }
  }

  if (files.length > options.maxFiles)
    return { tooLarge: { files: files.length } }
  return {
    files: files.sort(byPath),
    excluded: excluded.sort(byPath),
    configs: configs.sort(compareText),
  }
}
