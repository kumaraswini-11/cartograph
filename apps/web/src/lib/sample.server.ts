import type { MapInput } from "@workspace/graph"

import { SAMPLE_MAP } from "@/sample/map.gen"

/**
 * The sample map (spec 003, plan D-06). Server-only, so the 55 KB module is
 * never part of the browser's JavaScript; the page carries it once, as data.
 */
export function readSampleMap(): MapInput {
  return SAMPLE_MAP
}
