import {
  SidebarGroup,
  SidebarGroupContent,
} from "@workspace/ui/components/shadcn-ui/sidebar"

import { FactList } from "@/components/detail/fact-list"
import { FileList } from "@/components/detail/file-list"
import { useMapData } from "@/components/map/map-data"
import { TierSwatch } from "@/components/map/tier"

/**
 * A selected file's structure (spec 004, FR-007): its role, lines and
 * counts, then the full list of its dependencies and of its dependents. Each
 * count is its list's length (C-02): both come from the same edges (AC-03).
 */
export function FileDetail({ path }: { path: string }) {
  const { input, index } = useMapData()
  const file = input.files.find((f) => f.path === path)
  if (!file) return null
  const tier =
    input.taxonomy.find((t) => t.role === file.role)?.tier ?? "unidentified"
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
          <FactList
            facts={[
              {
                term: "Role",
                value: file.role,
                media: <TierSwatch tier={tier} />,
              },
              { term: "Entry point", value: file.entryPoint ? "Yes" : "No" },
              { term: "Lines", value: file.lines },
              { term: "Dependencies", value: file.fanOut },
              { term: "Dependents", value: file.fanIn },
            ]}
          />
        </SidebarGroupContent>
      </SidebarGroup>
      <FileList
        heading="Dependencies"
        rows={dependencies}
        empty="It imports no file in this repository."
      />
      <FileList
        heading="Dependents"
        rows={dependents}
        empty="No file imports it."
      />
    </>
  )
}
