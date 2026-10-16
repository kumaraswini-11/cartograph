// Express: roles from the folders its repositories use, singular or plural, and
// the file that starts listening as entry point. No routes: they're assembled
// at runtime (spec 002, FR-012, FR-014, FR-018, C-06).
import type { Adapter } from "../../adapter.ts"
import { roleFromFolders } from "../../conventions.ts"
import { localPath } from "../../packages.ts"
import { memberCalls } from "../../syntax.ts"
import { taxonomy } from "./taxonomy.ts"

/** Folder names, singular and plural alike (FR-012, AC-05). */
const FOLDER_ROLES: Record<string, string> = Object.fromEntries(
  (
    [
      [["route", "routes", "router", "routers"], "Routes"],
      [["controller", "controllers"], "Controllers"],
      [["service", "services"], "Services"],
      [["model", "models"], "Models"],
      [["validation", "validations", "validator", "validators"], "Validations"],
      [["middleware", "middlewares"], "Middleware"],
      [["config", "configs"], "Configuration"],
      [["util", "utils", "helper", "helpers", "lib"], "Utilities"],
    ] as const
  ).flatMap(([names, role]) => names.map((name) => [name, role]))
)

export const expressAdapter: Adapter = {
  taxonomy,
  recognises: (declared) => declared.has("express"),
  describe(pkg) {
    const roles = new Map<string, string>()
    const entryPoints = new Set<string>()
    for (const path of pkg.files) {
      const role = roleFromFolders(localPath(pkg, path), FOLDER_ROLES)
      if (role) roles.set(path, role)
      const file = pkg.syntax(path)
      if (file && memberCalls(file.program, "listen").length > 0) {
        entryPoints.add(path)
      }
    }
    return { roles, entryPoints, routes: [] }
  },
}
