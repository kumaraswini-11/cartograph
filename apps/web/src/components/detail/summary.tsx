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

import { FileList } from "@/components/detail/file-list"
import type { FileRow } from "@/components/detail/file-list"
import { useMapData } from "@/components/map/map-data"

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
  const counts: Array<[string, React.ReactNode]> = [
    ["Files", input.files.length],
    ["Imports", input.imports.seen],
    ["Resolved", input.imports.resolved],
    // With no adapter, no route could be found: none, not 0 (edge cases).
    ["Routes", input.frameworks.length === 0 ? "None found" : input.routes],
    ["Unidentified files", unidentified],
  ]

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel render={<h3 />}>Repository</SidebarGroupLabel>
        <SidebarGroupContent className="flex flex-col gap-3 px-2">
          <p className="font-mono text-[13px] break-all">{input.repository}</p>
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
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            {counts.map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="text-end tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
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
