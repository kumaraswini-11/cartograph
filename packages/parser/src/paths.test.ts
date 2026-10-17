import { describe, expect, it } from "vitest"

import {
  SOURCE_EXTENSIONS,
  SOURCE_EXTENSION_PATTERN,
  SOURCE_FOR,
  escapeRegExp,
  isReadFile,
  isSourceFile,
  withSourceExtensions,
} from "./paths.ts"
import { isConfigFile } from "./walk.ts"

describe("source extensions, one source for every package", () => {
  it("recognises exactly the source extensions", () => {
    for (const extension of SOURCE_EXTENSIONS) {
      expect(isSourceFile(`src/a${extension}`)).toBe(true)
    }
    for (const path of ["a.json", "a.d", "a.css", "a.mtsx", "ts"]) {
      expect(isSourceFile(path)).toBe(false)
    }
  })

  it("reads the contents of source, configuration and JSON files only", () => {
    // Every file the walk reads as configuration is read, wherever it sits.
    for (const name of [
      "package.json",
      "pnpm-workspace.yaml",
      "tsconfig.json",
      "tsconfig.app.json",
      "jsconfig.json",
    ]) {
      expect(isConfigFile(name)).toBe(true)
      expect(isReadFile(`apps/web/${name}`)).toBe(true)
    }
    // A tsconfig may extend any JSON file.
    expect(isReadFile("configs/base.json")).toBe(true)
    expect(isReadFile("src/index.tsx")).toBe(true)
    for (const path of ["logo.svg", "styles.css", "README.md", "a.json.bak"]) {
      expect(isReadFile(path)).toBe(false)
    }
  })

  it("builds a pattern that matches the same extensions, and no others", () => {
    const pattern = new RegExp(`${SOURCE_EXTENSION_PATTERN}$`)
    for (const extension of SOURCE_EXTENSIONS) {
      expect(pattern.test(`a${extension}`)).toBe(true)
    }
    for (const path of ["a.mtsx", "a.cjsx", "a.json"]) {
      expect(pattern.test(path)).toBe(false)
    }
  })

  it("maps a compiled extension to its sources, TypeScript's first", () => {
    expect(SOURCE_FOR[".js"]).toEqual([".ts", ".tsx", ".js", ".jsx"])
    for (const sources of Object.values(SOURCE_FOR)) {
      for (const source of sources)
        expect(isSourceFile(`a${source}`)).toBe(true)
    }
  })

  it("lists a path as written, with each extension, then as a folder's index", () => {
    const candidates = withSourceExtensions("src/lib")
    expect(candidates[0]).toBe("src/lib")
    expect(candidates).toContain("src/lib.ts")
    expect(candidates.at(-1)).toBe("src/lib/index.cjs")
    expect(candidates).toHaveLength(1 + 2 * SOURCE_EXTENSIONS.length)
  })
})

describe("escapeRegExp", () => {
  it("escapes every character a regular expression gives a meaning to", () => {
    const text = "a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o"
    expect(new RegExp(`^${escapeRegExp(text)}$`).test(text)).toBe(true)
    expect(new RegExp(`^${escapeRegExp("a?")}$`).test("a")).toBe(false)
  })
})
