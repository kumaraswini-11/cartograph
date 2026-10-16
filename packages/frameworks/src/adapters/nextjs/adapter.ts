// Next.js: roles from the `app` and `pages` folders and its special files,
// routes from route handlers (spec 002, FR-010, FR-014, FR-015). The file
// conventions follow https://nextjs.org/docs/app/getting-started/project-structure.
import { posix } from "node:path"

import { Visitor } from "oxc-parser"

import type { Adapter, PackageInput } from "../../adapter.ts"
import { isConfigFile } from "../../conventions.ts"
import { localPath } from "../../packages.ts"
import { HTTP_METHODS } from "../../result.ts"
import type { HttpMethod, Route } from "../../result.ts"
import { literalValue } from "../../syntax.ts"
import type { Node } from "../../syntax.ts"
import { taxonomy } from "./taxonomy.ts"

/** Routing files of the `app` folder, by name without extension. */
const APP_FILES: Record<string, string> = {
  page: "Page routes",
  route: "API endpoints",
  layout: "Layouts",
  template: "Layouts",
  loading: "Loading and error UI",
  error: "Loading and error UI",
  "global-error": "Loading and error UI",
  "not-found": "Loading and error UI",
  forbidden: "Loading and error UI",
  unauthorized: "Loading and error UI",
  // A parallel-route slot's fallback, not an address of its own.
  default: "Loading and error UI",
}

/** Metadata files of the `app` folder (`icon1`, `opengraph-image`, `sitemap`). */
const METADATA_FILE =
  /^((icon|apple-icon|opengraph-image|twitter-image)\d*|sitemap|robots|manifest)$/

/** Special files of the `pages` folder. */
const PAGES_FILES: Record<string, string> = {
  _app: "Layouts",
  _document: "Layouts",
  _error: "Loading and error UI",
  "404": "Loading and error UI",
  "500": "Loading and error UI",
}

/** Roles of files Next.js loads without an import (FR-014). */
const LOADED = new Set([
  "Page routes",
  "API endpoints",
  "Layouts",
  "Loading and error UI",
  "Metadata files",
  "Proxy",
  "Instrumentation",
])

const METHODS: ReadonlySet<string> = new Set(HTTP_METHODS)
const UTILITY_FOLDERS = new Set(["lib", "utils", "util", "helpers"])

const stemOf = (path: string) => {
  const name = posix.basename(path)
  return name.slice(0, name.length - posix.extname(name).length)
}

/** Where the package keeps its routing folders: the root wins over `src`. */
function layout(locals: ReadonlyArray<string>) {
  const atRoot = locals.some(
    (l) => l.startsWith("app/") || l.startsWith("pages/")
  )
  const base = atRoot ? "" : "src/"
  return { base, app: `${base}app/`, pages: `${base}pages/` }
}

/** The role a file's position gives it, before its syntax is read. */
function positionalRole(local: string, folders: ReturnType<typeof layout>) {
  const stem = stemOf(local)
  const atBase =
    posix.dirname(local) === (folders.base || ".").replace(/\/$/, "")
  if (atBase && (stem === "proxy" || stem === "middleware")) return "Proxy"
  if (
    atBase &&
    (stem === "instrumentation" || stem === "instrumentation-client")
  ) {
    return "Instrumentation"
  }
  if (isConfigFile(posix.basename(local))) return "Configuration"

  if (local.startsWith(folders.app)) {
    const segments = local.slice(folders.app.length).split("/").slice(0, -1)
    // A private folder opts it and everything under it out of routing.
    if (!segments.some((s) => s.startsWith("_"))) {
      const role = APP_FILES[stem]
      if (role) return role
      if (METADATA_FILE.test(stem)) return "Metadata files"
    }
  } else if (local.startsWith(folders.pages)) {
    const rest = local.slice(folders.pages.length)
    if (rest.startsWith("api/")) return "API endpoints"
    return PAGES_FILES[stem] ?? "Page routes"
  }
  return undefined
}

