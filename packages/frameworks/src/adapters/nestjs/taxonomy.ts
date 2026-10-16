import type { Taxonomy } from "../../taxonomy.ts"

/** NestJS's roles, in its own words (spec 002, FR-011). */
export const taxonomy: Taxonomy = {
  framework: "NestJS",
  surface: ["Controllers", "Gateways", "Resolvers"],
  layer: ["Services", "Modules", "Entities", "DTOs"],
  plumbing: ["Guards", "Interceptors", "Pipes", "Filters", "Middleware"],
}
