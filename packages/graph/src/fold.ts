import { compareText, folderOf } from "@workspace/parser/paths"

import { FOLD_MIN_FILES, FOLD_TARGET } from "./limits.ts"

/** One box of the map before labels and sizes: a folder and what folded in. */
export type Fold = {
  /** The folder it stands for; "" for the root. */
  folder: string
  /** It and every folder folded into it, in path order. */
  folders: Array<string>
  /** Its files and theirs, in path order. */
  files: Array<string>
}

const depthOf = (folder: string) =>
  folder === "" ? 0 : folder.split("/").length

/**
 * Folds at one threshold (FR-003): deepest first, a folder holding fewer than
 * `threshold` files merges into its parent; each depth is computed fresh from
 * the depth below. The root has no parent, so it never folds.
 */
export function foldAt(
  files: ReadonlyArray<{ path: string; folder: string }>,
  threshold: number
): Array<Fold> {
  const boxes = new Map<string, Fold>()
  for (const file of files) {
    let box = boxes.get(file.folder)
    if (!box) {
      box = { folder: file.folder, folders: [file.folder], files: [] }
      boxes.set(file.folder, box)
    }
    box.files.push(file.path)
  }

  const deepest = Math.max(0, ...[...boxes.keys()].map(depthOf))
  for (let depth = deepest; depth > 0; depth--) {
    const atDepth = [...boxes.values()]
      .filter((b) => depthOf(b.folder) === depth)
      .sort((a, b) => compareText(a.folder, b.folder))
    for (const box of atDepth) {
      if (box.files.length >= threshold) continue
      const parent = folderOf(box.folder)
      let into = boxes.get(parent)
      if (!into) {
        into = { folder: parent, folders: [], files: [] }
        boxes.set(parent, into)
      }
      into.folders.push(...box.folders)
      into.files.push(...box.files)
      boxes.delete(box.folder)
    }
  }

  return [...boxes.values()]
    .map((b) => ({
      folder: b.folder,
      folders: [...b.folders].sort(compareText),
      files: [...b.files].sort(compareText),
    }))
    .sort((a, b) => compareText(a.folder, b.folder))
}

/**
 * The map's boxes (FR-004, C-01): the threshold starts at `FOLD_MIN_FILES`
 * and rises by one until at most `FOLD_TARGET` boxes remain, stopping at the
 * lowest threshold that fits. It always ends: past the file count,
 * everything folds into the root.
 */
export function fold(
  files: ReadonlyArray<{ path: string; folder: string }>,
  target = FOLD_TARGET
): { threshold: number; boxes: Array<Fold> } {
  for (let threshold = FOLD_MIN_FILES; ; threshold++) {
    const boxes = foldAt(files, threshold)
    if (boxes.length <= target || threshold > files.length) {
      return { threshold, boxes }
    }
  }
}
