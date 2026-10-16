import type { Manifest } from "./manifest.ts"
import type { Route } from "./result.ts"
import type { Syntax } from "./syntax.ts"
import type { Taxonomy } from "./taxonomy.ts"

/** One package, as an adapter sees it. */
export type PackageInput = {
  /** Relative, "/"-separated; "" for the repository itself. */
  path: string
  manifest: Manifest | undefined
  /** The package's files, relative to the repository, in path order. */
  files: ReadonlyArray<string>
  syntax: Syntax
}

/** What an adapter says about its package's files (spec 002, FR-005 to FR-018). */
export type Description = {
  /** Each identified file's role; a file left out is Unidentified. */
  roles: ReadonlyMap<string, string>
  /** The files its framework loads without an import (FR-006). */
  entryPoints: ReadonlySet<string>
  routes: ReadonlyArray<Route>
  /**
   * Whether every route was recovered exactly, none to recover included;
   * false when a route it found gives none, because some piece of it can't
   * be read from the code (spec 005, FR-012, plan D-02).
   */
  routesRecovered: boolean
}

/**
 * The knowledge of one framework (CONTEXT.md: Adapter). Framework names and
 * conventions live only in an adapter's own folder (C-05).
 */
export type Adapter = {
  /** Undefined for the generic adapter, which knows no framework. */
  taxonomy: Taxonomy | undefined
  /** Whether the package follows this framework, from its manifest (D-04). */
  recognises: (declared: ReadonlySet<string>) => boolean
  describe: (pkg: PackageInput) => Description
}
