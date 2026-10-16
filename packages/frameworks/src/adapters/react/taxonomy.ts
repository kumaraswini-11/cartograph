import type { Taxonomy } from "../../taxonomy.ts"

/** React's roles, from the folders its repositories use (spec 002, FR-013). */
export const taxonomy: Taxonomy = {
  framework: "React",
  surface: ["Pages"],
  layer: ["Components", "Hooks", "Contexts"],
  plumbing: ["Configuration", "Utilities"],
}
