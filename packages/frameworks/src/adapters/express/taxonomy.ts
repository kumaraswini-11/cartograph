import type { Taxonomy } from "../../taxonomy.ts"

/** Express's roles, from the folders its repositories use (spec 002, FR-012). */
export const taxonomy: Taxonomy = {
  framework: "Express",
  surface: ["Routes", "Controllers"],
  layer: ["Services", "Models", "Validations"],
  plumbing: ["Middleware", "Configuration", "Utilities"],
}
