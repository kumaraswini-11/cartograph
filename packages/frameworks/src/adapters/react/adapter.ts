// React: roles from the folders its repositories use, Hooks by name, Contexts by
// `createContext`, and the file that mounts the application as entry point.
// No routes (spec 002, FR-013, FR-014, FR-018).
import type { Adapter } from "../../adapter.ts"
import { isHookName, roleFromFolders, stemOf } from "../../conventions.ts"
import { localPath } from "../../packages.ts"
import { calls, importedNames } from "../../syntax.ts"
import type { Node, ParsedFile } from "../../syntax.ts"
import { taxonomy } from "./taxonomy.ts"

const FOLDER_ROLES: Record<string, string> = {
  pages: "Pages",
  components: "Components",
  hooks: "Hooks",
  contexts: "Contexts",
  context: "Contexts",
  config: "Configuration",
  utils: "Utilities",
  util: "Utilities",
  helpers: "Utilities",
  lib: "Utilities",
}

/** Whether a call's function comes from one of `sources`, by any name. */
function callsFrom(
  file: ParsedFile,
  name: string,
  sources: ReadonlyArray<string>
): boolean {
  const imports = importedNames(file.program)
  return calls(file.program, name).some((call) => {
    const callee = call.callee as Node & {
      name?: string
      object?: Node & { name?: string }
    }
    const local =
      callee.type === "Identifier" ? callee.name : callee.object?.name
    const imported = local === undefined ? undefined : imports.get(local)
    return imported !== undefined && sources.includes(imported.source)
  })
}

export const reactAdapter: Adapter = {
  taxonomy,
  recognises: (declared) => declared.has("react"),
  describe(pkg) {
    const roles = new Map<string, string>()
    const entryPoints = new Set<string>()
    for (const path of pkg.files) {
      const local = localPath(pkg, path)
      const stem = stemOf(local)
      const file = pkg.syntax(path)
      const role =
        (isHookName(stem) ? "Hooks" : undefined) ??
        (file && callsFrom(file, "createContext", ["react"])
          ? "Contexts"
          : undefined) ??
        roleFromFolders(local, FOLDER_ROLES)
      if (role) roles.set(path, role)
      const mounts =
        file !== undefined &&
        (callsFrom(file, "createRoot", ["react-dom/client"]) ||
          callsFrom(file, "hydrateRoot", ["react-dom/client"]) ||
          callsFrom(file, "render", ["react-dom"]))
      if (mounts) entryPoints.add(path)
    }
    return { roles, entryPoints, routes: [] }
  },
}