/** A role from naming habits Next.js repositories share; not routing files. */
function habitRole(local: string): string | undefined {
  // `_components` and `_lib`: private folders keep their habit's name.
  const folders = posix
    .dirname(local)
    .split("/")
    .map((f) => f.replace(/^_/, ""))
  if (/^use[A-Z-]/.test(stemOf(local)) || folders.includes("hooks"))
    return "Hooks"
  if (folders.includes("components")) return "Components"
  if (folders.includes("config")) return "Configuration"
  if (folders.some((f) => UTILITY_FOLDERS.has(f))) return "Utilities"
  return undefined
}

/**
 * The configuration's base path (FR-015; plan D-06): "" when none is set,
 * undefined when it's set to anything but one literal.
 */
function basePath(pkg: PackageInput): string | undefined {
  const configs = pkg.files.filter((f) =>
    /^next\.config\.[cm]?[jt]s$/.test(localPath(pkg, f))
  )
  const values = new Set<string | undefined>()
  for (const config of configs) {
    const file = pkg.syntax(config)
    if (!file) return undefined
    new Visitor({
      Property(node) {
        const key = node.key as Node & { name?: string }
        const name = key.type === "Identifier" ? key.name : literalValue(key)
        if (name === "basePath") values.add(literalValue(node.value))
      },
    }).visit(file.program)
  }
  if (values.size === 0) return ""
  const [only] = values
  return values.size === 1 && only !== undefined ? only : undefined
}

/** The HTTP methods a route handler exports by name, each with its line. */
function exportedMethods(pkg: PackageInput, path: string) {
  const file = pkg.syntax(path)
  if (!file) return []
  const methods: Array<{ method: HttpMethod; line: number }> = []
  const add = (name: string | undefined, start: number) => {
    if (name !== undefined && METHODS.has(name)) {
      methods.push({ method: name as HttpMethod, line: file.lineOf(start) })
    }
  }
  for (const statement of file.program.body) {
    if (statement.type !== "ExportNamedDeclaration" || statement.source)
      continue
    const declaration = statement.declaration
    if (declaration?.type === "FunctionDeclaration") {
      add(declaration.id?.name, statement.start)
    } else if (declaration?.type === "VariableDeclaration") {
      for (const d of declaration.declarations) {
        if (d.id.type === "Identifier") add(d.id.name, statement.start)
      }
    }
    for (const specifier of statement.specifiers) {
      const exported = specifier.exported
      add(
        exported.type === "Identifier" ? exported.name : String(exported.value),
        specifier.start
      )
    }
  }
  return methods
}

/**
 * A route handler's path, in Next.js's notation (FR-015): route groups and
 * slots leave the path; an intercepting segment means no route.
 */
function routePath(segments: ReadonlyArray<string>): string | undefined {
  if (segments.some((s) => /^(\(\.{1,3}\))+/.test(s))) return undefined
  const kept = segments.filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("@"))
  return `/${kept.join("/")}`
}

const firstDirective = (pkg: PackageInput, path: string) => {
  const first = pkg.syntax(path)?.program.body[0] as
    { directive?: string } | undefined
  return first?.directive
}

export const nextjsAdapter: Adapter = {
  taxonomy,
  recognises: (declared) => declared.has("next"),
  describe(pkg) {
    const folders = layout(pkg.files.map((f) => localPath(pkg, f)))
    const roles = new Map<string, string>()
    const entryPoints = new Set<string>()
    const routes: Array<Route> = []
    const prefix = basePath(pkg)

    for (const path of pkg.files) {
      const local = localPath(pkg, path)
      const role =
        positionalRole(local, folders) ??
        (firstDirective(pkg, path) === "use server"
          ? "Server actions"
          : undefined) ??
        habitRole(local)
      if (!role) continue
      roles.set(path, role)
      if (LOADED.has(role) || /^next\.config\./.test(posix.basename(local))) {
        entryPoints.add(path)
      }

      if (role !== "API endpoints" || !local.startsWith(folders.app)) continue
      const pathOf = routePath(
        local.slice(folders.app.length).split("/").slice(0, -1)
      )
      if (pathOf === undefined || prefix === undefined) continue
      const full =
        prefix === "" ? pathOf : `${prefix}${pathOf === "/" ? "" : pathOf}`
      for (const { method, line } of exportedMethods(pkg, path)) {
        routes.push({ method, path: full, file: path, line })
      }
    }
    return { roles, entryPoints, routes }
  },
}
