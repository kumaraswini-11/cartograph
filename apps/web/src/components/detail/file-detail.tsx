import type { Tier } from "@workspace/frameworks/taxonomy"
import type { Direction, MapFile } from "@workspace/graph"
import {
  SidebarGroup,
  SidebarGroupContent,
} from "@workspace/ui/components/shadcn-ui/sidebar"

import { FactList } from "@/components/detail/fact-list"
import type { Fact } from "@/components/detail/fact-list"
import { FileList } from "@/components/detail/file-list"
import { Reach } from "@/components/detail/reach"
import { useMapData } from "@/components/map/map-data"
import { TierSwatch } from "@/components/map/tier"

/**
 * A file's facts, as the pane and a chat lookup show them (spec 004,
 * FR-007; spec 010): its role, whether it's an entry point, its lines, and
 * its counts in the glossary's words.
 */
export function fileFacts(
  file: MapFile,
  tierOf: (role: string) => Tier
): Array<Fact> {
  return [
    {
      term: "Role",
      value: file.role,
      media: <TierSwatch tier={tierOf(file.role)} />,
    },
    { term: "Entry point", value: file.entryPoint ? "Yes" : "No" },
    { term: "Lines", value: file.lines },
    { term: "Dependencies", value: file.fanOut },
    { term: "Dependents", value: file.fanIn },
  ]
}

/** A file's two neighbour lists: their headings, and what each says empty. */
export const NEIGHBOUR_LISTS = {
  dependencies: {
    heading: "Dependencies",
    empty: "It imports no file in this repository.",
  },
  dependents: { heading: "Dependents", empty: "No file imports it." },
} as const

/**
 * A selected file's structure (spec 004, FR-007): its role, lines and
 * counts, then the full list of its dependencies and of its dependents. Each
 * count is its list's length (C-02): both come from the same edges (AC-03).
 */
export function FileDetail({
  path,
  reach,
  onReach,
}: {
  path: string
  /** Blast radius or dependency chain, as the pane keeps it (FR-014, FR-015). */
  reach: Direction | null
  onReach: (direction: Direction | null) => void
}) {
  const { input, index, tierOf } = useMapData()
  const file = input.files.find((f) => f.path === path)
  if (!file) return null
  const dependencies = (index.dependencies.get(path) ?? []).map((p) => ({
    path: p,
  }))
  const dependents = (index.dependents.get(path) ?? []).map((p) => ({
    path: p,
  }))

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent className="px-2">
          <FactList facts={fileFacts(file, tierOf)} />
        </SidebarGroupContent>
      </SidebarGroup>
      <FileList {...NEIGHBOUR_LISTS.dependencies} rows={dependencies} />
      <FileList {...NEIGHBOUR_LISTS.dependents} rows={dependents} />
      <Reach path={path} direction={reach} onDirection={onReach} />
    </>
  )
}
