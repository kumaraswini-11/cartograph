import type { AnalysisSummary, RunState } from "@workspace/database"
import { Badge } from "@workspace/ui/components/shadcn-ui/badge"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@workspace/ui/components/shadcn-ui/item"

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
function stateOf(run: AnalysisSummary["latestRun"]): keyof typeof STATES {
  if (run === null) return "none"
  return run.stale ? "stale" : run.state
}

/**
 * An organization's analyses (spec 007, FR-006): each repository, with its
 * latest run's state in words, so a colour never carries it alone (WCAG
 * 2.2, 1.4.1), and a run that has stopped without failing marked stale
 * (spec 008, FR-013). It shows what it's given; the dashboard's loader asks.
 */
export function AnalysisList({
  analyses,
}: {
  analyses: ReadonlyArray<AnalysisSummary>
}) {
  return (
    <ItemGroup aria-label="Analyses">
      {analyses.map((analysis) => {
        const state = STATES[stateOf(analysis.latestRun)]
        return (
          <Item key={analysis.id} role="listitem" variant="outline">
            <ItemContent>
              <ItemTitle className="font-mono">{analysis.repository}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Badge variant={state.variant}>
                <span className="sr-only">Latest run: </span>
                {state.label}
              </Badge>
            </ItemActions>
          </Item>
        )
      })}
    </ItemGroup>
  )
}
