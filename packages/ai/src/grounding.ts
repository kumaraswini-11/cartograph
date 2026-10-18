import { SOURCE_EXTENSIONS, fileName, folderOf } from "@workspace/parser/paths"

import { parseExplanation } from "./text.ts"

/**
 * Something written like a file path: a slash-separated name ending in an
 * extension (`lib/router/index.js`, `config/app.json`), or, written as
 * code, a word with a source extension (`index.ts`). A package (`react`,
 * `@tanstack/react-router`) or a call (`res.json()`) isn't one.
 */
const SOURCE = new RegExp(
  `(?:${SOURCE_EXTENSIONS.map((e) => e.replace(".", "\\.")).join("|")})$`
)
const PATH_SHAPED = /^(?:[\w.@-]+\/)+[\w.-]+\.[A-Za-z0-9]+$/

export function looksLikePath(text: string, inCode: boolean): boolean {
  if (/\s|\(|\)/.test(text)) return false
  // A bare name counts only as code: in plain words, "Node.js" and
  // "Next.js" are products, not files.
  return PATH_SHAPED.test(text) || (inCode && SOURCE.test(text))
}

/**
 * The analysis's files, indexed once so every lookup is constant time: by
 * path, and by file name, with a name several files share marked as such;
 * and every folder that holds them.
 */
export type PathIndex = {
  paths: ReadonlySet<string>
  /** A file name's one path, or null when several files share the name. */
  byName: ReadonlyMap<string, string | null>
  /**
   * Every folder of the analysis, for grounding only: a folder named like
   * a file (`packages/socket.io`) is real, but never a link to a file.
   */
  folders: ReadonlySet<string>
}

export function pathIndex(paths: Iterable<string>): PathIndex {
  const all = new Set(paths)
  const byName = new Map<string, string | null>()
  const folders = new Set<string>()
  for (const path of all) {
    const name = fileName(path)
    byName.set(name, byName.has(name) ? null : path)
    // Each folder is walked up once: a seen one's parents are seen too.
    for (
      let folder = folderOf(path);
      folder !== "" && !folders.has(folder);
      folder = folderOf(folder)
    ) {
      folders.add(folder)
    }
  }
  return { paths: all, byName, folders }
}

/**
 * A path as the analysis has it, from how an explanation wrote it: the path
 * itself, or a file name only one file in the analysis has. Null when it
 * names no file there, or a name several files share.
 */
export function resolvePath(text: string, index: PathIndex): string | null {
  const path = text.replace(/^\.\//, "")
  if (index.paths.has(path)) return path
  if (path.includes("/")) return null
  return index.byName.get(path) ?? null
}

/**
 * Every file an explanation names that isn't in the analysis (spec 009,
 * FR-005, plan D-07). The model is asked to write paths as code; the plain
 * words are checked too, in case it doesn't. A name several files share
 * counts as found: it isn't invented, only short. Each word is looked at
 * once, so this is linear in the explanation's length.
 */
export function ungroundedPaths(text: string, index: PathIndex): Array<string> {
  const named = new Set<string>()
  for (const block of parseExplanation(text)) {
    const lines = block.kind === "paragraph" ? [block.runs] : block.items
    for (const runs of lines) {
      for (const run of runs) {
        const words = run.kind === "code" ? [run.text] : run.text.split(/\s+/)
        for (const word of words) {
          const trimmed = word.replace(/^[("'«]+|[)"'».,;:!?]+$/g, "")
          if (looksLikePath(trimmed, run.kind === "code")) {
            named.add(trimmed.replace(/^\.\//, ""))
          }
        }
      }
    }
  }
  return [...named].filter(
    (name) =>
      !index.paths.has(name) &&
      !index.byName.has(name) &&
      !index.folders.has(name)
  )
}
