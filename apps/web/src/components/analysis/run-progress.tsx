import { STAGES } from "@workspace/database"
import type { RunDetail, Stage } from "@workspace/database"
import { Badge } from "@workspace/ui/components/shadcn-ui/badge"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@workspace/ui/components/shadcn-ui/item"

/** Each stage in words (CONTEXT.md: Stage). */
const STAGE_NAMES: Record<Stage, string> = {
  fetching: "Fetching",
  parsing: "Parsing",
  storing: "Storing",
}

type StageState = "done" | "current" | "failed" | "waiting" | "stopped"

/** Each stage's state in words, and the badge that carries it. */
const STAGE_STATES: Record<
  StageState,
  { label: string; variant: "secondary" | "outline" | "destructive" }
> = {
  done: { label: "Done", variant: "secondary" },
  current: { label: "Under way", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
  stopped: { label: "Stopped", variant: "destructive" },
  waiting: { label: "Waiting", variant: "outline" },
}

/** Where `stage` stands in `run`: before, at or after where the run is. */
function stateOf(stage: Stage, run: RunDetail): StageState {
  if (run.state === "done") return "done"
  const reached = run.state === "failed" ? run.failedStage : run.state
  const at = STAGES.indexOf(stage)
  const current = reached === null ? -1 : STAGES.indexOf(reached)
  if (at < current) return "done"
  if (at > current) return "waiting"
  if (run.state === "failed") return "failed"
  return run.stale ? "stopped" : "current"
}

/**
 * A run's stages by name, each with where it stands, and the current
 * stage's sentence or why the run failed (spec 008, FR-006, FR-007,
 * FR-010): words, never a spinner (AC-01), and never a colour alone (WCAG
 * 2.2, 1.4.1). The sentence is a live region, so a change is announced.
 */
export function RunProgress({ run }: { run: RunDetail }) {
  return (
    <section aria-labelledby="run-progress" className="flex flex-col gap-3">
      <h2 id="run-progress" className="font-medium">
        Latest run
      </h2>
      <ItemGroup aria-label="Stages">
        {STAGES.map((stage) => {
          const state = stateOf(stage, run)
          const badge = STAGE_STATES[state]
          return (
            <Item
              key={stage}
              role="listitem"
              variant="outline"
              size="sm"
              aria-current={state === "current" ? "step" : undefined}
            >
              <ItemContent>
                <ItemTitle>{STAGE_NAMES[stage]}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </ItemActions>
            </Item>
          )
        })}
      </ItemGroup>
      <p role="status" className="text-sm text-muted-foreground">
        {run.stale
          ? "This run stopped without finishing. Run it again to map the repository."
          : run.message}
      </p>
    </section>
  )
}
