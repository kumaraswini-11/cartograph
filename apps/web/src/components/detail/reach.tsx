import { useMemo } from "react"
import { REACH_OPEN_LEVELS, countOf, walk } from "@workspace/graph"
import type { Direction } from "@workspace/graph"
import {
  SidebarGroup,
  SidebarGroupContent,
} from "@workspace/ui/components/shadcn-ui/sidebar"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/shadcn-ui/toggle-group"

import { FileList } from "@/components/detail/file-list"
import { useMapData } from "@/components/map/map-data"

/** Each direction's name, what it answers, and what it says when empty. */
const WALKS: Record<
  Direction,
  { name: string; question: string; empty: string }
> = {
  dependents: {
    name: "Blast radius",
    question: "What may break if it changes",
    empty: "Nothing depends on it.",
  },
  dependencies: {
    name: "Dependency chain",
    question: "What it needs",
    empty: "It imports no file in this repository.",
  },
}

/**
 * A file's blast radius or dependency chain (spec 004, FR-014 to FR-016):
 * the choice of direction, kept by the pane across selections, then every
 * level of the walk, nearest first. The nearest `REACH_OPEN_LEVELS` show
 * their files; deeper ones show their counts until opened (C-04). Computed
 * in the browser from the edges the page holds, so it appears at once, with
 * no request (FR-019).
 */
export function Reach({
  path,
  direction,
  onDirection,
}: {
  path: string
  direction: Direction | null
  onDirection: (direction: Direction | null) => void
}) {
  const { index } = useMapData()
  const levels = useMemo(
    () => (direction === null ? [] : walk(index, path, direction)),
    [index, path, direction]
  )
  const total = levels.reduce((sum, level) => sum + level.length, 0)

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <ToggleGroup
            aria-label="Follow the edges"
            variant="outline"
            size="sm"
            spacing={0}
            className="w-full"
            value={direction === null ? [] : [direction]}
            onValueChange={(value: Array<string>) =>
              onDirection((value[0] as Direction | undefined) ?? null)
            }
          >
            {(Object.keys(WALKS) as Array<Direction>).map((key) => (
              <ToggleGroupItem key={key} value={key} className="flex-1">
                {WALKS[key].name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </SidebarGroupContent>
      </SidebarGroup>
      {direction !== null && (
        <section aria-labelledby="reach-heading">
          <div className="flex flex-col gap-0.5 px-4 pt-2">
            <h3 id="reach-heading" className="flex text-sm font-medium">
              {WALKS[direction].name}{" "}
              <span className="ms-auto tabular-nums">
                {countOf(total, "file", "files")}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {WALKS[direction].question}
            </p>
          </div>
          {levels.length === 0 ? (
            <p className="px-4 py-2 text-sm text-muted-foreground">
              {WALKS[direction].empty}
            </p>
          ) : (
            levels.map((files, i) => (
              <FileList
                // A new walk starts with its nearest levels open again.
                key={`${path}:${direction}:${i}`}
                heading={countOf(i + 1, "step away", "steps away")}
                rows={files.map((file) => ({ path: file }))}
                empty=""
                headingLevel="h4"
                defaultOpen={i < REACH_OPEN_LEVELS}
              />
            ))
          )}
        </section>
      )}
    </>
  )
}
