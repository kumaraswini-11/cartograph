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

/** Extensions of the JavaScript and TypeScript files the parser reads (FR-003). */
export const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
] as const

/** True when `path` ends in one of the source extensions. */
export function isSourceFile(path: string): boolean {
  return SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension))
}

/**
 * True when the parser or detection reads `path`'s contents: source files,
 * `pnpm-workspace.yaml`, and every `.json`, since `package.json` and the
 * tsconfig files are JSON and a tsconfig may extend any JSON file. Every
 * other file matters to them only by existing (an import of `./logo.svg`
 * resolves when the file is there), so a copy of a repository needs these
 * files' contents and only the others' names (spec 008, plan D-03).
 */
export function isReadFile(path: string): boolean {
  const name = fileName(path)
  return (
    isSourceFile(name) ||
    name.endsWith(".json") ||
    name === "pnpm-workspace.yaml"
  )
}

/**
 * Any source extension, for building a regular expression: `\.(?:ts|tsx|…)`.
 * One source with `SOURCE_EXTENSIONS`, so a pattern never drifts from it.
 */
export const SOURCE_EXTENSION_PATTERN = `\\.(?:${SOURCE_EXTENSIONS.map((e) => e.slice(1)).join("|")})`

/**
 * The source files a compiled extension can come from, in the order
 * TypeScript tries them: an import of `./a.js` means `a.ts`, `a.tsx`, `a.js`
 * or `a.jsx` (TypeScript's module resolution: file extension substitution).
 */
export const SOURCE_FOR: Readonly<Record<string, ReadonlyArray<string>>> = {
  ".js": [".ts", ".tsx", ".js", ".jsx"],
  ".jsx": [".tsx", ".jsx"],
  ".mjs": [".mts", ".mjs"],
  ".cjs": [".cts", ".cjs"],
}

/**
 * The files a path written without its extension can mean, in the order a
 * resolver tries them: as written, with each source extension, then as a
 * folder's index.
 */
export function withSourceExtensions(path: string): Array<string> {
  return [
    path,
    ...SOURCE_EXTENSIONS.map((e) => `${path}${e}`),
    ...SOURCE_EXTENSIONS.map((e) => `${path}/index${e}`),
  ]
}

/** A path's text, escaped to match itself inside a regular expression. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
