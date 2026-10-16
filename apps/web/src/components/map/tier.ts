import type { Tier } from "@workspace/frameworks/taxonomy"

/** Each tier's colour (spec 003, FR-018); Unidentified stays greyscale. */
export const TIER_SWATCH: Record<Tier, string> = {
  surface: "bg-tier-surface",
  layer: "bg-tier-layer",
  plumbing: "bg-tier-plumbing",
  unidentified: "bg-muted-foreground",
}
