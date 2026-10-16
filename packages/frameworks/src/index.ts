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
export { TAXONOMIES, TIERS, UNIDENTIFIED, mergeTaxonomies } from "./taxonomy.ts"
export type { Taxonomy, TaxonomyRole, Tier } from "./taxonomy.ts"
