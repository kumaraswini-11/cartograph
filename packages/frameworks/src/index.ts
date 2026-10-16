export { detectFrameworks } from "./detect.ts"
export {
  DETECTION_SCHEMA_VERSION,
  HTTP_METHODS,
  detection,
  readDetection,
  writeDetection,
} from "./result.ts"
export type {
  Detection,
  FileRole,
  HttpMethod,
  PackageRecord,
  Route,
  TaxonomyEntry,
} from "./result.ts"
export {
  ROLE_TIERS,
  TAXONOMIES,
  TIERS,
  UNIDENTIFIED,
  mergeTaxonomies,
  rolesOf,
} from "./taxonomy.ts"
export type { Taxonomy, TaxonomyRole, Tier } from "./taxonomy.ts"
