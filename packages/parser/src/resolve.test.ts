import { afterEach, describe, expect, it } from "vitest"

import { parseRepository } from "./parse.ts"
import { isTooLarge } from "./result.ts"
import type { ImportRecord, ParsedRepository } from "./result.ts"
import { makeRepository } from "./testing.ts"
import type { Repository } from "./testing.ts"

let repository: Repository | undefined
afterEach(() => repository?.remove())

function parsed(files: Record<string, string>, options = {}): ParsedRepository {
  repository = makeRepository(files)
  const result = parseRepository(repository.directory, options)
  if (isTooLarge(result)) throw new Error("unexpectedly too large")
  return result
}

/** [specifier, resolution, target or reason] for each import. */
const outcome = (imports: Array<ImportRecord>) =>
  imports.map((i) => [i.specifier, i.resolution, i.to ?? i.reason ?? null])

describe("paths in the repository (FR-012)", () => {
  it("resolves relative paths, extensions, index files and .js written for .ts", () => {
    const result = parsed({
      "src/app.ts": [
        'import "./util"',
        'import "./lib"',
        'import "../shared/types.js"',
        'import "./view.jsx"',
      ].join("\n"),
      "src/util.ts": "",
      "src/lib/index.ts": "",
      "shared/types.ts": "",
      "src/view.tsx": "",
    })
    expect(outcome(result.imports)).toEqual([
      ["./util", "resolved", "src/util.ts"],
      ["./lib", "resolved", "src/lib/index.ts"],
      ["../shared/types.js", "resolved", "shared/types.ts"],
      ["./view.jsx", "resolved", "src/view.tsx"],
    ])
  })

  it("resolves tsconfig paths, including ones set by a relative extends", () => {
    const result = parsed({
      "tsconfig.base.json":
        '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
      "tsconfig.json":
        '{\n  // comments are allowed\n  "extends": "./tsconfig.base.json",\n}',
      "src/app.ts": 'import "@/util"\nimport "@/missing"',
      "src/util.ts": "",
    })
    expect(outcome(result.imports)).toEqual([
      ["@/util", "resolved", "src/util.ts"],
      ["@/missing", "unresolved", "not found"],
    ])
  })
})

describe("external, excluded and unresolved (FR-011, FR-013)", () => {
  it("treats built-ins and packages as external, installed or not", () => {
    const result = parsed({
      "a.ts":
        'import "node:fs"\nimport "path"\nimport "react"\nimport "@tanstack/react-router"',
      "node_modules/react/package.json":
        '{ "name": "react", "main": "index.js" }',
      "node_modules/react/index.js": "",
    })
    expect(outcome(result.imports).map(([s, r]) => [s, r])).toEqual([
      ["node:fs", "external"],
      ["path", "external"],
      ["react", "external"],
      ["@tanstack/react-router", "external"],
    ])
  })

  it("treats non-source files, excluded paths and skipped files as excluded", () => {
    const result = parsed(
      {
        "a.ts":
          'import "./styles.css?url"\nimport "./data.json"\nimport "./dist/out.js"\nimport "./big"',
        "styles.css": "",
        "data.json": "{}",
        "dist/out.js": "",
        "big.ts": "x".repeat(500),
      },
      { maxFileBytes: 200 }
    )
    expect(outcome(result.imports).map(([s, r]) => [s, r])).toEqual([
      ["./styles.css?url", "excluded"],
      ["./data.json", "excluded"],
      ["./dist/out.js", "excluded"],
      ["./big", "excluded"],
    ])
  })

  it("never treats an alias-like specifier as a package", () => {
    const result = parsed({ "a.ts": 'import "~/x"\nimport "#internal"' })
    expect(outcome(result.imports)).toEqual([
      ["~/x", "unresolved", "not found"],
      ["#internal", "unresolved", "not found"],
    ])
  })

  it("marks a non-literal import as not a literal (AC-15)", () => {
    const result = parsed({ "a.js": "require(name)\nimport(path)" })
    expect(outcome(result.imports)).toEqual([
      ["", "unresolved", "not a literal"],
      ["", "unresolved", "not a literal"],
    ])
  })

  it("reports an import that matches only by ignoring case the same on every OS", () => {
    const result = parsed({ "a.ts": 'import "./Util"', "util.ts": "" })
    expect(outcome(result.imports)).toEqual([
      ["./Util", "unresolved", "case mismatch"],
    ])
  })
})

