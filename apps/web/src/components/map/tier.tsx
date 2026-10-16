import type { Tier } from "@workspace/frameworks/taxonomy"
import { cn } from "@workspace/ui/lib/utils"

/** Each tier's colour (spec 003, FR-018); Unidentified stays greyscale. */
const TIER_SWATCH: Record<Tier, string> = {
  surface: "bg-tier-surface",
  layer: "bg-tier-layer",
  plumbing: "bg-tier-plumbing",
  unidentified: "bg-muted-foreground",
}

/**
 * A role's tier, as a coloured dot beside its name: on the rail, the map's
 * rows and the detail pane. Decorative, since the role's name is beside it;
 * `className` sets its size.
 */
export function TierSwatch({
  tier,
  className,
}: {
  tier: Tier
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        TIER_SWATCH[tier],
        className
      )}
    />
  )
}
