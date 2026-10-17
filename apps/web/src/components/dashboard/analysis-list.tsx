import { Link } from "@tanstack/react-router"

import type { AnalysisSummary } from "@workspace/database"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@workspace/ui/components/shadcn-ui/item"

import { RunBadge } from "@/components/analysis/run-badge"

/**
 * An organization's analyses (spec 007, FR-006): each repository, leading
 * to its analysis, with its latest run's state (spec 008, FR-013). It shows
 * what it's given; the dashboard's loader asks.
 */
export function AnalysisList({
  analyses,
}: {
  analyses: ReadonlyArray<AnalysisSummary>
}) {
  return (
    <ItemGroup aria-label="Analyses">
      {analyses.map((analysis) => (
        <Item key={analysis.id} role="listitem" variant="outline">
          <ItemContent>
            <ItemTitle className="font-mono">
              <Link
                to="/analyses/$analysisId"
                params={{ analysisId: analysis.id }}
                className="underline-offset-4 hover:underline"
              >
                {analysis.repository}
              </Link>
            </ItemTitle>
          </ItemContent>
          <ItemActions>
            <RunBadge run={analysis.latestRun} />
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  )
}