describe("a renamed file (AC-04)", () => {
  it("leaves exactly one more unresolved import, naming the missing file", () => {
    const before = parsed({
      "a.ts": 'import "./b"\nimport "./c"',
      "b.ts": "",
      "c.ts": "",
    })
    repository?.remove()
    const after = parsed({
      "a.ts": 'import "./b"\nimport "./c"',
      "renamed.ts": "",
      "c.ts": "",
    })
    const unresolved = (r: ParsedRepository) =>
      r.imports.filter((i) => i.resolution === "unresolved")
    expect(unresolved(after).length - unresolved(before).length).toBe(1)
    expect(unresolved(after).map((i) => [i.specifier, i.reason])).toEqual([
      ["./b", "not found"],
    ])
  })
})

describe("workspace packages (FR-012)", () => {
  const workspace = (pkg: object, extra: Record<string, string> = {}) => ({
    "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n  - packages/*\n',
    "apps/web/src/app.ts": 'import "@acme/ui/button"\nimport "@acme/ui"',
    "packages/ui/package.json": JSON.stringify({ name: "@acme/ui", ...pkg }),
    ...extra,
  })

  it("resolves through exports to source", () => {
    const result = parsed(
      workspace(
        { exports: { ".": "./src/index.ts", "./*": "./src/components/*.tsx" } },
        {
          "packages/ui/src/index.ts": "",
          "packages/ui/src/components/button.tsx": "",
        }
      )
    )
    expect(outcome(result.imports)).toEqual([
      ["@acme/ui/button", "resolved", "packages/ui/src/components/button.tsx"],
      ["@acme/ui", "resolved", "packages/ui/src/index.ts"],
    ])
  })

  it("maps build output back to source through tsconfig outDir and rootDir", () => {
    const result = parsed(
      workspace(
        {
          exports: {
            ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
            "./*": "./dist/*.js",
          },
        },
        {
          "packages/ui/tsconfig.json":
            '{ "compilerOptions": { "outDir": "dist", "rootDir": "src" } }',
          "packages/ui/src/index.ts": "",
          "packages/ui/src/button.tsx": "",
        }
      )
    )
    expect(outcome(result.imports)).toEqual([
      ["@acme/ui/button", "resolved", "packages/ui/src/button.tsx"],
      ["@acme/ui", "resolved", "packages/ui/src/index.ts"],
    ])
  })

  it("reports build output it can't map, and subpaths the package doesn't export", () => {
    const result = parsed(
      workspace(
        { exports: { ".": "./dist/index.js" } },
        { "packages/ui/src/index.ts": "" }
      )
    )
    expect(outcome(result.imports)).toEqual([
      ["@acme/ui/button", "unresolved", "not exported"],
      ["@acme/ui", "unresolved", "points at build output"],
    ])
  })

  it("reads npm and Yarn workspaces from package.json", () => {
    const result = parsed({
      "package.json": JSON.stringify({ workspaces: ["packages/*"] }),
      "app.ts": 'import "@acme/util"',
      "packages/util/package.json": JSON.stringify({
        name: "@acme/util",
        main: "index.js",
      }),
      "packages/util/index.js": "",
    })
    expect(outcome(result.imports)).toEqual([
      ["@acme/util", "resolved", "packages/util/index.js"],
    ])
  })
})

describe("a tsconfig that extends a workspace package", () => {
  const files = {
    "pnpm-workspace.yaml": "packages:\n  - pkgs/*\n",
    "pkgs/dev/package.json": JSON.stringify({
      name: "@acme/dev",
      exports: { "./tsconfig": "./tsconfig.json" },
    }),
    "pkgs/dev/tsconfig.json":
      '{ "compilerOptions": { "paths": { "~/*": ["./src/*"] } } }',
    "pkgs/core/tsconfig.json": '{ "extends": "@acme/dev/tsconfig" }',
    "pkgs/core/src/a.ts": 'import "node:fs"\nimport "./b"\nimport "~/b"',
    "pkgs/core/src/b.ts": "",
  }

  it("still resolves, as TypeScript keeps the config's own options", () => {
    expect(outcome(parsed(files).imports)).toEqual([
      ["node:fs", "external", null],
      ["./b", "resolved", "pkgs/core/src/b.ts"],
      // Declared by the package it extends: a real gap, never a package.
      ["~/b", "unresolved", "not found"],
    ])
  })
})
