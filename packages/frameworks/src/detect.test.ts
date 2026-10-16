import { afterEach, describe, expect, it } from "vitest"

import { detection } from "./result.ts"
import { cleanUp, detected, manifest, roles } from "./testing.ts"

afterEach(cleanUp)

describe("packages (FR-001, FR-004)", () => {
  it("gives each file its innermost package, workspace or not", () => {
    const result = detected({
      "package.json": manifest([]),
      "scripts/seed.ts": "",
      "client/package.json": manifest([]),
      "client/src/app.ts": "",
      "packages/ui/package.json": manifest([]),
      "packages/ui/src/button.ts": "",
      "packages/ui/src/deep/no-manifest/x.ts": "",
    })
    expect(result.packages).toEqual([
      { path: "", framework: null },
      { path: "client", framework: null },
      { path: "packages/ui", framework: null },
    ])
    expect(result.files.map((f) => [f.path, f.package])).toEqual([
      ["client/src/app.ts", "client"],
      ["packages/ui/src/button.ts", "packages/ui"],
      ["packages/ui/src/deep/no-manifest/x.ts", "packages/ui"],
      ["scripts/seed.ts", ""],
    ])
  })

  it("records the repository itself even with no manifest", () => {
    expect(detected({ "a.ts": "" }).packages).toEqual([
      { path: "", framework: null },
    ])
  })
})

describe("the generic adapter (FR-003, AC-04)", () => {
  it("leaves every file Unidentified, with no routes and no framework", () => {
    const result = detected({
      "package.json": manifest(["lodash"]),
      "src/a.ts": "export const a = 1",
      "src/b.ts": 'import { a } from "./a"',
    })
    expect(roles(result)).toEqual([
      ["src/a.ts", "Unidentified", false],
      ["src/b.ts", "Unidentified", false],
    ])
    expect(result.routes).toEqual([])
    expect(result.taxonomy).toEqual([
      { role: "Unidentified", tier: "unidentified", files: 2 },
    ])
  })
})

describe("entry points every package has (FR-007, AC-14)", () => {
  it("marks manifest-named files, scripts, configuration and tests", () => {
    const result = detected({
      "package.json": manifest([], {
        main: "./dist/index.js",
        exports: {
          ".": "./src/index.ts",
          "./cli": { import: "./src/cli.mjs" },
        },
        bin: { tool: "bin/tool.js" },
        scripts: { seed: "node scripts/seed.ts --fast", build: "tsc" },
      }),
      "src/index.ts": "",
      "src/cli.mjs": "",
      "src/internal.ts": "",
      "bin/tool.js": "",
      "scripts/seed.ts": "",
      "vite.config.ts": "",
      ".eslintrc.cjs": "",
      "src/index.test.ts": "",
      "test/app.e2e-spec.ts": "",
      "src/__tests__/helpers.ts": "",
    })
    expect(result.files.filter((f) => f.entryPoint).map((f) => f.path)).toEqual(
      [
        ".eslintrc.cjs",
        "bin/tool.js",
        "scripts/seed.ts",
        "src/__tests__/helpers.ts",
        "src/cli.mjs",
        "src/index.test.ts",
        "src/index.ts",
        "test/app.e2e-spec.ts",
        "vite.config.ts",
      ]
    )
  })

  it("maps a manifest's .js path to the .ts source beside it", () => {
    const result = detected({
      "package.json": manifest([], { main: "lib/index.js" }),
      "lib/index.ts": "",
    })
    expect(roles(result)).toEqual([["lib/index.ts", "Unidentified", true]])
  })
})

describe("the result", () => {
  it("matches its schema", () => {
    const result = detected({ "package.json": manifest([]), "a.ts": "" })
    expect(detection.parse(result)).toEqual(result)
  })
})

describe("test files (FR-005)", () => {
  it("take no role from their folder, and stay entry points", () => {
    const result = detected({
      "package.json": manifest(["express"]),
      "src/models/user.model.js": "",
      "tests/unit/models/user.model.test.js": "",
    })
    expect(roles(result)).toEqual([
      ["src/models/user.model.js", "Models", false],
      ["tests/unit/models/user.model.test.js", "Unidentified", true],
    ])
  })
})
