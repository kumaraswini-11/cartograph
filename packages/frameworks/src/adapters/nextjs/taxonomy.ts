import type { Taxonomy } from "../../taxonomy.ts"

/** Next.js's roles, in its own words (spec 002, FR-010). */
export const taxonomy: Taxonomy = {
  framework: "Next.js",
  surface: ["Page routes", "API endpoints", "Server actions", "Metadata files"],
  layer: ["Layouts", "Loading and error UI", "Components", "Hooks"],
  plumbing: ["Proxy", "Instrumentation", "Configuration", "Utilities"],
}
