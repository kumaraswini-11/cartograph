import { useMemo } from "react"
import {
  SUMMARY_LIST_LENGTH,
  mostDependedOn,
  startingPoints,
} from "@workspace/graph"
import { Badge } from "@workspace/ui/components/shadcn-ui/badge"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@workspace/ui/components/shadcn-ui/sidebar"

import { FactList } from "@/components/detail/fact-list"
import type { Fact } from "@/components/detail/fact-list"
import { FileList } from "@/components/detail/file-list"
import type { FileRow } from "@/components/detail/file-list"
import { useMapData } from "@/components/map/map-data"

/** The summary's first heading, where the focus goes when a selection is cleared. */
export const SUMMARY_HEADING = "summary-heading"

/**
 * The repository's summary (spec 004, FR-001 to FR-005): the detail pane's
 * resting state, not a placeholder (C-01), rendered on the server so the
 * first paint already says what the repository is.
 */
export function Summary() {
  const { input } = useMapData()
  const unidentified =
    input.taxonomy.find((t) => t.tier === "unidentified")?.files ?? 0
  const depended = useMemo(
    () =>
      mostDependedOn(input.files).map((f): FileRow => ({
        path: f.path,
        count: f.fanIn,
      })),
    [input.files]
  )
  const starts = useMemo(
    () =>
      startingPoints(input.files).map((f): FileRow => ({
        path: f.path,
        mark: f.entryPoint ? "entry point" : undefined,
      })),
    [input.files]
  )
  const counts: Array<Fact> = [
    { term: "Files", value: input.files.length },
    { term: "Imports", value: input.imports.seen },
    { term: "Resolved", value: input.imports.resolved },
    // With no adapter, no route could be found: none, not 0 (edge cases).
    {
      term: "Routes",
      value: input.frameworks.length === 0 ? "None found" : input.routes,
    },
    { term: "Unidentified files", value: unidentified },
  ]

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel id={SUMMARY_HEADING} render={<h3 />} tabIndex={-1}>
          Repository
        </SidebarGroupLabel>
        <SidebarGroupContent className="flex flex-col gap-3 px-2">
          <p className="font-mono text-path break-all">{input.repository}</p>
          <div className="flex flex-wrap gap-1">
            {input.frameworks.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                No framework detected
              </span>
            ) : (
              input.frameworks.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))
            )}
          </div>
          <FactList facts={counts} />
        </SidebarGroupContent>
      </SidebarGroup>
      <FileList
        heading="Most depended on"
        rows={depended}
        limit={SUMMARY_LIST_LENGTH}
        empty="No file is imported by another."
      />
      <FileList
        heading="Where to start reading"
        rows={starts}
        limit={SUMMARY_LIST_LENGTH}
        empty="Every file is imported by another."
      />
    </>
  )
}
