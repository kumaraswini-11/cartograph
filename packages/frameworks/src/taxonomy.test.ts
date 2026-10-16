import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { parseSource } from "@workspace/parser/syntax"
import { describe, expect, it } from "vitest"

import { TAXONOMIES, TIERS, mergeTaxonomies } from "./taxonomy.ts"

describe("taxonomies (FR-008, FR-009, AC-09)", () => {
  it("lists surface, then layer, then plumbing, then Unidentified", () => {
    const merged = mergeTaxonomies(new Set(TAXONOMIES.map((t) => t.framework)))
    const ranks = merged.map((r) => TIERS.indexOf(r.tier))
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(merged.at(-1)).toEqual({
      role: "Unidentified",
      tier: "unidentified",
    })
  })

  it("names a shared role once, frameworks in adapter order (AC-11)", () => {
    const merged = mergeTaxonomies(new Set(["Express", "NestJS"]))
    expect(merged.map((r) => r.role)).toEqual([
      "Controllers",
      "Gateways",
      "Resolvers",
      "Routes",
      "Services",
      "Modules",
      "Entities",
      "DTOs",
      "Models",
      "Validations",
      "Guards",
      "Interceptors",
      "Pipes",
      "Filters",
      "Middleware",
      "Configuration",
      "Utilities",
      "Unidentified",
    ])
  })

  it("gives the same order on every call (C-04)", () => {
    const frameworks = new Set(["React", "Next.js"])
    expect(mergeTaxonomies(frameworks)).toEqual(mergeTaxonomies(frameworks))
  })

  it("never puts a role name in two tiers", () => {
    const tierOf = new Map<string, string>()
    for (const taxonomy of TAXONOMIES) {
      for (const tier of ["surface", "layer", "plumbing"] as const) {
        for (const role of taxonomy[tier]) {
          expect(tierOf.get(role) ?? tier).toBe(tier)
          tierOf.set(role, tier)
        }
      }
    }
  })
})

describe("the taxonomy entry point (C-02)", () => {
  /** Every module `path` imports, followed through relative imports. */
  function importsOf(path: string, seen = new Set<string>()): Set<string> {
    if (seen.has(path)) return seen
    seen.add(path)
    const { module } = parseSource(path, readFileSync(path, "utf8"))
    for (const entry of module.staticImports) {
      const specifier = entry.moduleRequest.value
      if (specifier.startsWith(".")) {
        importsOf(join(dirname(path), specifier), seen)
      } else seen.add(specifier)
    }
    return seen
  }

  it("imports only taxonomy data: no parser, file system or schema", () => {
    const imported = [...importsOf(join(import.meta.dirname, "taxonomy.ts"))]
    expect(imported.filter((p) => !p.endsWith(".ts"))).toEqual([])
    const modules = imported.map((p) => p.replace(/\\/g, "/").split("/src/")[1])
    expect(modules.sort()).toEqual([
      "adapters/express/taxonomy.ts",
      "adapters/nestjs/taxonomy.ts",
      "adapters/nextjs/taxonomy.ts",
      "adapters/react/taxonomy.ts",
      "adapters/taxonomies.ts",
      "taxonomy.ts",
    ])
  })
})
