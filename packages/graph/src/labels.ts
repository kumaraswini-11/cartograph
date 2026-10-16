/** The root box's label: it has no path of its own. */
export const ROOT_LABEL = "/"

/**
 * Each folder's label (FR-006): the fewest trailing segments of its path that
 * no other folder on the map ends with. `src/ui` and `docs/ui` become
 * `src/ui` and `docs/ui`; a lone `packages/parser` becomes `parser`.
 */
export function labels(folders: ReadonlyArray<string>): Map<string, string> {
  const segments = new Map(
    folders.map((f) => [f, f === "" ? [] : f.split("/")])
  )
  const tail = (parts: ReadonlyArray<string>, count: number) =>
    parts.slice(Math.max(0, parts.length - count)).join("/")

  const result = new Map<string, string>()
  for (const [folder, parts] of segments) {
    if (folder === "") {
      result.set(folder, ROOT_LABEL)
      continue
    }
    let count = 1
    while (
      count < parts.length &&
      [...segments].some(
        ([other, otherParts]) =>
          other !== folder && tail(otherParts, count) === tail(parts, count)
      )
    ) {
      count++
    }
    result.set(folder, tail(parts, count))
  }
  return result
}
