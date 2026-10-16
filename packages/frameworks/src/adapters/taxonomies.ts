import type { Taxonomy } from "../taxonomy.ts"
import { taxonomy as expressTaxonomy } from "./express/taxonomy.ts"
import { taxonomy as nestjsTaxonomy } from "./nestjs/taxonomy.ts"
import { taxonomy as nextjsTaxonomy } from "./nextjs/taxonomy.ts"
import { taxonomy as reactTaxonomy } from "./react/taxonomy.ts"

/** Every framework's taxonomy, in the order adapters run (spec 002, FR-002). */
export const TAXONOMIES: ReadonlyArray<Taxonomy> = [
  nextjsTaxonomy,
  nestjsTaxonomy,
  expressTaxonomy,
  reactTaxonomy,
]
