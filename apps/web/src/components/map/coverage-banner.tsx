import { ChevronDownIcon } from "lucide-react"
import { COVERAGE_PARTIAL_BELOW } from "@workspace/graph"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/shadcn-ui/alert"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/shadcn-ui/collapsible"

const percent = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 1,
})

/**
 * Names the coverage figure while it's below `COVERAGE_PARTIAL_BELOW`
 * (spec 003, FR-017). Collapsed, it stays one line that still names it.
 */
export function CoverageBanner({
  coverage,
  defaultOpen = false,
}: {
  coverage: number | null
  defaultOpen?: boolean
}) {
  if (coverage === null || coverage >= COVERAGE_PARTIAL_BELOW) return null
  const figure = percent.format(coverage)

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Alert>
        <AlertTitle className="flex items-center justify-between gap-2">
          <span>Coverage {figure}: some lines may be missing</span>
          <CollapsibleTrigger
            render={<Button variant="ghost" size="icon-sm" />}
            aria-label="Show what coverage means"
            className="data-[panel-open]:rotate-180"
          >
            <ChevronDownIcon />
          </CollapsibleTrigger>
        </AlertTitle>
        <CollapsibleContent>
          <AlertDescription>
            Only {figure} of the imports that should lead to a file in the
            repository could be followed. The rest couldn&apos;t be resolved, so
            the map may be missing the lines they would draw.
          </AlertDescription>
        </CollapsibleContent>
      </Alert>
    </Collapsible>
  )
}
