// Paths as the parser's result writes them: relative and "/"-separated on
// every OS (spec 001, FR-006, FR-007). One source for the packages that read
// the result; pure, with no Node.js import, so the browser can use it too.
// Exported at `@workspace/parser/paths`.

/** Code-unit order: the same on every machine and locale (FR-022). */
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Orders records by their path. */
export function byPath(a: { path: string }, b: { path: string }): number {
  return compareText(a.path, b.path)
}

/** The directory that holds a path: `a/b/c.ts` → `a/b`, `a.ts` → "" (FR-007). */
export function folderOf(path: string): string {
  const slash = path.lastIndexOf("/")
  return slash === -1 ? "" : path.slice(0, slash)
}

/** The last segment of a path: `a/b/c.ts` → `c.ts`. */
export function fileName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}
