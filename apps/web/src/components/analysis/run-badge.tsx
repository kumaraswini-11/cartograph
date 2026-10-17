import type { RunState, RunSummary } from "@workspace/database"
import { Badge } from "@workspace/ui/components/shadcn-ui/badge"

/** Each state in words, and the badge that carries it. */
const STATES: Record<
  RunState | "stale" | "none",
  { label: string; variant: "secondary" | "outline" | "destructive" }
> = {
  fetching: { label: "Fetching", variant: "outline" },
  parsing: { label: "Parsing", variant: "outline" },
  storing: { label: "Storing", variant: "outline" },
  done: { label: "Done", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  // Unfinished for too long: it stopped without failing (spec 008, FR-013).
  stale: { label: "Stale", variant: "destructive" },
  none: { label: "Not run yet", variant: "outline" },
}

/** The badge a run takes: its state, or stale over any unfinished one. */
function stateOf(run: RunSummary | null): keyof typeof STATES {
  if (run === null) return "none"
  return run.stale ? "stale" : run.state
}

/**
 * An analysis's latest run as one badge (spec 007, FR-006; spec 008,
 * FR-013): its state in words, so a colour never carries it alone (WCAG
 * 2.2, 1.4.1), and a run that has stopped without failing marked stale.
 */
export function RunBadge({ run }: { run: RunSummary | null }) {
  const state = STATES[stateOf(run)]
  return (
    <Badge variant={state.variant}>
      <span className="sr-only">Latest run: </span>
      {state.label}
    </Badge>
  )
}
