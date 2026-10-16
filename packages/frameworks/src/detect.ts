import type { ParsedRepository } from "@workspace/parser"

import type { Adapter } from "./adapter.ts"
import { ADAPTERS, genericAdapter } from "./adapters/index.ts"
import { commonEntryPoints, isTestFile } from "./conventions.ts"
import { declaredPackages } from "./manifest.ts"
import { findPackages, localPath } from "./packages.ts"
import { DETECTION_SCHEMA_VERSION } from "./result.ts"
import type { Detection, FileRole, PackageRecord, Route } from "./result.ts"
import { createSyntax } from "./syntax.ts"
import { UNIDENTIFIED, mergeTaxonomies } from "./taxonomy.ts"

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** The first adapter that recognises the package, or the generic one (FR-002, FR-003). */
function adapterFor(declared: ReadonlySet<string>): Adapter {
  return ADAPTERS.find((a) => a.recognises(declared)) ?? genericAdapter
}

/**
 * Each package's framework, each file's role and entry-point flag, the
 * routes, and the analysis's taxonomy (spec 002), for a directory the parser
 * has parsed. Reads only that directory (C-07).
 */
export function detectFrameworks(
  directory: string,
  parsed: ParsedRepository
): Detection {
  const syntax = createSyntax(directory)
  const packages: Array<PackageRecord> = []
  const files: Array<FileRole> = []
  const routes: Array<Route> = []
  const frameworks = new Set<string>()

  for (const pkg of findPackages(
    directory,
    parsed.files.map((f) => f.path)
  )) {
    const adapter = adapterFor(declaredPackages(pkg.manifest))
    const framework = adapter.taxonomy?.framework ?? null
    if (framework !== null) frameworks.add(framework)
    packages.push({ path: pkg.path, framework })

    const input = { ...pkg, syntax }
    const description = adapter.describe(input)
    const entryPoints = commonEntryPoints(input)
    const known = new Set(
      adapter.taxonomy
        ? [
            ...adapter.taxonomy.surface,
            ...adapter.taxonomy.layer,
            ...adapter.taxonomy.plumbing,
          ]
        : []
    )
    for (const path of pkg.files) {
      // A test of a model isn't a model: tests take no role (FR-005).
      const role = isTestFile(localPath(pkg, path))
        ? UNIDENTIFIED
        : (description.roles.get(path) ?? UNIDENTIFIED)
      if (role !== UNIDENTIFIED && !known.has(role)) {
        throw new Error(
          `${framework} gave ${path} a role outside its taxonomy: ${role}`
        )
      }
      files.push({
        path,
        package: pkg.path,
        role,
        entryPoint: description.entryPoints.has(path) || entryPoints.has(path),
      })
    }
    routes.push(...description.routes)
  }

  const counts = new Map<string, number>()
  for (const file of files)
    counts.set(file.role, (counts.get(file.role) ?? 0) + 1)

  return {
    schemaVersion: DETECTION_SCHEMA_VERSION,
    packages,
    files: files.sort((a, b) => byText(a.path, b.path)),
    routes: routes.sort(
      (a, b) =>
        byText(a.path, b.path) ||
        byText(a.method, b.method) ||
        byText(a.file, b.file)
    ),
    taxonomy: mergeTaxonomies(frameworks).map((entry) => ({
      ...entry,
      files: counts.get(entry.role) ?? 0,
    })),
  }
}
