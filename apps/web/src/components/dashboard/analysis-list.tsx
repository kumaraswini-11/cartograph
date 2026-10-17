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
  RunState | "none",
  { label: string; variant: "secondary" | "outline" | "destructive" }
> = {
  fetching: { label: "Fetching", variant: "outline" },
  parsing: { label: "Parsing", variant: "outline" },
  storing: { label: "Storing", variant: "outline" },
  done: { label: "Done", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  none: { label: "Not run yet", variant: "outline" },
}

/**
 * An organization's analyses (spec 007, FR-006): each repository, with its
 * latest run's state in words, so a colour never carries it alone (WCAG
 * 2.2, 1.4.1). It shows what it's given; the dashboard's loader asks.
 */
export function AnalysisList({
  analyses,
}: {
  analyses: ReadonlyArray<AnalysisSummary>
}) {
  return (
    <ItemGroup aria-label="Analyses">
      {analyses.map((analysis) => {
        const state = STATES[analysis.latestRun ?? "none"]
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
