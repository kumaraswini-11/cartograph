// Every framework's roles, readable without the adapters (spec 002, C-02):
// this module and the data it imports hold no parser, file system or schema,
// so the interface can import `@workspace/frameworks/taxonomy` on its own.
import { TAXONOMIES } from "./adapters/taxonomies.ts"

export { TAXONOMIES }

/** Reading order on the rail (FR-008, C-04). */
export const TIERS = ["surface", "layer", "plumbing", "unidentified"] as const
export type Tier = (typeof TIERS)[number]

/** One framework's roles by tier, each list in its reading order. */
export type Taxonomy = {
  framework: string
  surface: ReadonlyArray<string>
  layer: ReadonlyArray<string>
  plumbing: ReadonlyArray<string>
}

export type TaxonomyRole = { role: string; tier: Tier }

/** The role of a file no convention identified (FR-003, FR-005). */
export const UNIDENTIFIED = "Unidentified"

/**
 * The analysis's one taxonomy (FR-009): every surface role first, frameworks
 * in the order adapters run, then layer roles, then plumbing, then
 * Unidentified once. A role name two frameworks share appears once.
 */
export function mergeTaxonomies(
  frameworks: ReadonlySet<string>
): Array<TaxonomyRole> {
  const used = TAXONOMIES.filter((t) => frameworks.has(t.framework))
  const roles: Array<TaxonomyRole> = []
  const seen = new Set<string>()
  for (const tier of ["surface", "layer", "plumbing"] as const) {
    for (const taxonomy of used) {
      for (const role of taxonomy[tier]) {
        if (seen.has(role)) continue
        seen.add(role)
        roles.push({ role, tier })
      }
    }
  }
  roles.push({ role: UNIDENTIFIED, tier: "unidentified" })
  return roles
}
